"""Run the agent's analyzer node over analysis_sample.csv (RQ1-RQ3). Resumable; safe to stop and restart.

Usage: python -m analysis.run_analyzer
Output: data/processed/analyzer_results.jsonl
"""
import asyncio
import json

import pandas as pd

from agent.workflow import run_analysis_only
from analysis.quota import QuotaGuard
from config import DATA_PROCESSED

OUT = DATA_PROCESSED / "analyzer_results.jsonl"
PAUSE_S = 1  # Groq free tier: stay under tokens-per-minute limits (retries back off if we hit them)


async def main():
    sample = pd.read_csv(DATA_PROCESSED / "analysis_sample.csv")
    done = {json.loads(l)["review_id"] for l in OUT.open(encoding="utf-8")} if OUT.exists() else set()
    todo = sample[~sample["review_id"].isin(done)]
    # Groq free tier allows 1,000 requests/day per model, so do the RQ1 gold-set reviews first
    gold_ids = set(pd.read_excel(DATA_PROCESSED / "gold_set.xlsx")["review_id"])
    todo = todo.assign(_gold=todo["review_id"].isin(gold_ids)).sort_values("_gold", ascending=False, kind="stable")
    print(f"{len(done)} done, {len(todo)} to go")
    guard = QuotaGuard()
    with OUT.open("a", encoding="utf-8") as f:
        for i, row in enumerate(todo.itertuples(), 1):
            try:
                a = await run_analysis_only(row.text, row.app_name)
            except Exception as e:
                print(f"[error] {row.review_id}: {str(e)[:200]}", flush=True)
                guard.failed(e)
                if guard.stop:
                    break
                continue
            guard.ok()
            f.write(json.dumps({"review_id": row.review_id, **a}, ensure_ascii=False) + "\n")
            f.flush()
            if i % 25 == 0:
                print(f"{len(done) + i}/{len(sample)}", flush=True)
            await asyncio.sleep(PAUSE_S)


if __name__ == "__main__":
    asyncio.run(main())
