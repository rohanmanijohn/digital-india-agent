"""Collect public Google Play reviews for Digital India apps.

Usage: python -m scraper.playstore_scraper --per-app 200
Usernames and profile images are dropped at collection time (data minimisation).
"""
import argparse
import time
from datetime import date

import pandas as pd
from google_play_scraper import Sort, reviews

from config import APPS, DATA_RAW


def scrape_app(app_id: str, n: int) -> list[dict]:
    rows, token = [], None
    while len(rows) < n:
        batch, token = reviews(
            app_id, lang="en", country="in", sort=Sort.NEWEST,
            count=min(200, n - len(rows)), continuation_token=token,
        )
        if not batch:
            break
        rows.extend(batch)
        if token is None:
            break
        time.sleep(1)  # be polite to the endpoint
    return rows


def main(per_app: int):
    DATA_RAW.mkdir(parents=True, exist_ok=True)
    frames = []
    for app_id, (name, category) in APPS.items():
        try:
            raw = scrape_app(app_id, per_app)
        except Exception as e:  # app removed / id wrong -> log and continue
            print(f"[skip] {name} ({app_id}): {e}")
            continue
        df = pd.DataFrame(raw)
        if df.empty:
            print(f"[empty] {name}")
            continue
        df = pd.DataFrame({
            "review_id": df["reviewId"],
            "app_id": app_id,
            "app_name": name,
            "service_category": category,
            "text": df["content"],
            "rating": df["score"],
            "thumbs_up": df["thumbsUpCount"],
            "app_version": df["appVersion"],
            "review_date": df["at"],
            "has_dev_reply": df["replyContent"].notna(),
            "dev_reply": df["replyContent"],  # official response from the app's government team
            "dev_reply_date": df["repliedAt"],
        })
        print(f"[ok] {name}: {len(df)} reviews")
        frames.append(df)

    out = pd.concat(frames, ignore_index=True).drop_duplicates("review_id")
    out = out[out["text"].str.strip().str.len() > 0]
    path = DATA_RAW / f"playstore_reviews_{date.today()}.csv"
    out.to_csv(path, index=False)
    print(f"\nSaved {len(out)} reviews -> {path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-app", type=int, default=200)
    main(ap.parse_args().per_app)
