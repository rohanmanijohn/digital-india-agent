// Builds the QM 640 synopsis (APA 7 student format) following the course template's headings and the grading rubric.
// RQ order: RQ1 aspects, RQ2 service categories, RQ3 RAG grounding, RQ4 agent vs baselines.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, Header, AlignmentType,
  PageNumber, WidthType, BorderStyle, ShadingType, LineRuleType, PageBreak, HeadingLevel, TableOfContents,
} = require("docx");

const HERE = __dirname;
const PROJ = "C:/Users/Rohan Mani John/OneDrive/Desktop/Masters AI ML/Capstone/digital-india-agent";
const OUT = "C:/Users/Rohan Mani John/OneDrive/Desktop/Masters AI ML/Capstone/Synopsis_Rohan_Mani_John.docx";
const MENTOR = "Pralhad Teggi";
const REPO = "https://github.com/rohanmanijohn/digital-india-agent";

const FONT = "Times New Roman";
const SIZE = 24; // 12 pt
const DOUBLE = { line: 480, lineRule: LineRuleType.AUTO, before: 0, after: 0 };
const SINGLE = { line: 240, lineRule: LineRuleType.AUTO, before: 0, after: 0 };

// inline markup: **bold**, *italic*
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size: SIZE, ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, font: FONT, size: SIZE, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, font: FONT, size: SIZE, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, size: SIZE, ...base }));
  return out;
}

const P = (text) => new Paragraph({ children: runs(text), spacing: DOUBLE, indent: { firstLine: 720 } });
const Center = (text, opts = {}) => new Paragraph({ children: runs(text, opts), alignment: AlignmentType.CENTER, spacing: DOUBLE });
// Built-in heading styles (restyled to APA below) so Word can build the table of contents
const H1 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_1 });
const H2 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
const H3 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_3 });
const Blank = () => new Paragraph({ children: [], spacing: DOUBLE });
const PB = () => new Paragraph({ children: [new PageBreak()] });
const Eq = (text) => new Paragraph({ children: runs(text), alignment: AlignmentType.CENTER, spacing: DOUBLE });
const Bullet = (text) => new Paragraph({ children: runs(text), spacing: DOUBLE, numbering: { reference: "bullets", level: 0 } });
const Ref = (text) => new Paragraph({ children: runs(text), spacing: DOUBLE, indent: { left: 720, hanging: 720 } });
const Mono = (text, last = false) => new Paragraph({ children: [new TextRun({ text, font: "Courier New", size: 18 })], spacing: SINGLE, keepNext: !last });
const Label = (num, title) => [
  new Paragraph({ children: runs(`**${num}**`), spacing: DOUBLE, keepNext: true }),
  new Paragraph({ children: runs(`*${title}*`), spacing: DOUBLE, keepNext: true }),
];
const Note = (text) => new Paragraph({ children: runs(`*Note.* ${text}`, { size: 22 }), spacing: DOUBLE });

const TABLE_W = 9360;
const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
function table(header, rows, widths) {
  const cell = (text, isHead, i, lastRow) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    borders: { top: isHead ? border : none, bottom: isHead || lastRow ? border : none, left: none, right: none },
    shading: isHead ? { fill: "F2F2F2", type: ShadingType.CLEAR, color: "auto" } : undefined,
    children: [new Paragraph({ children: runs(String(text), { size: 20, bold: isHead }), spacing: SINGLE })],
  });
  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: header.map((h, i) => cell(h, true, i, false)) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, false, i, ri === rows.length - 1)) })),
    ],
  });
}
function image(file, widthIn) {
  const buf = fs.readFileSync(file);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const wpx = widthIn * 96;
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: SINGLE, keepNext: true,
    children: [new ImageRun({ type: "png", data: buf, transformation: { width: wpx, height: Math.round(wpx * h / w) } })],
  });
}

// ===================================================================================== INTERIM REPORT
const IOUT = "C:/Users/Rohan Mani John/OneDrive/Desktop/Masters AI ML/Capstone/Interim_Report_Rohan_Mani_John.docx";
const FIG = (f) => path.join(PROJ, "reports/figures", f);
const SCR = (f) => path.join(HERE, f);
const ITITLE = "Analysing Citizen Feedback and Drafting Grounded Replies: An Agentic Large Language Model Approach for India's Digital Public Services";

const iTitlePage = [
  Blank(), Blank(), Blank(),
  Center("Data Analytics Capstone", { bold: true }),
  Center(ITITLE, { bold: true }),
  Blank(),
  Center("Interim Report", { bold: true }),
  Blank(),
  Center("Rohan Mani John"),
  Center("Walsh College"),
  Center("QM640: Data Analytics Capstone"),
  Center(MENTOR),
  Center("Term 3"),
  Center("October 27, 2026"),
  PB(),
];

const iRepo = [
  Center("Code and Data Repository", { bold: true }),
  P(`All data files, code and generated results for this report are available at **${REPO}**. The repository README explains how to install the requirements and reproduce every table and figure; Appendix A lists the commands.`),
];

