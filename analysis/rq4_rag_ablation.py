"""RQ4: does retrieval grounding (RAG) improve the factual groundedness of drafted replies?

Within-subjects design: for each complaint the SAME responder (prompt, model, temperature 0) drafts a reply twice -
with retrieved official guidance (RAG) and without (NO_RAG). A judge model that does not know the condition scores
each draft against the same official reference (the retrieved guidance).

Usage: python -m analysis.rq4_rag_ablation [--n 100]
Output: data/processed/rq4_ablation.jsonl, data/processed/rq4_human_rating.xlsx (30 blinded pairs to rate by hand)
"""
import argparse
import asyncio
import json
import random

import litellm
import pandas as pd
from pydantic import BaseModel, Field

from agent.workflow import NO_GUIDANCE, format_kb_context, run_draft_only
from analysis.quota import QuotaGuard
from config import APPS, DATA_PROCESSED, MODEL_JUDGE
from rag import retriever

OUT = DATA_PROCESSED / "rq4_ablation.jsonl"
HUMAN_XLSX = DATA_PROCESSED / "rq4_human_rating.xlsx"
SEED = 42
APP_IDS = {name: app_id for app_id, (name, _) in APPS.items()}


class Score(BaseModel):
    groundedness: int = Field(ge=1, le=5)
    helpfulness: int = Field(ge=1, le=5)
    unsupported_claims: int = Field(ge=0, description="Count of specific facts not supported by the reference")
    rationale: str


JUDGE_PROMPT = """You are grading a reply written by a government helpdesk to a citizen's complaint.

Citizen complaint ({app_name}): {text}

OFFICIAL REFERENCE (the only verified facts about this service):
{reference}

REPLY TO GRADE:
{reply}

Score strictly:
- groundedness 1-5: 5 = every specific fact (contact detail, URL, phone number, menu/feature name, procedure, policy,
  cause of the problem) is supported by the official reference or is generic advice; 1 = several specific facts are
  unsupported or fabricated.
- helpfulness 1-5: 5 = addresses the citizen's actual problem with a concrete, correct next step; 1 = generic or
  irrelevant.
- unsupported_claims: number of specific facts in the reply that the official reference does not support.

Return JSON only: {{"groundedness": int, "helpfulness": int, "unsupported_claims": int, "rationale": "<one sentence>"}}"""


async def judge(app_name: str, text: str, reference: str, reply: str) -> dict:
    prompt = JUDGE_PROMPT.format(app_name=app_name, text=text, reference=reference, reply=reply)
    for attempt in range(5):
        try:
            r = await litellm.acompletion(
                model=f"groq/{MODEL_JUDGE}", messages=[{"role": "user", "content": prompt}],
                temperature=0, max_tokens=300, reasoning_effort="none",
                response_format={"type": "json_object"},
            )
            return Score.model_validate_json(r.choices[0].message.content).model_dump()
        except Exception as e:
            if attempt == 4:
                raise
            await asyncio.sleep(5 * 2**attempt)
            print(f"  judge retry {attempt + 1}: {str(e)[:120]}")


def eligible_complaints(n: int) -> pd.DataFrame:
    res = pd.read_json(DATA_PROCESSED / "analyzer_results.jsonl", lines=True).drop_duplicates("review_id")
    sample = pd.read_csv(DATA_PROCESSED / "analysis_sample.csv")
    df = res.merge(sample[["review_id", "app_name", "text"]], on="review_id")
    df = df[df["relevant"] & df["actionable"] & (df["overall_sentiment"] != "positive")]
    # spread across apps as evenly as availability allows
    per_app = max(1, n // df["app_name"].nunique())
    picked = df.groupby("app_name").sample(frac=1, random_state=SEED).groupby("app_name").head(per_app)
    if len(picked) < n:
        rest = df[~df["review_id"].isin(picked["review_id"])].sample(frac=1, random_state=SEED)
        picked = pd.concat([picked, rest.head(n - len(picked))])
    return picked.head(n)


async def main(n: int):
    todo = eligible_complaints(n)
    done = {json.loads(l)["review_id"] for l in OUT.open(encoding="utf-8")} if OUT.exists() else set()
    todo = todo[~todo["review_id"].isin(done)]
    print(f"{len(done)} done, {len(todo)} to go")
    guard = QuotaGuard()
    with OUT.open("a", encoding="utf-8") as f:
        for row in todo.itertuples():
            analysis = {"aspects": row.aspects, "severity": row.severity}
            hits = retriever.search(row.search_query, APP_IDS[row.app_name], exclude_review_id=row.review_id)
            reference = format_kb_context(hits) if hits else "(no official guidance exists for this issue)"
            try:
                drafts = {
                    "rag": await run_draft_only(row.text, row.app_name, analysis, format_kb_context(hits)),
                    "no_rag": await run_draft_only(row.text, row.app_name, analysis, NO_GUIDANCE),
                }
                scores = {c: await judge(row.app_name, row.text, reference, d["reply"]) for c, d in drafts.items()}
            except Exception as e:
                print(f"[error] {row.review_id}: {str(e)[:200]}", flush=True)
                guard.failed(e)
                if guard.stop:
                    break
                continue
            guard.ok()
            rec = {"review_id": row.review_id, "app_name": row.app_name, "text": row.text,
                   "n_hits": len(hits), "reference": reference,
                   **{f"{c}_{k}": v for c in drafts for k, v in drafts[c].items()},
                   **{f"{c}_{k}": v for c in scores for k, v in scores[c].items()}}
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            f.flush()
            print(f"[{row.app_name}] hits={len(hits)} grounded rag={scores['rag']['groundedness']} "
                  f"no_rag={scores['no_rag']['groundedness']}", flush=True)
            await asyncio.sleep(2)
    export_human_sheet()


def export_human_sheet(k: int = 30):
    """Blinded A/B sheet so a human can validate the judge (reply order randomised per row)."""
    df = pd.read_json(OUT, lines=True).sample(n=None, frac=1, random_state=SEED).head(k)
    rng = random.Random(SEED)
    rows, key = [], []
    for r in df.itertuples():
        a_is_rag = rng.random() < 0.5
        rows.append({"review_id": r.review_id, "app_name": r.app_name, "complaint": r.text,
                     "official_reference": r.reference,
                     "reply_A": r.rag_reply if a_is_rag else r.no_rag_reply,
                     "reply_B": r.no_rag_reply if a_is_rag else r.rag_reply,
                     "A_groundedness_1to5": "", "B_groundedness_1to5": ""})
        key.append({"review_id": r.review_id, "A_is": "rag" if a_is_rag else "no_rag"})
    with pd.ExcelWriter(HUMAN_XLSX) as w:
        pd.DataFrame(rows).to_excel(w, sheet_name="rate_me", index=False)
        pd.DataFrame(key).to_excel(w, sheet_name="key_do_not_open", index=False)
    print(f"Human rating sheet -> {HUMAN_XLSX}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=100)
    asyncio.run(main(ap.parse_args().n))
