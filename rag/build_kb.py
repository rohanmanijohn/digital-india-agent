"""Build the RAG knowledge base of official government guidance.

Sources (all public, all official):
  1. Replies written by each app's government team to Play Store reviews (from the scraped CSV)
  2. FAQ pages in config.KB_URLS that can be fetched as plain HTML
  3. Any FAQ text you save by hand into data/kb/<app_id>__<name>.md (use app_id "general" for all apps)

Usage: python -m rag.build_kb
Output: data/kb_index/docs.jsonl + embeddings.npy
"""
import json
import re
import urllib.request

import numpy as np
import pandas as pd
from fastembed import TextEmbedding

from config import APPS, DATA_RAW, EMBED_MODEL, KB_INDEX_DIR, KB_MANUAL_DIR, KB_URLS

# "Dear Karthi," -> "Dear User," (drop reviewer names that government teams echo back)
_SALUTATION = re.compile(r"^\s*(Dear|Hi|Hello|Hey)\s+[^,\n]{1,40},", re.IGNORECASE)


def _anonymise(reply: str) -> str:
    return _SALUTATION.sub(r"\1 User,", reply.strip())


def _chunk(text: str, words: int = 120) -> list[str]:
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks, cur = [], []
    for p in paras:
        cur.append(p)
        if sum(len(c.split()) for c in cur) >= words:
            chunks.append("\n".join(cur))
            cur = []
    if cur:
        chunks.append("\n".join(cur))
    return chunks


def docs_from_dev_replies() -> list[dict]:
    df = pd.read_csv(sorted(DATA_RAW.glob("playstore_reviews_*.csv"))[-1])
    df = df[df["dev_reply"].notna()].copy()
    df["dev_reply"] = df["dev_reply"].map(_anonymise)
    # one doc per distinct official reply per app; keep the complaint it answered for retrieval context
    df = df.drop_duplicates(["app_id", "dev_reply"])
    return [
        {
            "app_id": r.app_id,
            "source": "official_play_store_reply",
            "source_review_id": r.review_id,
            "text": f"Citizen issue: {str(r.text)[:300]}\nOfficial {r.app_name} team response: {r.dev_reply}",
        }
        for r in df.itertuples()
    ]


def fetch_faq_pages() -> None:
    KB_MANUAL_DIR.mkdir(parents=True, exist_ok=True)
    for app_id, url in KB_URLS.items():
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
        html = re.sub(r"(?s)<(script|style).*?</\1>", "", html)
        text = re.sub(r"<(br|/p|/li|/h\d|/div|/tr)[^>]*>", "\n\n", html, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"[ \t]+", " ", re.sub(r"&nbsp;|&amp;", " ", text))
        text = "\n".join(line.strip() for line in text.splitlines())
        out = KB_MANUAL_DIR / f"{app_id}__faq_fetched.txt"
        out.write_text(f"Source: {url}\n\n{text}", encoding="utf-8")
        print(f"[faq] {app_id}: {len(text.split())} words -> {out.name}")


def docs_from_manual_files() -> list[dict]:
    docs = []
    for path in sorted(KB_MANUAL_DIR.glob("*.*")):
        if path.suffix not in {".md", ".txt"}:
            continue
        app_id = path.name.split("__")[0]
        if app_id != "general" and app_id not in APPS:
            print(f"[warn] {path.name}: unknown app id prefix, skipped")
            continue
        for chunk in _chunk(path.read_text(encoding="utf-8")):
            docs.append({"app_id": app_id, "source": f"faq:{path.name}", "source_review_id": None, "text": chunk})
    return docs


def main():
    try:
        fetch_faq_pages()
    except Exception as e:
        print(f"[faq] fetch failed, continuing with existing files: {e}")

    docs = docs_from_dev_replies() + docs_from_manual_files()
    print(f"Embedding {len(docs)} docs with {EMBED_MODEL} ...")
    model = TextEmbedding(EMBED_MODEL)
    emb = np.array(list(model.embed([d["text"] for d in docs])), dtype=np.float32)
    emb /= np.linalg.norm(emb, axis=1, keepdims=True)

    KB_INDEX_DIR.mkdir(parents=True, exist_ok=True)
    np.save(KB_INDEX_DIR / "embeddings.npy", emb)
    with (KB_INDEX_DIR / "docs.jsonl").open("w", encoding="utf-8") as f:
        for i, d in enumerate(docs):
            f.write(json.dumps({"id": i, **d}, ensure_ascii=False) + "\n")
    print(pd.Series([d["app_id"] for d in docs]).map(lambda a: APPS.get(a, (a,))[0]).value_counts().to_string())
    print(f"Saved index -> {KB_INDEX_DIR}")


if __name__ == "__main__":
    main()
