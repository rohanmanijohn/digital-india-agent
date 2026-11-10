# Research Design

**Working title:** From Reviews to Resolutions: An Agentic LLM Framework for Aspect-Based Analysis of and Grounded
Responses to Citizen Feedback on India's Digital Public Services

This file maps directly onto the QM 640 synopsis template headings.

---

## 1. Problem statement

**Business problem.** India's digital public services (UMANG, DigiLocker, mAadhaar, BHIM, Aarogya Setu, ABHA,
mParivahan, IRCTC) receive tens of thousands of public reviews. The agencies cannot read them at scale. In our corpus,
official reply rates range from 0% (ABHA) to 98.7% (UMANG). Where replies exist, they are mostly templates.
Agencies therefore cannot see which service aspects fail, how severe the failures are, or which complaints need
action.

**Technical problem.** Lexicon tools (for example VADER) miss aspect detail, Hindi and code-mixed text. LLMs could fill
that gap, but they hallucinate. A reply with an invented helpline or procedure is worse than no reply. It is unknown
whether (a) an LLM agent classifies this feedback better than established baselines, and (b) grounding its replies in
the agency's own published responses (RAG) measurably reduces unsupported claims.

**Purpose.** To *classify* (sentiment, aspects), *explain drivers* (which aspects drive dissatisfaction, and how this
varies by service category) and *evaluate* (grounded reply generation) using an agentic LLM pipeline built on
open-weight models.

---

## 2. Research questions and hypotheses

| | Research question | H0 | H1 | Test |
|---|---|---|---|---|
| **RQ1** | Does the LLM agent classify review sentiment more accurately than a lexicon baseline (VADER) and a fine-tuned multilingual transformer (XLM-R)? | Error rates of the agent and each baseline are equal (p01 = p10) | They differ (p01 ≠ p10) | McNemar χ² (Holm-corrected, 2 comparisons); bootstrap 95% CI of the macro-F1 difference |
| **RQ2** | Is negative sentiment associated with the service aspect discussed? | Aspect and negativity are independent | They are associated | χ² test of independence, Cramér's V, standardised residuals; logistic-regression odds ratios (robustness check) |
| **RQ3** | Does citizen satisfaction differ across service categories (citizen services, identity/documents, payments, health, transport)? | μ1 = μ2 = … = μ5 | At least one mean differs | One-way ANOVA with Welch correction; Kruskal-Wallis (ordinal DV); Tukey HSD; η² |
| **RQ4** | Does grounding the reply in retrieved official guidance (RAG) improve its factual groundedness compared with the same model without retrieval? | μ_diff = 0 (groundedness, RAG − no-RAG) | μ_diff ≠ 0 | Paired t-test; Wilcoxon signed-rank; Cohen's d_z; McNemar on "≥ 1 unsupported claim"; judge validated against human ratings (quadratic-weighted κ) |

The four RQs are facets of one topic: *can an LLM agent turn citizen feedback into reliable insight (RQ1–RQ3) and
reliable action (RQ4)?*

---

## 3. Variables

| Variable | Type | Source | Used in |
|---|---|---|---|
| `rating` (1–5 stars) | ordinal / treated as interval | Google Play | RQ3 DV; RQ1 proxy |
| `service_category` (5 levels) | nominal | assigned per app | RQ3 IV |
| `overall_sentiment` (neg/neu/pos) | nominal | agent, VADER, XLM-R | RQ1 prediction; RQ3 secondary DV |
| `label_sentiment` | nominal | **human annotation** | RQ1 ground truth |
| `primary_aspect` (10 levels) | nominal | agent | RQ2 IV |
| `primary_negative` | binary | agent | RQ2 DV |
| `groundedness`, `helpfulness` (1–5) | ordinal / treated as interval | blind LLM judge + human sample | RQ4 DV |
| `unsupported_claims` (count) | ratio | blind LLM judge | RQ4 DV |
| `condition` (RAG / no-RAG) | within-subject factor | experiment | RQ4 IV |

See `docs/data_dictionary.md` for the full field list.

---

## 4. Sample size (α = .05, power = .80; computed by `analysis/sample_size.py`)

| RQ | Method | Key parameters | Minimum N |
|---|---|---|---|
| RQ1 | McNemar (paired proportions; Connor, 1987) | ψ = 0.20 (discordant proportion), δ = 0.08 | 243 |
| RQ1 | 95% CI on accuracy | Z = 1.96, p = 0.5, e = 0.05 | 385 |
| RQ2 | χ², 10 aspects × 2 | w = 0.10 (small; Cohen, 1988), df = 9 | **1,565** |
| RQ3 | One-way ANOVA, k = 5 | f = 0.10 (small) | 1,199 |
| RQ4 | Paired t-test | d_z = 0.30 | 90 |

**Final minimum sample size = 1,565 (the maximum).** Samples actually used:

- RQ2 and the secondary RQ3 analysis: 2,000 reviews (250 per app, at least 5 words).
- RQ3 primary analysis: all 32,000 reviews.
- RQ1: a 400-review reference set labelled by an AI annotator (Claude, disclosed) and checked row by row by the researcher.
- RQ4: 100 complaints (with a 10% buffer above 90).

Formulas:

- McNemar: n = [z₁₋α/₂·√ψ + z₁₋β·√(ψ − δ²)]² / δ²
- CI for a proportion: n = z²·p(1 − p) / e²
- χ² and ANOVA use the noncentral χ² and F distributions with λ = n·w² and λ = n·f² respectively.