const iContents = [
  new Paragraph({ children: runs("Table of Contents", { bold: true }), alignment: AlignmentType.CENTER, spacing: DOUBLE, pageBreakBefore: true }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
];

// ------------------------------------------------------------------------------ introduction
const iIntro = [
  new Paragraph({ children: runs(ITITLE, { bold: true }), alignment: AlignmentType.CENTER, spacing: DOUBLE, pageBreakBefore: true }),
  H1("Introduction"),
  H2("Background and Context"),
  P("India operates some of the largest digital public platforms in the world. UMANG brings central and state services into one app, DigiLocker issues verified documents, mAadhaar and BHIM carry identity and payments, ABHA and Aarogya Setu serve health, and mParivahan and IRCTC Rail Connect serve transport. The United Nations nevertheless ranks India 97th of 193 countries on its E-Government Development Index (United Nations Department of Economic and Social Affairs [UN DESA], 2024), an index that measures what governments supply rather than how citizens experience it."),
  P("Citizens record that experience publicly in app-store reviews written in English, Hindi, Hinglish (Hindi written in Latin script and mixed with English) and other Indian languages. The reviews name specific failures: one-time passwords (OTPs) that never arrive, server errors at peak hours, documents that cannot be fetched, and payments debited without a completed transaction. For the agencies that run the services, including the National e-Governance Division (NeGD), the Unique Identification Authority of India (UIDAI), the National Payments Corporation of India (NPCI), the National Health Authority (NHA), the National Informatics Centre (NIC) and the Centre for Railway Information Systems (CRIS), these reviews are a free and continuous source of operational intelligence, provided someone can read them, sort them by what has failed and answer them correctly."),
  H2("Problem Statement"),
  P("Government agencies running India's digital public services receive far more citizen feedback than they can read, so they cannot see which service aspects are failing or respond reliably. In the 12-month dataset used here, 43.7% of reviews received an official reply, ranging from almost none for ABHA and mAadhaar to every review for UMANG, and most replies are templates. Citizens therefore receive no answer or a generic one; product teams cannot prioritise engineering work because star ratings show that users are unhappy but not why; and any automated reply that invents a helpline or procedure would mislead citizens further. The problem is measured through four outcomes: the association between the service aspect a review discusses and whether it is negative; the difference in mean star rating across five service categories; the change in factual groundedness of a drafted reply when official guidance is supplied; and the agent's sentiment classification error rate relative to two established baselines. The study analyses feedback and drafts replies; it does not claim that complaints are resolved."),
  H2("Purpose of the Study"),
  P("The study builds and evaluates an agentic large language model (LLM) pipeline for citizen feedback using open-weight models. It **explains drivers** of dissatisfaction (which aspects and which service categories are associated with negative feedback), **classifies** review sentiment and compares the agent with a lexicon baseline and a fine-tuned multilingual transformer, and **evaluates** whether replies grounded in official guidance contain fewer unsupported claims. Four objectives correspond to the four research questions: O1 explain aspect-level drivers (RQ1), O2 compare satisfaction across service categories (RQ2), O3 test grounded reply drafting (RQ3) and O4 benchmark the classifier (RQ4)."),
  H2("Interim Project Status (Progress Snapshot)"),
  Bullet("**Completed:** collection of 35,294 reviews for a common 12-month window from the English and Hindi listings; data cleaning and exploratory data analysis (EDA); sample-size calculation; stratified study sample of 2,000 reviews and a language-stratified reference set of 400; two baseline sentiment models (a lexicon and a multilingual transformer, described under RQ4) run on all 2,000; the RQ2 analysis on the full dataset; the RQ3 experiment on 100 complaint pairs (pilot data); the web application and automated tests."),
  Bullet("**In progress:** agent analysis of the 2,000-review sample (485 complete; the free model tier allows about 350 reviews a day, so completion is expected in the first week of November); independent labelling of the reference set by two human reviewers (labelling sheets prepared, blind to ratings and model outputs); audit of contact details in the reference guidance."),
  Bullet("**Pending:** the RQ4 test against the settled human labels; validation of the agent's aspect labels; human validation of the RQ3 judge (30 pairs); a repeat of RQ3 on audited guidance; robustness checks and the final report."),
];

// ------------------------------------------------------------------------------ scope
const iScope = [
  H1("Scope and Objectives"),
  P("The research problem is that agencies cannot see which aspects of their digital services are failing or reply reliably at scale. It is broken into four related questions, each with a null and an alternative hypothesis tested at \u03b1 = .05."),
  H2("Research Question 1 (RQ1)"),
  P("Is negative sentiment associated with the service aspect a review discusses? *H*\u2080: negativity is independent of the aspect. *H*\u2081: negativity is associated with the aspect."),
  H2("Research Question 2 (RQ2)"),
  P("Does citizen satisfaction, measured by star rating, differ across the five service categories within the same collection period? *H*\u2080: all five category means are equal. *H*\u2081: at least one differs."),
  H2("Research Question 3 (RQ3)"),
  P("Does grounding the agent's reply in retrieved official guidance (retrieval-augmented generation, RAG) improve its factual groundedness compared with the same model replying without retrieval? *H*\u2080: the mean paired difference in groundedness is zero. *H*\u2081: it is not zero."),
  H2("Research Question 4 (RQ4)"),
  P("Does the agent classify review sentiment more accurately than a lexicon tool, VADER (Valence Aware Dictionary and sEntiment Reasoner), and a fine-tuned multilingual transformer, XLM-RoBERTa (XLM-R)? *H*\u2080: the agent and each baseline have equal error rates on the same reviews. *H*\u2081: their error rates differ."),
  H2("Variables, Scope and Feasibility"),
  P("Table 1 identifies the dependent and independent variable for each question. The scope covers public Google Play reviews of eight central-government apps in five service categories, observed over the same 12-month window (October 1, 2025 to September 30, 2026); it excludes private grievance records, iOS reviews, sending replies and any claim that complaints are resolved. The project is feasible on a laptop processor and the free tier of the Groq model service, with batch analysis spread over several days."),
  ...Label("Table 1", "Dependent and Independent Variables by Research Question"),
  table(["RQ", "Independent variable", "Dependent variable", "Unit of analysis"], [
    ["RQ1", "Primary service aspect (nominal, 10 levels)", "Negative sentiment toward that aspect (binary)", "One review"],
    ["RQ2", "Service category (nominal, 5 levels)", "Star rating (ordinal, 1\u20135)", "One review"],
    ["RQ3", "Retrieval condition (within-subject: RAG vs. no RAG)", "Groundedness (1\u20135); unsupported claims (count)", "One complaint, answered twice"],
    ["RQ4", "Classifier (agent, VADER, XLM-R)", "Correct sentiment classification (binary)", "One review, classified three times"],
  ], [800, 3000, 3560, 2000]),
  Blank(),
  H2("Sample Size"),
  P("Minimum sample sizes were set a priori at \u03b1 = .05 and power = .80 with methods matched to each test (Table 2). For RQ1, the chi-square test with Cohen's (1988) small effect *w* = 0.10 and df = 9 needs noncentrality \u03bb = 15.65, so *n* = \u03bb / *w*\u00b2 = 15.65 / 0.01 = 1,565. For RQ2, one-way analysis of variance (ANOVA) with *f* = 0.10 and *k* = 5 needs \u03bb = 11.99, so *n* = 11.99 / 0.01 = 1,199. For RQ3, the paired *t*-test with *d*z = 0.30 gives *n* = [(1.960 + 0.842) / 0.30]\u00b2 + 1.960\u00b2 / 2 = 89.1, rounded up to 90. For RQ4, McNemar's test (Connor, 1987) with discordant proportion \u03c8 = 0.20 and difference \u03b4 = 0.08 gives 243, and a \u00b15% 95% confidence interval on accuracy gives 1.96\u00b2 \u00d7 0.25 / 0.05\u00b2 = 385, so RQ4 needs 385."),
  ...Label("Table 2", "Sample Size Method, Parameters and Minimum N"),
  table(["RQ", "Method", "Key parameters", "Minimum N", "Planned N"], [
    ["RQ1", "Power, chi-square test", "\u03b1 = .05, power = .80, w = 0.10, df = 9", "1,565", "\u2248 1,600 reviews with an aspect"],
    ["RQ2", "Power, one-way ANOVA", "\u03b1 = .05, power = .80, f = 0.10, k = 5", "1,199", "35,294"],
    ["RQ3", "Power, paired t-test", "\u03b1 = .05, power = .80, dz = 0.30", "90", "100 pairs"],
    ["RQ4", "Power (McNemar) and CI", "\u03c8 = 0.20, \u03b4 = 0.08; Z = 1.96, e = 0.05, p = 0.50", "385", "400"],
  ], [700, 2100, 3260, 1300, 2000]),
  Note("**Final sample size N = max(1,565, 1,199, 90, 385) = 1,565.** The 2,000-review study sample meets it: in the reviews analysed so far, 81% name an aspect."),
];

// ------------------------------------------------------------------------------ literature
const iLit = [
  H1("Literature Survey"),
  H2("Literature Review Approach"),
  P("Sources were searched in Google Scholar, the ACL Anthology, IEEE Xplore, ScienceDirect, SpringerLink, PubMed and the proceedings of NeurIPS and AAAI, using the keywords \u201capp review mining\u201d, \u201caspect-based sentiment analysis\u201d, \u201ccode-mixed Hindi English sentiment\u201d, \u201cLLM text annotation\u201d, \u201cretrieval-augmented generation\u201d, \u201challucination\u201d, \u201cLLM-as-a-judge\u201d, \u201cgovernment chatbot\u201d and \u201cpaired sample size\u201d. Sources were included if they were peer-reviewed or authoritative reports, addressed a method or setting used by one of the research questions, and were verifiable at their publisher. Sixteen sources were retained; Table 3 summarises the twelve most relevant and shows how each informs a research question."),
  ...Label("Table 3", "Literature Relevance Matrix"),
  table(["Author (Year)", "Domain / context", "Dataset / setting", "Method(s)", "Key findings", "How it supports the RQs"], [
    ["Guzman & Maalej (2014)", "App reviews", "7 apps, App Store and Google Play", "Collocations, lexicon sentiment, topic models", "Feature-level sentiment is informative", "RQ1: motivates aspect-level analysis"],
    ["Genc-Nayebi & Abran (2017)", "App-review mining", "Systematic review of studies", "Literature review", "Field focuses on whole-review classification", "RQ1, RQ4: gap in aspect and multilingual work"],
    ["Hassan et al. (2018)", "Developer replies", "Free Google Play apps", "Empirical study", "Replying is associated with rating increases", "RQ3: value of replying"],
    ["Jain et al. (2023)", "Indian government app", "Aarogya Setu reviews", "Hybrid aspect-based analysis", "Identifies user-experience factors", "RQ1: closest prior study; one app, English"],
    ["Hutto & Gilbert (2014)", "Social-media sentiment", "Tweets, reviews, news", "Rule-based lexicon (VADER)", "Strong on English social text", "RQ4: lexicon baseline"],
    ["Barbieri et al. (2022)", "Multilingual sentiment", "About 198M tweets, 8 languages", "XLM-R further trained on tweets", "Strong multilingual baseline", "RQ4: transformer baseline"],
    ["Patwa et al. (2020)", "Code-mixed sentiment", "20k Hinglish tweets", "Shared task overview", "Best Hinglish F1 about 0.75", "RQ4: why Hinglish is hard"],
    ["Gilardi et al. (2023)", "LLM annotation", "6,183 tweets and news items", "Zero-shot ChatGPT", "Beats crowd workers on annotation", "RQ4: case for an LLM classifier"],
    ["Zhang et al. (2024)", "LLMs for sentiment", "Multiple sentiment tasks", "LLMs vs fine-tuned models", "LLMs match fine-tuned models only on simple tasks", "RQ4: advantage must be tested"],
    ["Lewis et al. (2020)", "Knowledge-intensive natural language processing", "Open-domain question answering", "Retrieval-augmented generation", "Retrieval improves factuality", "RQ3: grounding method"],
    ["Ji et al. (2023)", "Natural language generation", "Survey", "Hallucination taxonomy", "Models produce unsupported statements", "RQ3: what is measured"],
    ["Zheng et al. (2023)", "LLM evaluation", "MT-Bench, Chatbot Arena", "LLM-as-a-judge", "Judges agree with humans above 80%, with biases", "RQ3: judge design and validation"],
  ], [1450, 1300, 1450, 1500, 1830, 1830]),
  Blank(),
  P("**App reviews as evidence of service quality.** Reviews carry actionable information, and feature-level sentiment exposes problems that whole-review sentiment hides (Guzman & Maalej, 2014). The field nevertheless concentrates on classifying whole English reviews (Genc-Nayebi & Abran, 2017), and the only aspect-level study of an Indian government app examined Aarogya Setu alone, in English, during the pandemic (Jain et al., 2023). These studies justify RQ1's aspect-level design but cannot say whether failures differ across services, which RQ2 addresses by comparing five categories over a common period."),
  P("**Classifying multilingual feedback.** The methods trade transparency against coverage. VADER is transparent and needs no training but cannot read Hindi or Hinglish (Hutto & Gilbert, 2014). XLM-R handles many languages (Barbieri et al., 2022), yet code-mixed Hinglish remains difficult (Patwa et al., 2020), and aspect-based analysis needs labelled data for each domain (Pontiki et al., 2014). LLMs can annotate text better than crowd workers (Gilardi et al., 2023) but only match fine-tuned models on simple sentiment (Zhang et al., 2024). The evidence is therefore mixed, so RQ4 tests the agent against both baselines rather than assuming an advantage, and reports results separately for non-English text."),
  P("**Replying without inventing facts.** Responding to reviews is associated with higher ratings (Hassan et al., 2018), and AI-assisted communication with citizens has been proposed for government (Androutsopoulou et al., 2019), but LLMs hallucinate (Ji et al., 2023). Retrieval-augmented generation reduces this by grounding generation in retrieved documents (Lewis et al., 2020); such systems are usually scored with reference-based metrics (Es et al., 2024) or LLM judges, whose agreement with people is high but biased (Zheng et al., 2023). RQ3 therefore uses a controlled within-subject comparison, a judge from a different model family, and a human check of the judge."),
  P("**Gap.** No study has compared an LLM agent with lexicon and fine-tuned baselines for aspect-level analysis of citizen feedback across several Indian digital public services using comparable periods, multilingual text and human-validated labels, or tested whether grounding replies in agencies' own published responses reduces unsupported claims. This study addresses both."),
];

// ------------------------------------------------------------------------------ data
const iData = [
  H1("Data Description"),
  P("The data are public reviews of eight Government of India apps on the Google Play store (Google, 2026), collected for this study and published as an open dataset (John, 2026). They are available to the evaluator in the GitHub repository."),
  H2("Data Sources and Access"),
  P(`Reviews were collected on October 13, 2026 with the open-source google-play-scraper package from both the English and the Hindi listings of the India store. Every app was observed over the same window, October 1, 2025 to September 30, 2026; apps with more than 5,000 reviews in the window were randomly sampled to 5,000 (seed 42). The two listings did not overlap (0 duplicate review identifiers), and the Hindi listing contributed 3,925 reviews before sampling. Source pages: UMANG (https://play.google.com/store/apps/details?id=in.gov.umang.negd.g2c), DigiLocker (\u2026?id=com.digilocker.android), mAadhaar (\u2026?id=in.gov.uidai.mAadhaarPlus), BHIM (\u2026?id=in.org.npci.upiapp), Aarogya Setu (\u2026?id=nic.goi.aarogyasetu), ABHA (\u2026?id=in.ndhm.phr), mParivahan (\u2026?id=com.nic.mparivahan) and IRCTC Rail Connect (\u2026?id=cris.org.in.prs.ima).`),
  H2("Dataset Overview"),
  Bullet("**Number of records (rows):** 35,294 reviews."),
  Bullet("**Number of variables (columns):** 12 collected variables, plus derived variables (Table 4)."),
  Bullet("**Time period:** October 1, 2025 to September 30, 2026, identical for all apps."),
  Bullet("**Unit of analysis:** one review."),
  Bullet("**Target variables:** star rating (RQ2); negative sentiment toward the primary aspect (RQ1); groundedness of a drafted reply (RQ3); correctness of the sentiment label against human reviewers (RQ4)."),
  H2("Data Dictionary"),
  ...Label("Table 4", "Data Dictionary"),
  table(["Variable", "Definition", "Datatype", "Allowed values / range", "Missing values handling", "Notes"], [
    ["review_id", "Google Play review identifier", "String", "UUID", "None missing", "Key; links all files"],
    ["app_name", "App reviewed", "Nominal", "8 apps", "None missing", "Sampling stratum"],
    ["service_category", "Service type of the app", "Nominal", "5 categories", "None missing", "IV for RQ2"],
    ["text", "Review text as written", "String", "1\u2013500 characters", "1 empty review dropped", "Input to all classifiers"],
    ["rating", "Star rating", "Ordinal (integer)", "1\u20135", "None missing", "DV for RQ2; never a model input"],
    ["thumbs_up", "Helpful votes", "Integer", "0\u20131,382", "None missing", "Descriptive only"],
    ["app_version", "App version at review", "String", "e.g. 2.4.1", "5,880 (16.7%) missing; kept as missing", "Not used in any test"],
    ["review_date", "Time posted", "Datetime", "Oct 1, 2025 \u2013 Sep 30, 2026", "None missing", "Defines the window"],
    ["has_dev_reply", "Official reply exists", "Boolean", "True / False", "None missing", "Descriptive"],
    ["dev_reply", "Official reply text", "String", "Text", "Missing when no reply (19,862); structural", "Knowledge base for RAG"],
    ["n_words (derived)", "Words in the review", "Integer", "1\u2013121", "\u2014", "Eligibility: \u2265 5 words"],
    ["language (derived)", "Language and script", "Nominal", "English, Hinglish, Hindi, other Indian, other", "\u2014", "Reference-set stratum"],
    ["primary_aspect (derived)", "Main aspect discussed (agent)", "Nominal", "10 aspects", "Reviews with no aspect excluded from RQ1", "IV for RQ1"],
    ["primary_negative (derived)", "Aspect discussed negatively", "Binary", "Yes / no", "\u2014", "DV for RQ1"],
    ["overall_sentiment (derived)", "Predicted sentiment", "Nominal", "Negative, neutral, positive", "\u2014", "Output of each classifier (RQ4)"],
    ["label_sentiment", "Human reference label", "Nominal", "Negative, neutral, positive", "Settled by two reviewers", "Ground truth (RQ4)"],
    ["groundedness", "Support of the reply's facts", "Ordinal", "1\u20135", "\u2014", "DV for RQ3"],
  ], [1700, 1750, 1050, 1650, 1700, 1510]),
  Note("IV = independent variable; DV = dependent variable; RAG = retrieval-augmented generation. Derived variables are computed by the analysis scripts from the collected variables."),
  Blank(),
  H2("GitHub Data Availability Statement"),
  P("The raw and processed datasets are available in the GitHub repository under the following paths:"),
  Bullet("**Raw data:** data/raw/playstore_reviews_2026-10-13_window.csv (study dataset) and data/raw/window_population.csv (sampling fractions)."),
  Bullet("**Processed / clean data:** data/processed/ (analysis_sample.csv, analyzer_results.jsonl, baseline_predictions.csv, rq4_ablation.jsonl)."),
  Bullet("**Code:** scraper/, rag/, agent/, analysis/, api/, frontend/ and tests/; results are written to reports/."),
  H2("Screenshots and Evidence"),
  P("Figure 1 shows the repository structure and Figure 2 a preview of the dataset."),
  ...Label("Figure 1", "GitHub Repository Structure"),
  image(SCR("gh_tree.png"), 5.4),
  Note("Screenshot of https://github.com/rohanmanijohn/digital-india-agent, October 24, 2026."),
  Blank(),
  ...Label("Figure 2", "Preview of the Review Dataset"),
  image(SCR("dataset_preview.png"), 6.3),
  Note("First reviews per app with at least six words; text and identifiers are truncated for display."),
];

// ------------------------------------------------------------------------------ analysis
const iAnalysis = [
  H1("Analysis"),
  H2("Data Cleaning"),
  P("Table 5 records each cleaning step with its counts. Cleaning was deliberately light: the reviews are the citizens' own words, so the text was not stemmed, spell-corrected or translated, which would have removed the code-mixing that RQ4 needs to test. All steps are implemented in the collection and EDA scripts and are reproducible."),
  ...Label("Table 5", "Data Cleaning Log"),
  table(["Issue", "Variables affected", "Detection method", "Treatment applied", "Rationale"], [
    ["Missing values", "text (1), app_version (5,880; 16.7%), dev_reply (19,862)", "Null counts per column", "Empty review dropped; app_version left missing; missing dev_reply recorded as has_dev_reply = False", "app_version is not used in any test; a missing reply is information, not an error"],
    ["Outliers", "thumbs_up (max 1,382), review length (max 121 words)", "Interquartile-range rule; Play limit of 500 characters", "Retained", "Genuine values; thumbs_up is descriptive only and length is capped by the store"],
    ["Duplicates", "review_id; text", "Duplicate keys across English and Hindi listings; identical texts", "0 duplicate identifiers; 14,582 identical short texts (e.g. \u201cgood\u201d) kept", "Identical texts are different citizens expressing the same view"],
    ["Uninformative text", "text", "Word count < 5", "22,923 reviews (64.9%) excluded from the study sample, kept for RQ2", "Short reviews name no aspect"],
    ["Invalid values", "rating", "Range check 1\u20135", "None found", "\u2014"],
    ["Personal data", "dev_reply", "Pattern match on salutations", "Reviewer names replaced with \u201cUser\u201d", "Privacy"],
  ], [1400, 2100, 1850, 2100, 1910]),
  Blank(),
  H2("EDA Results"),
  P("The overall mean rating is 3.52 (standard deviation 1.78), but the distribution is polarised: 53.6% of reviews give five stars and 29.8% give one star, with few in between. As shown in Figure 3, the apps differ sharply: 60.4% of mParivahan reviews give one star, compared with 7.4% for UMANG and 7.8% for ABHA. Because means hide polarisation, RQ2 is tested with a rank-based test alongside ANOVA."),
  ...Label("Figure 3", "Distribution of Star Ratings by App"),
  image(FIG("eda_rating_distribution.png"), 5.6),
  Note("Share of each app's reviews in the 12-month window at each star rating."),
  Blank(),
  P("Review length is strongly skewed: the median review has two words, and 64.9% have fewer than five. Rating is negatively correlated with length (Spearman \u03c1 = \u2212.57) and with helpful votes (\u03c1 = \u2212.24), so dissatisfied citizens write more and other users endorse their complaints. Figure 4 shows that BHIM, mParivahan and IRCTC Rail Connect attract the longest reviews, which is where aspect analysis has most to work with."),
  ...Label("Figure 4", "Review Length by App"),
  image(FIG("eda_review_length.png"), 5.6),
  Note("Words per review on a logarithmic scale; the dashed line marks the five-word eligibility threshold."),
  Blank(),
  P("Official reply rates differ by app far more than by rating (Figure 5): UMANG replies to every review and mParivahan to 93.9%, while ABHA (0.1%), mAadhaar (0.3%) and IRCTC Rail Connect (4.3%) almost never reply. This sets a practical limit for RQ3, since apps that never reply provide no official guidance to retrieve."),
  ...Label("Figure 5", "Official Reply Rate by App"),
  image(FIG("eda_official_reply_rate.png"), 5.4),
  Note("Share of each app's reviews in the window that received an official reply from the app's team; n = 35,294."),
  Blank(),
  P("Monthly means reveal two anomalies and one trend (Figure 6). Citizen services (UMANG) held near 4.5 stars until June 2026, then fell to about 3.0 from July as its review volume collapsed; 13% of its official replies from July onward mention a server migration, which is consistent with a service disruption. Payments (BHIM) jumped to 4.36 stars in April 2026 on four times its usual volume (1,394 reviews), a burst typical of in-app prompts or promotions, so a robustness check will re-run RQ2 without that month. Transport rose steadily from 1.9 to 3.2 stars, partly because IRCTC Rail Connect, which is rated higher than mParivahan, contributes more reviews in later months."),
  ...Label("Figure 6", "Mean Monthly Rating by Service Category"),
  image(FIG("eda_monthly_rating_by_category.png"), 5.8),
  Note("Mean star rating per month for each service category, October 2025 to September 2026; n = 35,294."),
  Blank(),
  P("Between 9.7% (mParivahan) and 19.2% (ABHA) of eligible reviews are in Hindi, Hinglish or another Indian language (Figure 7), 12.5% overall. This is enough to matter for classification but too few to evaluate by chance, which is why the reference set is stratified to 200 English and 200 non-English reviews."),
  ...Label("Figure 7", "Share of Non-English Reviews by App"),
  image(FIG("eda_language_mix.png"), 5.4),
  Note("Eligible reviews (at least five words, n = 12,370); language assigned from the script and a Hinglish word list."),
  Blank(),
  ...Label("Table 6", "EDA Insight Summary"),
  table(["Figure / Table", "What it shows", "Key insight", "Why it matters", "Decision / next step"], [
    ["Figure 3", "Rating distribution by app", "Ratings are polarised; mParivahan 60% one-star", "RQ2 outcome is not normal", "Report Kruskal-Wallis with ANOVA"],
    ["Figure 4", "Review length", "65% under five words; longer reviews are more negative", "Aspect analysis needs text", "Exclude short reviews from the RQ1 sample"],
    ["Figure 5", "Official reply rates", "0% to 100% by app", "Limits retrieval in RQ3", "Report RQ3 by guidance availability"],
    ["Figure 6", "Monthly trends", "UMANG drop from July; BHIM April burst", "Time effects within categories", "Robustness check excluding April"],
    ["Figure 7", "Language mix", "12.5% non-English", "RQ4 must cover Hinglish", "Language-stratified reference set"],
    ["Table 5", "Cleaning log", "Little missing data; no duplicate keys", "Data are usable as collected", "Light cleaning only"],
  ], [1250, 1700, 2300, 1900, 2210]),
];

// ------------------------------------------------------------------------------ modelling
const iModel = [
  H1("Modelling"),
  H2("Choice of Models with Justification"),
  P("The problem combines classification (RQ4, and the aspect labels behind RQ1), inference about group differences (RQ1, RQ2) and a controlled experiment (RQ3). Figure 8 shows how the models fit into one pipeline."),
  ...Label("Figure 8", "End-to-End Pipeline"),
  image(SCR("arch.png"), 6.2),
  Note("All language models are open-weight and served by Groq; the research layer runs the same agent as the web application."),
  Blank(),
  H3("Model 1: VADER lexicon (baseline)"),
  P("A rule-based lexicon (Hutto & Gilbert, 2014). It is the simplest credible baseline: transparent, free and widely used for social text. Its known weakness on non-English text makes it a meaningful lower bound."),
  H3("Model 2: XLM-RoBERTa fine-tuned for sentiment (strong baseline)"),
  P("A multilingual transformer further trained on tweets and fine-tuned for three-class sentiment (Barbieri et al., 2022). It is the strongest established alternative that can read Hindi and Hinglish, so beating or matching it is the real test of the agent."),
  H3("Model 3: LLM agent (proposed)"),
  P("A graph workflow built with Google's Agent Development Kit. An analyzer (gpt-oss-20b) returns structured sentiment, aspects, severity and language; a routing step passes actionable complaints on; a retrieval step finds up to four official replies for the same app; a responder (gpt-oss-120b) drafts a reply that may use contact details only from that guidance; and a checker from a different model family (Qwen) rejects unsupported drafts. It is chosen because it can produce aspects and replies, which neither baseline can, and the literature leaves its classification accuracy open (Zhang et al., 2024)."),
  H3("Statistical models"),
  P("RQ1 uses a chi-square test of independence with a logistic regression of negativity on aspect indicators, whose odds ratios act as feature importance. RQ2 uses Welch's ANOVA with the Kruskal-Wallis test and Tukey's honestly significant difference (HSD) test. RQ3 uses a paired *t*-test with the Wilcoxon signed-rank test. **Assumptions** (independent reviews; adequate expected counts; equal variances or Welch's correction; approximately normal paired differences) are checked, and rank-based alternatives are reported where they fail. **Limitations:** none of the classifiers is trained on this domain, and the agent depends on a hosted service. **Alternatives considered:** fine-tuning a classifier was rejected because no labelled domain data exist, and topic modelling for aspects was rejected because its topics would need manual mapping to the ten service aspects."),
  H2("Features Included and Feature Engineering"),
  P("The classifiers take raw review text, as their designs intend. Engineered features serve the statistical models and the sampling (Table 7). **Leakage is avoided** in four ways: the star rating is never an input to any classifier; human reviewers label without seeing ratings or model outputs; the retrieval step excludes the official reply to the complaint being answered; and reference labels are settled before any model is scored against them."),
  ...Label("Table 7", "Feature Set and Usage"),
  table(["Feature", "Original / engineered", "Type", "Reason for inclusion", "Used in"], [
    ["Review text", "Original", "Text", "Primary input", "VADER, XLM-R, agent"],
    ["App name", "Original", "Nominal (one-hot)", "Context for the agent; sampling stratum", "Agent prompt; sampling"],
    ["Service category", "Engineered from app", "Nominal", "Grouping variable", "RQ2 ANOVA"],
    ["Primary aspect", "Engineered by the agent", "Nominal", "Explanatory variable", "RQ1 chi-square"],
    ["Aspect indicators", "Engineered (multi-hot)", "Binary \u00d7 10", "Robustness model with all aspects mentioned", "RQ1 logistic regression"],
    ["Word count", "Engineered", "Integer", "Eligibility filter (\u2265 5 words)", "Sampling"],
    ["Language", "Engineered (script and word rules)", "Nominal", "Stratify reference set; subgroup results", "Sampling; RQ4"],
    ["Retrieved guidance", "Engineered (embedding search)", "Text (top 4)", "Grounds the reply", "RQ3 responder"],
  ], [1700, 1900, 1500, 2400, 1860]),
  Blank(),
  H2("Validation Approach and Evaluation Metrics"),
  P("None of the classifiers is trained on this data: VADER is rule-based, XLM-R is used as released, and the agent is prompted without examples. The whole human-labelled reference set therefore serves as a held-out test set, so no train-test split or cross-validation is needed; uncertainty is quantified with 2,000 bootstrap resamples. Until the human labels are settled, star ratings serve as a provisional proxy (one or two stars negative, three neutral, four or five positive). Table 8 defines the metrics."),
  ...Label("Table 8", "Evaluation Metrics and Formulae"),
  table(["Metric", "Formula", "Interpretation", "Used for"], [
    ["Accuracy", "(correct predictions) / N", "Share of reviews labelled correctly", "RQ4"],
    ["Precision (class c)", "TP\u1d9c / (TP\u1d9c + FP\u1d9c)", "How often a predicted c is right", "RQ4"],
    ["Recall (class c)", "TP\u1d9c / (TP\u1d9c + FN\u1d9c)", "How many true c are found", "RQ4"],
    ["F1-score", "2PR / (P + R); macro-F1 = mean over 3 classes", "Balance of precision and recall; primary metric (classes imbalanced)", "RQ4"],
    ["Cohen's \u03ba", "(p\u2092 \u2212 p\u2091) / (1 \u2212 p\u2091)", "Agreement beyond chance", "RQ4; inter-rater"],
    ["McNemar \u03c7\u00b2", "(|b \u2212 c| \u2212 1)\u00b2 / (b + c)", "Paired difference in errors", "RQ4"],
    ["Cram\u00e9r's V", "\u221a[\u03c7\u00b2 / (n(min(r, c) \u2212 1))]", "Strength of association (0\u20131)", "RQ1"],
    ["\u03b7\u00b2", "SS_between / SS_total = F\u00b7df\u2081 / (F\u00b7df\u2081 + df\u2082)", "Share of rating variance explained", "RQ2"],
    ["Cohen's d_z", "mean(D) / SD(D)", "Size of the paired difference", "RQ3"],
  ], [1700, 3000, 2900, 1760]),
  Note("TP, FP and FN are true positives, false positives and false negatives; b and c are the reviews only one classifier labels correctly; D is the paired difference."),
];

// ------------------------------------------------------------------------------ results
const iResults = [
  H1("Preliminary Results"),
  H2("Preliminary Findings by Research Question"),
  P("**RQ1 (aspects).** Completed for the 485 reviews analysed so far, of which 392 name an aspect. Negativity is strongly associated with the aspect: \u03c7\u00b2(9) = 116.01, *p* < .001, Cram\u00e9r's *V* = \u221a(116.01 / 392) = 0.54, well above the 0.10 threshold, so *H*\u2080 is rejected on current data. Figure 9 shows the pattern: every login and OTP complaint is negative (67 of 67), as are 95.6% of downtime and 96.9% of update-bug reviews, while only 35.8% of usability comments are negative. In the logistic regression (pseudo-R\u00b2 = 0.23), server downtime raises the odds of a negative review 6.7 times (95% confidence interval 2.5\u201318.0), update bugs 3.9 times (1.1\u201313.8), and usability comments cut them to 0.15 (0.08\u20130.27); login is excluded because no login review is non-negative. **Remaining:** the full sample, and validation of the agent's aspect labels against the human reviewers. Because the reference set was analysed first, the current reviews over-represent non-English text."),
  ...Label("Figure 9", "Share of Reviews Discussing Each Aspect Negatively (RQ1)"),
  image(FIG("rq2_negative_share_by_aspect.png"), 5.6),
  Note("Points show the share; bars show 95% Wilson confidence intervals. n = 392 reviews."),
  Blank(),
  P("**RQ2 (service categories).** Complete. Mean ratings differ across categories (Figure 10): citizen services 4.44, health 4.30, identity and documents 3.59, payments 3.35 and transport 2.65. Welch's *F* = 1,659.7, the classic ANOVA gives *F*(4, 35289) = 1,412.24 and the Kruskal-Wallis *H*(4) = 4,400.1, all *p* < .001, and every one of the ten Tukey comparisons is significant. The effect is large: \u03b7\u00b2 = (1,412.24 \u00d7 4) / (1,412.24 \u00d7 4 + 35,289) = 0.138. *H*\u2080 is rejected. On the pilot collection, where apps covered different periods, \u03b7\u00b2 was only 0.026, so the common window changed the conclusion from a small to a large effect. **Remaining:** the robustness check excluding the April payments burst."),
  ...Label("Figure 10", "Mean Star Rating by Service Category (RQ2)"),
  image(FIG("rq3_rating_by_category.png"), 5.4),
  Note("Points show means with 95% confidence intervals; n = 35,294."),
  Blank(),
  P("**RQ3 (grounded replies).** A first run on 100 complaints from the pilot data is complete (Table 9). With retrieved guidance, mean groundedness was 4.29 against 3.24 without it; the paired difference of 1.05 (standard deviation 1.086) gives *t*(99) = 9.67, *p* < .001 and *d*z = 1.05 / 1.086 = 0.97, and the Wilcoxon test agrees. Replies with at least one unsupported claim fell from 87% to 44% (McNemar exact *p* < .001). The gain comes entirely from complaints where guidance exists (4.63 against 3.28); where none was found, both conditions scored 3.09 (Figure 11). The groundedness target of 4.0 is met, but the target of 70% of replies free of unsupported claims is not (56%). **Remaining:** human validation of the judge, the audit of guidance contact details, and a repeat on the common-window data."),
  ...Label("Table 9", "RQ3 Paired Results, RAG Versus No RAG (n = 100)"),
  table(["Measure", "With RAG", "Without RAG", "Test"], [
    ["Groundedness (1\u20135)", "4.29", "3.24", "t(99) = 9.67, p < .001, dz = 0.97"],
    ["Helpfulness (1\u20135)", "3.73", "2.38", "t(99) = 10.47, p < .001, dz = 1.05"],
    ["Unsupported claims per reply", "0.59", "1.34", "t(99) = \u22127.36, p < .001"],
    ["Replies with \u2265 1 unsupported claim", "44%", "87%", "McNemar exact p < .001"],
  ], [3000, 1400, 1500, 3460]),
  Blank(),
  ...Label("Figure 11", "Paired Difference in Groundedness per Complaint (RQ3)"),
  image(FIG("rq4_groundedness_difference.png"), 5.4),
  Note("Groundedness with RAG minus groundedness without RAG for each of 100 complaints, scored 1–5 by the judge model; positive values favour RAG."),
  Blank(),
  P("**RQ4 (classifier accuracy).** Provisional, against the star-rating proxy on the 485 analysed reviews (Table 10). The agent reached accuracy 0.800 and macro-F1 0.619, ahead of XLM-R (0.775, 0.596) and far ahead of VADER (0.482, 0.431). McNemar's test separates the agent from VADER: *b* = 183, *c* = 29, \u03c7\u00b2 = (|183 \u2212 29| \u2212 1)\u00b2 / 212 = 110.42, *p* < .001, with a macro-F1 difference of +0.19 (95% confidence interval +0.13 to +0.25). It does not separate the agent from XLM-R (\u03c7\u00b2 = 1.83, *p* = .18; difference +0.02, interval \u22120.04 to +0.09). On non-English reviews the agent's macro-F1 was 0.55 against 0.48 for XLM-R and 0.25 for VADER. The confusion matrix (Figure 12) shows that most of the agent's errors are positive-rated reviews it labels negative, which usually contain a complaint despite a high rating, so the star proxy understates its accuracy. **Remaining:** the test against settled human labels, which decides *H*\u2080."),
  H2("Preliminary Model Performance"),
  ...Label("Table 10", "Preliminary Model Performance Comparison (Star-Rating Proxy, n = 485)"),
  table(["Model", "Feature set", "Validation approach", "Accuracy", "Macro-F1", "Key takeaway"], [
    ["VADER", "Raw text", "Held-out, proxy labels", "0.482", "0.431", "Fails on non-English text (macro-F1 0.25)"],
    ["XLM-R", "Raw text", "Held-out, proxy labels", "0.775", "0.596", "Strong multilingual baseline"],
    ["LLM agent", "Raw text + app name", "Held-out, proxy labels", "0.800", "0.619", "Best on non-English; not yet significantly better than XLM-R"],
  ], [1300, 1500, 1800, 1100, 1100, 2560]),
  Blank(),
  ...Label("Figure 12", "Confusion Matrix of the Agent Against the Star-Rating Proxy (RQ4)"),
  image(FIG("rq1_proxy_stars_agent_confusion.png"), 3.8),
  Note("Rows show the star-rating proxy (one or two stars negative, three neutral, four or five positive) and columns the agent's label; n = 485."),
  H2("Interim Limitations and Risks"),
  Bullet("**Partial sample.** RQ1 and RQ4 use 485 of 2,000 reviews, weighted toward the reference set; the free model tier limits progress to about 350 reviews a day. Mitigation: daily runs, with completion expected in the first week of November."),
  Bullet("**Proxy labels.** Star ratings disagree with text, so RQ4 is provisional. Mitigation: two independent human reviewers, with Cohen's \u03ba reported."),
  Bullet("**Uneven review volume.** UMANG's volume fell sharply after June 2026, and BHIM had an unusual April. Mitigation: monthly analysis and a robustness check."),
  Bullet("**Judge bias and thin guidance.** The RQ3 judge is a language model, and some apps publish no replies. Mitigation: human validation of 30 pairs, a contact-detail audit, and results reported by guidance availability."),
  Bullet("**Self-selected reviewers.** Reviews describe feedback, not the views of all citizens; conclusions are limited accordingly."),
  H2("Next Steps (for Final Report)"),
  Bullet("Complete the agent analysis of all 2,000 reviews and rerun RQ1 and RQ4 on the full sample."),
  Bullet("Finish independent labelling of the 400 reference reviews; report agreement and settle disagreements."),
  Bullet("Run the RQ4 test against human labels, including results by language."),
  Bullet("Validate the agent's aspect labels against the reviewers (target accuracy 0.80)."),
  Bullet("Audit guidance contact details, rerun RQ3 on the common-window data, and validate the judge with 30 human-rated pairs."),
  Bullet("Robustness checks (excluding April 2026 payments; transport by app), then write the final report and presentation."),
];

const iRefs = [
  PB(),
  H1("Bibliography"),
  Ref("Androutsopoulou, A., Karacapilidis, N., Loukis, E., & Charalabidis, Y. (2019). Transforming the communication between citizens and government through AI-guided chatbots. *Government Information Quarterly, 36*(2), 358\u2013367. https://doi.org/10.1016/j.giq.2018.10.001"),
  Ref("Anthropic. (2026). *Claude* (Opus 5.5) [Large language model]. https://claude.ai"),
  Ref("Barbieri, F., Espinosa Anke, L., & Camacho-Collados, J. (2022). XLM-T: Multilingual language models in Twitter for sentiment analysis and beyond. In *Proceedings of the Thirteenth Language Resources and Evaluation Conference* (pp. 258\u2013266). European Language Resources Association. https://aclanthology.org/2022.lrec-1.27/"),
  Ref("Cohen, J. (1988). *Statistical power analysis for the behavioral sciences* (2nd ed.). Lawrence Erlbaum Associates."),
  Ref("Connor, R. J. (1987). Sample size for testing differences in proportions for the paired-sample design. *Biometrics, 43*(1), 207\u2013211. https://doi.org/10.2307/2531961"),
  Ref("Es, S., James, J., Espinosa-Anke, L., & Schockaert, S. (2024). RAGAs: Automated evaluation of retrieval augmented generation. In *Proceedings of the 18th Conference of the European Chapter of the Association for Computational Linguistics: System Demonstrations* (pp. 150\u2013158). Association for Computational Linguistics. https://aclanthology.org/2024.eacl-demo.16/"),
  Ref("Genc-Nayebi, N., & Abran, A. (2017). A systematic literature review: Opinion mining studies from mobile app store user reviews. *Journal of Systems and Software, 125*, 207\u2013219. https://doi.org/10.1016/j.jss.2016.11.027"),
  Ref("Gilardi, F., Alizadeh, M., & Kubli, M. (2023). ChatGPT outperforms crowd workers for text-annotation tasks. *Proceedings of the National Academy of Sciences, 120*(30), Article e2305016120. https://doi.org/10.1073/pnas.2305016120"),
  Ref("Google. (2026). *Google Play* [Online app store]. https://play.google.com"),
  Ref("Guzman, E., & Maalej, W. (2014). How do users like this feature? A fine grained sentiment analysis of app reviews. In *2014 IEEE 22nd International Requirements Engineering Conference* (pp. 153\u2013162). IEEE. https://doi.org/10.1109/RE.2014.6912257"),
  Ref("Hassan, S., Tantithamthavorn, C., Bezemer, C.-P., & Hassan, A. E. (2018). Studying the dialogue between users and developers of free apps in the Google Play Store. *Empirical Software Engineering, 23*(3), 1275\u20131312. https://doi.org/10.1007/s10664-017-9538-9"),
  Ref("Hutto, C., & Gilbert, E. (2014). VADER: A parsimonious rule-based model for sentiment analysis of social media text. *Proceedings of the International AAAI Conference on Web and Social Media, 8*(1), 216\u2013225. https://ojs.aaai.org/index.php/ICWSM/article/view/14550"),
  Ref("Jain, A., Dey, L., Dasgupta, T., & Naskar, A. (2023). Factors affecting user experience of contact tracing app during COVID-19: An aspect-based sentiment analysis of user-generated review. *Behaviour & Information Technology, 42*(2), 249\u2013264. https://doi.org/10.1080/0144929X.2022.2139758"),
  Ref("Ji, Z., Lee, N., Frieske, R., Yu, T., Su, D., Xu, Y., Ishii, E., Bang, Y. J., Madotto, A., & Fung, P. (2023). Survey of hallucination in natural language generation. *ACM Computing Surveys, 55*(12), 1\u201338. https://doi.org/10.1145/3571730"),
  Ref("John, R. M. (2026). *Digital India app reviews, October 2025 to September 2026* [Data set]. GitHub. https://github.com/rohanmanijohn/digital-india-agent"),
  Ref("Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., K\u00fcttler, H., Lewis, M., Yih, W., Rockt\u00e4schel, T., Riedel, S., & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *Advances in Neural Information Processing Systems, 33*, 9459\u20139474."),
  Ref("Patwa, P., Aguilar, G., Kar, S., Pandey, S., PYKL, S., Gamb\u00e4ck, B., Chakraborty, T., Solorio, T., & Das, A. (2020). SemEval-2020 Task 9: Overview of sentiment analysis of code-mixed tweets. In *Proceedings of the Fourteenth Workshop on Semantic Evaluation* (pp. 774\u2013790). International Committee for Computational Linguistics. https://aclanthology.org/2020.semeval-1.100/"),
  Ref("Pontiki, M., Galanis, D., Pavlopoulos, J., Papageorgiou, H., Androutsopoulos, I., & Manandhar, S. (2014). SemEval-2014 Task 4: Aspect based sentiment analysis. In *Proceedings of the 8th International Workshop on Semantic Evaluation* (pp. 27\u201335). Association for Computational Linguistics. https://aclanthology.org/S14-2004/"),
  Ref("United Nations Department of Economic and Social Affairs. (2024). *E-Government Survey 2024: Accelerating digital transformation for sustainable development*. United Nations. https://publicadministration.un.org/egovkb/en-us/Reports/UN-E-Government-Survey-2024"),
  Ref("Zhang, W., Deng, Y., Liu, B., Pan, S., & Bing, L. (2024). Sentiment analysis in the era of large language models: A reality check. In *Findings of the Association for Computational Linguistics: NAACL 2024* (pp. 3881\u20133906). Association for Computational Linguistics. https://aclanthology.org/2024.findings-naacl.246/"),
  Ref("Zheng, L., Chiang, W.-L., Sheng, Y., Zhuang, S., Wu, Z., Zhuang, Y., Lin, Z., Li, Z., Li, D., Xing, E. P., Zhang, H., Gonzalez, J. E., & Stoica, I. (2023). Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. *Advances in Neural Information Processing Systems, 36*. https://arxiv.org/abs/2306.05685"),
];
const hStyle = (id, name, run, paragraph) => ({ id, name, basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: SIZE, color: "000000", ...run }, paragraph: { spacing: DOUBLE, keepNext: true, ...paragraph } });

