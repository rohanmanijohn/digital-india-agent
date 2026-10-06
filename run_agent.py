"""Run the ADK workflow over a sample of scraped reviews and save results.

Usage: python run_agent.py --n 10 [--min-words 8]
Results are cached by review_id in data/processed/agent_results.jsonl, so re-runs skip done reviews.
"""
import argparse
import asyncio
import json

import pandas as pd

from agent.workflow import run_pipeline
from config import DATA_PROCESSED, DATA_RAW

RESULTS = DATA_PROCESSED / "agent_results.jsonl"
PAUSE_S = 3  # spread requests out to stay under Groq free-tier tokens-per-minute limits


async def main(n: int, min_words: int):
    df = pd.read_csv(sorted(DATA_RAW.glob("playstore_reviews_*.csv"))[-1])
    df = df[df["text"].str.split().str.len() >= min_words]
    # stratify across apps so the sample isn't one app
    per_app = max(1, n // df["app_name"].nunique())
    sample = df.groupby("app_name").sample(n=per_app, random_state=42).head(n)

    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    done = {json.loads(l)["review_id"] for l in RESULTS.open(encoding="utf-8")} if RESULTS.exists() else set()

    with RESULTS.open("a", encoding="utf-8") as f:
        for row in sample.itertuples():
            if row.review_id in done:
                continue
            try:
                # exclude this review's own official reply from retrieval (no leakage)
                r = await run_pipeline(row.text, row.app_name, exclude_review_id=row.review_id)
            except Exception as e:
                print(f"[error] {row.review_id}: {e}")
                continue
            rec = {"review_id": row.review_id, "service_category": row.service_category,
                   "rating": int(row.rating), **r}
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            f.flush()
            a = r["analysis"]
            print(f"[{row.app_name}] {row.rating}* | {a['overall_sentiment']} | sev {a['severity']} | "
                  f"{r['trace']} | {r['latency_ms']} ms")

    res = pd.read_json(RESULTS, lines=True)
    res["overall_sentiment"] = res["analysis"].map(lambda a: a["overall_sentiment"])
    print(f"\n=== {len(res)} reviews processed ===")
    print(pd.crosstab(res["rating"], res["overall_sentiment"]))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--min-words", type=int, default=0, help="skip very short reviews like 'good'")
    args = ap.parse_args()
    asyncio.run(main(args.n, args.min_words))