---

## 5. Evaluation metrics (with formulas)

- **Accuracy** = (TP + TN) / N, generalised to three classes as correct predictions / N
- **Precision_c** = TP_c / (TP_c + FP_c); **Recall_c** = TP_c / (TP_c + FN_c)
- **F1_c** = 2·P_c·R_c / (P_c + R_c); **macro-F1** = (1/3)·Σ_c F1_c. This is the primary RQ1 metric; classes are
  imbalanced, so accuracy alone misleads.
- **Cohen's κ** = (p_o − p_e) / (1 − p_e). Used for agreement between each system and the human labels, and between
  two annotators.
- **McNemar χ²** = (|b − c| − 1)² / (b + c), where b and c are the discordant counts.
- **Cramér's V** = √(χ² / (n·(min(r, c) − 1)))
- **η²** = SS_between / SS_total
- **Cohen's d_z** = mean(diff) / SD(diff)
- **Quadratic-weighted κ** for judge-human agreement on the 1–5 scales.
- **Operational metrics:** check pass rate, human-review rate, latency per review, requests per review.

---

## 6. Analytic approach per RQ

- **RQ1.**
  1. The agent's analyzer node, VADER and XLM-R label the same reviews.
  2. Primary test: the 400-review reference set. Labels were produced by Claude (Anthropic), a model family
     different from all three systems under test, blind to star ratings and to every system's output, following
     `docs/labelling_guidelines.md`. The researcher checks every row and corrects disagreements; the share of
     corrected rows is reported. Because an LLM-written answer key may favour the LLM agent, this is stated as a
     limitation, and the star-rating proxy result is reported alongside as an independent check.
  3. Preliminary proxy: star-derived labels on all 2,000 (clearly marked as a proxy).
  4. Report the confusion matrix, per-class F1, McNemar and a bootstrap CI.
  5. Secondary analysis: performance by language (English vs Hinglish/Hindi).
- **RQ2.**
  1. Unit of analysis = one review with its primary aspect, which keeps observations independent.
  2. Run the χ² test with standardised residuals to show which aspects drive negativity.
  3. Robustness check: a logistic regression of negative ~ all aspects mentioned (multi-hot). Aspects with perfect
     separation are reported descriptively.
- **RQ3.**
  1. DV = star rating across 5 categories.
  2. Use Welch ANOVA because variances are unequal, with Kruskal-Wallis as the check because the DV is ordinal.
  3. Tukey HSD for pairwise differences.
  4. Report η², since with N = 32,000 almost any difference is "significant".
  5. Secondary DV: the agent's sentiment score.
- **RQ4.**
  1. Within-subjects ablation: the same responder (prompt, model, temperature 0) drafts each reply with and without
     retrieved guidance.
  2. A blind judge from a different model family (Qwen, while the drafts come from gpt-oss) scores both drafts against
     the same official reference.
  3. 30 pairs are rated by a human, blinded and order-randomised, to validate the judge.

---

## 7. Data, ethics and feasibility

- **Data availability.** Public Google Play reviews, collected on 27 September 2026 with `google-play-scraper`.
  32,000 reviews (the newest 4,000 per app). No Kaggle data and no synthetic data.
- **Ethics.**
  - Only public text is used.
  - Reviewer usernames and images are never stored.
  - Names in official replies are replaced with "User" before indexing.
  - The released dataset contains review text, rating and date only.
  - LLM calls send no personal data beyond the public review text.
- **Measurability.** Every variable is observed directly (rating, date) or produced by a documented, reproducible
  procedure (fixed seeds, temperature 0, pinned model IDs).
- **Feasibility.** All code runs on a laptop CPU. The LLMs use Groq's free tier. The limit is 1,000 requests per
  model per day, which the timeline absorbs.
- **Reproducibility.** Code, data, prompts and results go on GitHub, and the model IDs are recorded in `config.py`.

## 8. Target users and application
- **Agency grievance and product teams** (NeGD, UIDAI, NPCI, MoRTH/NIC, NHA): an aspect dashboard, severity triage,
  and grounded draft replies with a human in the loop.
- **Policy analysts:** cross-service comparison of citizen satisfaction.

## 9. Limitations (state these up front)
- **Play Store reviewers are self-selected.** They are not representative of all citizens.
- **Time windows differ by app.** The newest 4,000 reviews span 9 days for IRCTC but about 3.7 years for Aarogya
  Setu. RQ3 differences may partly reflect time.
- **Thin knowledge base for some apps.** It is built from official replies, so it is thin for IRCTC, mAadhaar and
  ABHA.
- **The LLM judge can be biased.** This is mitigated with a different model family and human validation.
- **Hosted models can change.** Model IDs and dates are recorded.

## 10. Timeline (fixed schedule)

| Date | Milestone |
|---|---|
| Oct 6 | Synopsis draft |
| Oct 13 | Synopsis final |
| Oct 20 | Interim draft: exploratory data analysis, preliminary RQ1 (proxy), RQ2, RQ3 |
| Oct 27 | Interim final: plus the reference set checked by the researcher, RQ1 test |
| Nov 3 | Final report draft: plus RQ4 with human validation |
| Nov 29 | Presentation (with the live demo) |
| Dec 13 | Final report |
