"""FastAPI layer between the React frontend and the ADK workflow.

Run: uvicorn api.main:app --reload --port 8000     (docs at http://localhost:8000/docs)
"""
import json
import logging
import time
import uuid
from collections import Counter
from functools import lru_cache

import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from agent.workflow import run_pipeline
from config import APPS, DATA_PROCESSED, DATA_RAW, ROOT

log = logging.getLogger("api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Digital India Citizen Feedback Agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    """Tag every request with an ID and log its latency (also returned as response headers)."""
    request_id = request.headers.get("X-Request-ID", uuid.uuid4().hex[:12])
    t0 = time.perf_counter()
    response = await call_next(request)
    ms = (time.perf_counter() - t0) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-ms"] = f"{ms:.0f}"
    log.info("%s %s %s -> %s in %.0f ms", request_id, request.method, request.url.path, response.status_code, ms)
    return response


REPORTS = ROOT / "reports"
# report figures (PNG) for the Research tab; directory may not exist before analysis runs
app.mount("/api/figures", StaticFiles(directory=REPORTS / "figures", check_dir=False), name="figures")

# ---------- data ----------
APP_NAMES = [name for name, _ in APPS.values()]


@lru_cache(maxsize=1)
def _reviews() -> pd.DataFrame:
    return pd.read_csv(sorted(DATA_RAW.glob("playstore_reviews_*.csv"))[-1])


def _results() -> list[dict]:
    path = DATA_PROCESSED / "agent_results.jsonl"
    if not path.exists():
        return []
    return [json.loads(l) for l in path.open(encoding="utf-8")]


# ---------- schemas ----------
class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=3, max_length=2000)
    app_name: str
    review_id: str | None = Field(None, description="If this is a scraped review, its own official reply is excluded from retrieval")


# ---------- routes ----------
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/apps")
def apps():
    return [{"app_id": app_id, "name": name, "category": cat} for app_id, (name, cat) in APPS.items()]


@app.get("/api/reviews/random")
def random_review(app_name: str | None = None, min_words: int = 8):
    df = _reviews()
    df = df[df["text"].str.split().str.len() >= min_words]
    if app_name:
        df = df[df["app_name"] == app_name]
    if df.empty:
        raise HTTPException(404, "No reviews match")
    r = df.sample(1).iloc[0]
    return {"review_id": r.review_id, "app_name": r.app_name, "text": r.text, "rating": int(r.rating),
            "review_date": r.review_date}


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    if req.app_name not in APP_NAMES:
        raise HTTPException(422, f"app_name must be one of {APP_NAMES}")
    try:
        return await run_pipeline(req.text, req.app_name, exclude_review_id=req.review_id)
    except Exception as e:  # upstream LLM failure after retries (usually Groq rate limits)
        log.exception("pipeline failed")
        raise HTTPException(502, f"Agent pipeline failed: {type(e).__name__}: {str(e)[:300]}")


@app.get("/api/results")
def results(app_name: str | None = None, limit: int = 200):
    rows = [r for r in _results() if not app_name or r["app_name"] == app_name]
    return rows[-limit:][::-1]


@app.get("/api/stats")
def stats():
    rows = _results()
    sentiment_by_app: dict[str, Counter] = {}
    aspects: Counter = Counter()
    for r in rows:
        sentiment_by_app.setdefault(r["app_name"], Counter())[r["analysis"]["overall_sentiment"]] += 1
        aspects.update(a["aspect"] for a in r["analysis"]["aspects"] if a["sentiment"] == "negative")
    responded = [r for r in rows if r["response"]]
    return {
        "processed": len(rows),
        "responded": len(responded),
        "check_pass_rate": round(sum(r["check"]["passed"] for r in responded) / len(responded), 3) if responded else None,
        "human_review": sum(r["needs_human_review"] for r in rows),
        "sentiment_by_app": {k: dict(v) for k, v in sentiment_by_app.items()},
        "negative_aspects": dict(aspects.most_common()),
    }


def _jsonl_ids(path) -> set:
    return {json.loads(l)["review_id"] for l in path.open(encoding="utf-8")} if path.exists() else set()


@app.get("/api/research")
def research():
    """Everything the Research tab shows: study progress, result tables, figures and the text summary."""
    tables = {}
    for p in sorted((REPORTS / "tables").glob("*.csv")):
        df = pd.read_csv(p)
        tables[p.stem] = df.astype(object).where(pd.notna(df), None).to_dict(orient="records")
    gold_labelled = 0  # rows the researcher has checked (the AI reference labels cover all 400)
    gold_path = DATA_PROCESSED / "gold_set.xlsx"
    if gold_path.exists():
        sheet = pd.read_excel(gold_path)
        if "check" in sheet:
            gold_labelled = int(sheet["check"].astype(str).str.strip().str.lower().isin(["ok", "fixed"]).sum())
    summary = REPORTS / "results_summary.md"
    return {
        "progress": {
            "analyzed": len(_jsonl_ids(DATA_PROCESSED / "analyzer_results.jsonl")),
            "sample_size": 2000,
            "gold_labelled": gold_labelled,
            "gold_size": 400,
            "rq4_pairs": len(_jsonl_ids(DATA_PROCESSED / "rq4_ablation.jsonl")),
            "rq4_target": 100,
        },
        "tables": tables,
        "figures": sorted(p.name for p in (REPORTS / "figures").glob("*.png")),
        "summary": summary.read_text(encoding="utf-8") if summary.exists() else "",
    }
