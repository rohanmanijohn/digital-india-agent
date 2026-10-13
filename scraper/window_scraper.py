"""Collect reviews from the SAME calendar window for every app (comparable collection periods).

The first collection took the newest 4,000 reviews per app, which covered 9 days for IRCTC but almost 4 years for
Aarogya Setu. This collector pages back through each app's reviews until it passes the window start, keeps only
reviews inside [since, until], and queries both the English and Hindi listings to widen language coverage.
High-volume apps are then randomly sampled down to --cap reviews (seed 42); the full per-app population counts
are saved so the sampling fraction can be reported.

Usage: python -m scraper.window_scraper --since 2025-10-01 --until 2026-09-30 --cap 5000
Output: data/raw/playstore_reviews_<today>_window.csv and data/raw/window_population.csv
"""
import argparse
import time
from datetime import date, datetime

import pandas as pd
from google_play_scraper import Sort, reviews

from config import APPS, DATA_RAW

SEED = 42


def scrape_window(app_id: str, since: datetime, until: datetime, lang: str, max_pages: int) -> list[dict]:
    rows, token = [], None
    for _ in range(max_pages):
        batch, token = reviews(app_id, lang=lang, country="in", sort=Sort.NEWEST, count=200, continuation_token=token)
        if not batch:
            break
        rows.extend(r for r in batch if since <= r["at"] <= until)
        if batch[-1]["at"] < since or token is None:
            break
        time.sleep(0.6)
    return rows


def main(since: str, until: str, cap: int, max_pages: int):
    since_dt = datetime.fromisoformat(since)
    until_dt = datetime.fromisoformat(until).replace(hour=23, minute=59, second=59)
    frames, population = [], []
    for app_id, (name, category) in APPS.items():
        raw = []
        for lang in ("en", "hi"):
            try:
                got = scrape_window(app_id, since_dt, until_dt, lang, max_pages)
            except Exception as e:
                print(f"[skip] {name} ({lang}): {e}", flush=True)
                continue
            print(f"[{name}] {lang}: {len(got)} reviews in window", flush=True)
            raw.extend(got)
        if not raw:
            continue
        df = pd.DataFrame(raw).drop_duplicates("reviewId")
        df = pd.DataFrame({
            "review_id": df["reviewId"], "app_id": app_id, "app_name": name, "service_category": category,
            "text": df["content"], "rating": df["score"], "thumbs_up": df["thumbsUpCount"],
            "app_version": df["appVersion"], "review_date": df["at"],
            "has_dev_reply": df["replyContent"].notna(), "dev_reply": df["replyContent"],
            "dev_reply_date": df["repliedAt"],
        })
        df = df[df["text"].fillna("").str.strip().str.len() > 0]
        population.append({"app_name": name, "reviews_in_window": len(df),
                           "oldest": df["review_date"].min(), "newest": df["review_date"].max()})
        if len(df) > cap:
            df = df.sample(n=cap, random_state=SEED)
        frames.append(df)
        print(f"[{name}] kept {len(df)} of {population[-1]['reviews_in_window']}", flush=True)

    out = pd.concat(frames, ignore_index=True)
    path = DATA_RAW / f"playstore_reviews_{date.today()}_window.csv"
    out.to_csv(path, index=False)
    pop = pd.DataFrame(population).assign(window=f"{since} to {until}", cap=cap)
    pop.to_csv(DATA_RAW / "window_population.csv", index=False)
    print(pop.to_string(index=False))
    print(f"\nSaved {len(out)} reviews -> {path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", default="2025-10-01")
    ap.add_argument("--until", default="2026-09-30")
    ap.add_argument("--cap", type=int, default=5000)
    ap.add_argument("--max-pages", type=int, default=1200, help="safety stop per app and language (200 reviews/page)")
    a = ap.parse_args()
    main(a.since, a.until, a.cap, a.max_pages)
