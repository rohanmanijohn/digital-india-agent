"""RAG safety properties: no cross-app guidance, no leakage of the review's own official reply."""
import json

import pytest

from config import KB_INDEX_DIR
from rag.build_kb import _anonymise, _chunk

pytestmark = pytest.mark.skipif(not (KB_INDEX_DIR / "docs.jsonl").exists(), reason="build the index first")


def test_anonymise_removes_reviewer_names():
    assert _anonymise("Dear Karthi, thanks for the rating.") == "Dear User, thanks for the rating."
    assert _anonymise("Hi Harijendra Yadav, please update.") == "Hi User, please update."
    assert _anonymise("We regret the inconvenience.") == "We regret the inconvenience."


def test_chunk_keeps_all_text():
    text = "\n\n".join(f"para {i} " + "word " * 50 for i in range(5))
    assert " ".join(_chunk(text, words=120)).split() == text.split()


def test_retrieval_stays_within_app():
    from rag.retriever import search
    for hit in search("payment failed money debited", "in.org.npci.upiapp", k=4):
        assert hit["app_id"] in ("in.org.npci.upiapp", "general")


def test_retrieval_excludes_own_reply():
    from rag.retriever import search
    doc = next(json.loads(l) for l in (KB_INDEX_DIR / "docs.jsonl").open(encoding="utf-8")
               if json.loads(l)["source_review_id"])
    issue = doc["text"].split("\n")[0].removeprefix("Citizen issue: ")
    ids = {h["source_review_id"] for h in search(issue, doc["app_id"], k=10, exclude_review_id=doc["source_review_id"])}
    assert doc["source_review_id"] not in ids
