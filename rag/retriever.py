"""Dense retrieval over the official-guidance knowledge base (cosine similarity, numpy)."""
import json
from functools import lru_cache

import numpy as np
from fastembed import TextEmbedding

from config import EMBED_MODEL, KB_INDEX_DIR, RAG_MIN_SCORE, RAG_TOP_K


@lru_cache(maxsize=1)
def _load():
    docs = [json.loads(l) for l in (KB_INDEX_DIR / "docs.jsonl").open(encoding="utf-8")]
    emb = np.load(KB_INDEX_DIR / "embeddings.npy")
    return docs, emb, TextEmbedding(EMBED_MODEL)


def search(query: str, app_id: str, k: int = RAG_TOP_K, exclude_review_id: str | None = None) -> list[dict]:
    """Top-k docs for this app (plus 'general' docs).

    Never returns another app's guidance: a DigiLocker helpline is wrong advice for IRCTC.
    `exclude_review_id` drops the official reply to the review being answered, so evaluation
    can't just copy the real answer (data leakage).
    """
    docs, emb, model = _load()
    q = np.array(next(iter(model.embed([query]))), dtype=np.float32)
    q /= np.linalg.norm(q)
    scores = emb @ q
    hits = []
    for i in np.argsort(-scores):
        d = docs[i]
        if d["app_id"] not in (app_id, "general") or d["source_review_id"] == exclude_review_id:
            continue
        if scores[i] < RAG_MIN_SCORE or len(hits) == k:
            break
        hits.append({**d, "score": round(float(scores[i]), 3)})
    return hits