const iAI = [
  H2("Use of AI Tools"),
  P("An AI assistant (Anthropic, 2026) was used to support programming and to help draft and edit this report. It did not produce the reference labels, which come from two human reviewers. The author reviewed all content and is responsible for it."),
];

const iAppendix = [
  PB(),
  H1("Appendix A: Commands to Reproduce the Results"),
  P("The following commands, run from the repository root after installing requirements.txt and adding a free Groq key to a .env file, regenerate the data, samples, model outputs, tables and figures in this report (see the Code and Data Repository page)."),
  Mono("python -m scraper.window_scraper --since 2025-10-01 --until 2026-09-30 --cap 5000"),
  Mono("python -m rag.build_kb"),
  Mono("python -m analysis.sampling"),
  Mono("python -m analysis.run_analyzer      # resumable; repeat daily on the free tier"),
  Mono("python -m analysis.baselines"),
  Mono("python -m analysis.rq4_rag_ablation"),
  Mono("python -m analysis.eda"),
  Mono("python -m analysis.stats_tests", true),
];

const iDoc = new Document({
  creator: "Rohan Mani John",
  title: "QM640 Interim Report",
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: SIZE } } },
    paragraphStyles: [
      hStyle("Heading1", "Heading 1", { bold: true }, { alignment: AlignmentType.CENTER, outlineLevel: 0 }),
      hStyle("Heading2", "Heading 2", { bold: true }, { alignment: AlignmentType.LEFT, outlineLevel: 1 }),
      hStyle("Heading3", "Heading 3", { bold: true, italics: true }, { alignment: AlignmentType.LEFT, outlineLevel: 2 }),
      { id: "TOC1", name: "toc 1", basedOn: "Normal", next: "Normal", run: { font: FONT, size: SIZE }, paragraph: { spacing: { line: 240, lineRule: LineRuleType.AUTO, before: 0, after: 0 } } },
      { id: "TOC2", name: "toc 2", basedOn: "Normal", next: "Normal", run: { font: FONT, size: SIZE }, paragraph: { spacing: { line: 240, lineRule: LineRuleType.AUTO, before: 0, after: 0 }, indent: { left: 360 } } },
    ],
  },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: "bullet", text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SIZE })] })] }) },
    children: [...iTitlePage, ...iRepo, ...iContents, ...iIntro, ...iScope, ...iLit, ...iData, ...iAnalysis, ...iModel, ...iResults, ...iAI, ...iRefs, ...iAppendix],
  }],
});
Packer.toBuffer(iDoc).then((buf) => { fs.writeFileSync(IOUT, buf); console.log("wrote", IOUT, buf.length, "bytes"); });
