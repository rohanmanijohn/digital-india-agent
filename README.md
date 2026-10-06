# Citizen Feedback Agent — Digital India services

Agentic LLM pipeline for aspect-based analysis of, and grounded replies to, citizen feedback on India's
digital public services (QM 640 Data Analytics Capstone).

**Author:** Rohan Mani John · Walsh College · QM 640 Data Analytics Capstone (2026)

```
React (Vite) ──/api──▶ FastAPI ──▶ Google ADK 2.x Workflow ──▶ Groq (open-weight LLMs)
                                        │
                                        └──▶ RAG: official government replies (fastembed + numpy)
```

## Workflow graph (`agent/workflow.py`)

```
START → analyzer → after_analysis ─SKIP──────────────────────────────────────────▶ finalize
                                  └RESPOND→ retrieve → responder → store_draft → checker → after_check
                                                         ▲                                    │   │
                                                         └───────────── REDRAFT (max 1) ──────┘   └DONE→ finalize
```

| Node | Type | Model / logic |
|---|---|---|
| analyzer | ADK Agent | `openai/gpt-oss-20b` — relevance, language, aspect-level sentiment, severity, search query |
| after_analysis | function | routes to RESPOND only for relevant, actionable, non-positive feedback |
| retrieve | function | top-4 official guidance for **this app only**; the review's own official reply is excluded (no leakage) |
| responder | ADK Agent | `openai/gpt-oss-120b` — reply + routing; contact details allowed only from retrieved guidance |
| checker | ADK Agent | `qwen/qwen3.8-27b` (different model family → less self-preference bias) — fails ungrounded/overpromising drafts |
| after_check | function | one redraft with the checker's reason; if still failing → `needs_human_review` |

## Data

| File | What |
|---|---|
| `data/raw/playstore_reviews_<date>.csv` | Public Google Play reviews, 8 apps × up to 1,000 newest. Usernames dropped at collection. |
| `data/kb/` | Optional hand-saved official FAQs: `<app_id>__<name>.md` (or `general__…`) |
| `data/kb_index/` | RAG index built from official developer replies (+ `data/kb/`) |
| `data/processed/agent_results.jsonl` | Batch agent outputs |

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env            # then put your GROQ_API_KEY in .env
```

## Run

```bash
python -m scraper.playstore_scraper --per-app 1000   # 1. collect reviews
python -m rag.build_kb                               # 2. build the RAG index
python run_agent.py --n 40 --min-words 8             # 3. batch-run the agent (resumable)

uvicorn api.main:app --reload --port 8000            # 4. API  (docs: http://localhost:8000/docs)
cd frontend && npm install && npm run dev            # 5. UI   (http://localhost:5173)
```

## Research analysis (RQ1–RQ4)

Variables: [docs/data_dictionary.md](docs/data_dictionary.md) · Labelling rules:
[docs/labelling_guidelines.md](docs/labelling_guidelines.md)

```bash
python -m analysis.sample_size        # minimum N per RQ (final = 1,565)
python -m analysis.eda                # descriptive tables + figures -> reports/
python -m analysis.sampling           # 2,000-review study sample + 400-review gold set (seed 42)
python -m analysis.run_analyzer       # agent analyzer over the sample (resumable; ~1,000 req/day on Groq free tier)
python -m analysis.baselines          # VADER + XLM-R on the same sample
python -m analysis.gold_ai_labels    # writes the disclosed AI reference labels into gold_set.xlsx
# -> check every row of data/processed/gold_set.xlsx (ok / fixed), see docs/labelling_guidelines.md
python -m analysis.rq4_rag_ablation   # RAG vs no-RAG drafts + blind judge; writes the human-rating sheet
# -> rate data/processed/rq4_human_rating.xlsx by hand (30 blinded pairs)
python -m analysis.stats_tests        # all hypothesis tests -> reports/tables, reports/figures, reports/results_summary.md
```

| RQ (synopsis numbering) | Question | Test | Result files (older prefix) |
|---|---|---|---|
| RQ1 | Is negative sentiment associated with the service aspect? | χ², Cramér's V, residuals, logit odds ratios | `rq2_*` |
| RQ2 | Does satisfaction differ across service categories? | Welch ANOVA, Kruskal-Wallis, Tukey HSD, η² | `rq3_*` |
| RQ3 | Does RAG grounding improve reply groundedness? | paired t, Wilcoxon, d_z, McNemar, judge–human κ | `rq4_*` |
| RQ4 | Is the agent more accurate than VADER / XLM-R? | McNemar (Holm), bootstrap CI of macro-F1 | `rq1_*` |

The research questions were renumbered for the synopsis; script and file names keep the earlier prefixes shown above.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | liveness |
| GET | `/api/apps` | apps and service categories |
| GET | `/api/reviews/random?app_name=&min_words=8` | a real scraped review |
| POST | `/api/analyze` | `{text, app_name, review_id?}` → analysis, reply, check, sources, trace, latency |
| GET | `/api/results` | batch results |
| GET | `/api/stats` | aggregate counts for the dashboard |
| GET | `/api/research` | study progress, RQ1–RQ4 result tables, figure list, test summary |
| GET | `/api/figures/<name>.png` | report figures (static) |

Middleware: CORS for the Vite dev server; per-request ID + latency logging (`X-Request-ID`, `X-Process-Time-ms`).

## Web app tabs

`#analyze` run one review through the agent · `#results` batch results · `#research` live RQ1–RQ4 results
(e.g. http://localhost:5173/#research).

## Tests

```bash
python -m pytest -q tests      # 16 tests: sample sizes, RAG isolation/leakage, anonymisation, quota detection, API contract
```

## Groq free-tier limits (observed 2026-09-26)

`gpt-oss-120b`: 8,000 tokens/min · `qwen3.8-27b`: 1,000 output tokens/min. The workflow retries with
exponential backoff (5 attempts); batch jobs stop cleanly when the **daily** limit (1,000 requests/model) is hit
and resume from where they stopped on the next run. Budget ~1 review per 5–20 s.

## Known limitations

- The knowledge base is thin for IRCTC, mAadhaar, ABHA and DigiLocker (few distinct official replies).
  Their FAQ pages are JavaScript-rendered, so add FAQ text by hand to `data/kb/`.
- Reviews are self-selected Play Store users, not a representative sample of citizens.
- Model IDs on Groq change; check `https://api.groq.com/openai/v1/models` and update `config.py`.
