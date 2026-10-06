# Data Dictionary

## Folder tree
```
data/
├── raw/playstore_reviews_<date>.csv     # 32,000 public Google Play reviews (8 apps × newest 4,000)
├── kb/                                  # optional hand-saved official FAQs: <app_id>__<name>.md
├── kb_index/                            # RAG index: docs.jsonl + embeddings.npy
└── processed/
    ├── analysis_sample.csv              # 2,000-review stratified study sample (250/app, ≥ 5 words)
    ├── analyzer_results.jsonl           # agent analyzer output for analysis_sample
    ├── baseline_predictions.csv         # VADER + XLM-R predictions for analysis_sample
    ├── gold_set.xlsx                    # 400 reviews for manual labelling (RQ1 ground truth)
    ├── rq4_ablation.jsonl               # RAG vs no-RAG drafts + blind judge scores
    ├── rq4_human_rating.xlsx            # 30 blinded pairs for human validation of the judge
    └── agent_results.jsonl              # full-pipeline demo batch (UI "Batch results" tab)
reports/
├── figures/*.png                        # EDA and results figures
├── tables/*.csv                         # descriptive statistics and test outputs
└── results_summary.md                   # auto-generated numbers for the report
```

## 1. `data/raw/playstore_reviews_<date>.csv` (one row per review)

| Variable | Type | Unit / values | Description |
|---|---|---|---|
| review_id | string (UUID) | — | Google Play review identifier (primary key) |
| app_id | string | package name | e.g. `in.gov.umang.negd.g2c` |
| app_name | categorical (8) | UMANG, DigiLocker, mAadhaar, BHIM, Aarogya Setu, ABHA, mParivahan, IRCTC Rail Connect | App reviewed |
| service_category | categorical (5) | citizen_services, identity_documents, payments, health, transport | Assigned in `config.APPS` |
| text | string | UTF-8, ≤ 500 characters | Review text as written (English, Hindi, Hinglish, other Indian languages) |
| rating | integer, ordinal | 1–5 stars | Star rating |
| thumbs_up | integer | count | "Helpful" votes from other users |
| app_version | string | e.g. "2.4.1" | App version at review time (18% missing: not reported by Google Play) |
| review_date | datetime | ISO 8601 | Time the review was posted |
| has_dev_reply | boolean | True/False | Whether the app's government team replied |
| dev_reply | string | — | Official reply text (empty if none) |
| dev_reply_date | datetime | ISO 8601 | Time of the official reply |

Not collected, by design: reviewer username and profile image.

## 2. `analyzer_results.jsonl` (agent analyzer node; one JSON object per review)

| Variable | Type | Values | Description |
|---|---|---|---|
| review_id | string | — | Foreign key to the raw data |
| relevant | boolean | — | Feedback about the service/app? |
| language | categorical | english, hinglish, hindi, other_indian_language, other | Detected language/script |
| overall_sentiment | categorical | negative, neutral, positive | Review-level sentiment |
| aspects | list of {aspect, sentiment} | aspect ∈ 10 categories (see `config.ASPECTS`) | Aspect-level sentiment |
| severity | integer, ordinal | 1–5 | 1 = minor or praise, 5 = citizen blocked from an essential service |
| actionable | boolean | — | Could a department act on it? |
| search_query | string | English | Normalised problem description used for retrieval |

## 3. `baseline_predictions.csv`

| Variable | Type | Values | Description |
|---|---|---|---|
| vader_compound | float | −1 to +1 | VADER compound score |
| vader_label | categorical | neg/neu/pos | ≥ 0.05 positive, ≤ −0.05 negative (Hutto & Gilbert, 2014) |
| xlmr_label | categorical | neg/neu/pos | `cardiffnlp/twitter-xlm-roberta-base-sentiment` |
| xlmr_score | float | 0–1 | Softmax probability of the predicted class |

## 4. `gold_set.xlsx` (RQ1 reference labels)
`ai_sentiment`, `ai_relevant`, `ai_primary_aspect`, `ai_language`: labels by Claude (Anthropic), disclosed, blind to
ratings and predictions. `check` (ok / fixed) and `corrected_*`: the researcher's review. Final label = correction where
given, otherwise the AI label. Provenance: `gold_ai_labels.csv`. See `docs/labelling_guidelines.md`.

## 5. `rq4_ablation.jsonl` (one row per complaint)

| Variable | Type | Description |
|---|---|---|
| n_hits | integer | Number of official-guidance items retrieved (0–4) |
| reference | string | The official guidance shown to the judge for both conditions |
| rag_reply / no_rag_reply | string | First draft with and without retrieved guidance |
| rag_route_to / no_rag_route_to | string | Team the draft routes to |
| rag_cited_sources | list[int] | Guidance items the RAG draft cites |
| {rag,no_rag}_groundedness | integer 1–5 | Blind judge: support of specific facts by the reference |
| {rag,no_rag}_helpfulness | integer 1–5 | Blind judge: concrete, correct next step |
| {rag,no_rag}_unsupported_claims | integer ≥ 0 | Blind judge: count of unsupported specific facts |
| {rag,no_rag}_rationale | string | Judge's one-sentence reason |

## 6. Knowledge base: `kb_index/docs.jsonl`

| Variable | Description |
|---|---|
| id | Row index into `embeddings.npy` |
| app_id | App the guidance belongs to (retrieval is restricted to the same app) |
| source | `official_play_store_reply` or `faq:<file>` |
| source_review_id | Review the official reply answered (excluded at retrieval time to prevent leakage) |
| text | "Citizen issue: … / Official <app> team response: …", with reviewer names removed |

Embeddings: 384-dimensional, `paraphrase-multilingual-MiniLM-L12-v2`, L2-normalised. Similarity = cosine; threshold
0.35; top 4.
