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

const TITLE = "Analysing Citizen Feedback and Drafting Grounded Replies: An Agentic Large Language Model Approach for India's Digital Public Services";

// ---------------------------------------------------------------------------------- title + contents
const titlePage = [
  Blank(), Blank(), Blank(),
  Center("Data Analytics Capstone", { bold: true }),
  Center(TITLE, { bold: true }),
  Blank(),
  Center("Synopsis", { bold: true }),
  Blank(),
  Center("Rohan Mani John"),
  Center("Walsh College"),
  Center("QM640: Data Analytics Capstone"),
  Center(MENTOR),
  Center("Term 3"),
  Center("October 13, 2026"),
  PB(),
];
const contents = [
  Center("Table of Contents", { bold: true }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
];

// ---------------------------------------------------------------------------------- introduction
const intro = [
  new Paragraph({ children: runs(TITLE, { bold: true }), alignment: AlignmentType.CENTER, spacing: DOUBLE, pageBreakBefore: true }),
  H1("Introduction"),
  H2("Background and Context"),
  P("India operates some of the largest digital public platforms in the world. UMANG brings central and state services into one app, DigiLocker issues verified documents, mAadhaar and BHIM carry identity and payments, ABHA and Aarogya Setu serve health, and mParivahan and IRCTC Rail Connect serve transport. Despite this scale, the United Nations ranks India 97th of 193 countries on its E-Government Development Index (United Nations Department of Economic and Social Affairs [UN DESA], 2024). That index measures what governments supply, such as online services and infrastructure. It does not measure how citizens experience those services."),
  P("Citizens record that experience publicly in app-store reviews, written in English, Hindi, Hinglish (Hindi in Latin script mixed with English) and other Indian languages. The reviews name specific failures: one-time passwords (OTPs) that never arrive, server errors at peak hours, documents that cannot be fetched, and payments debited without a completed transaction. For the agencies that run these services, this is a free and continuous source of operational intelligence, but only if someone can read it, sort it by what has failed, and answer it correctly."),
  H2("Related Literature and Research Gap"),
  P("Table 1 compares the studies closest to this problem. App-review research shows that reviews carry actionable information and that feature-level sentiment exposes problems whole-review sentiment hides (Guzman & Maalej, 2014), but most studies classify whole English reviews (Genc-Nayebi & Abran, 2017), and the one aspect-level study of an Indian government app covered a single app in English only (Jain et al., 2023). Responding to reviews is associated with higher ratings (Hassan et al., 2018), and AI-assisted communication with citizens has been proposed (Androutsopoulou et al., 2019), yet neither line of work tests whether replies are factually correct. Methodologically, lexicons such as VADER (Valence Aware Dictionary and sEntiment Reasoner) are transparent but cannot read Hindi or Hinglish (Hutto & Gilbert, 2014); multilingual transformers generalise across languages (Barbieri et al., 2022), but code-mixed Hinglish remains hard, with the best shared-task F1 near 0.75 (Patwa et al., 2020); and aspect-based analysis needs labelled data for each domain (Pontiki et al., 2014). Large language models (LLMs) can annotate text better than crowd workers (Gilardi et al., 2023) but match fine-tuned models only on simple sentiment tasks (Zhang et al., 2024), so their advantage cannot be assumed. LLMs also hallucinate, producing statements no source supports (Ji et al., 2023); retrieval-augmented generation (RAG) reduces this by retrieving documents before generating (Lewis et al., 2020), and such systems are evaluated with reference-based metrics or LLM judges (Es et al., 2024), which carry biases that require human validation (Zheng et al., 2023)."),
  ...Label("Table 1", "Critical Comparison of Related Studies"),
  table(["Study", "Approach and data", "Key finding", "Limitation for this problem"], [
    ["Guzman & Maalej (2014)", "Lexicon sentiment and topic models; 7 apps", "Feature-level sentiment is informative", "Lexicon-based; English only"],
    ["Genc-Nayebi & Abran (2017)", "Systematic review of review-mining studies", "Field focuses on whole-review classification", "Predates LLM-based methods"],
    ["Hassan et al. (2018)", "Empirical study of developer replies, Google Play", "Replying is associated with rating increases", "Does not address reply correctness"],
    ["Jain et al. (2023)", "Hybrid aspect-based analysis; Aarogya Setu reviews", "Identifies user-experience factors of one government app", "One app, one period, English only"],
    ["Barbieri et al. (2022)", "Multilingual transformer trained on tweets", "Strong multilingual sentiment baseline", "Not trained on service reviews; no aspects"],
    ["Zhang et al. (2024)", "LLMs vs fine-tuned models across sentiment tasks", "LLMs match fine-tuned models only on simple tasks", "English-centric; no government domain"],
    ["Lewis et al. (2020)", "Retrieval-augmented generation", "Retrieval improves factual accuracy", "Generic corpora; not citizen-facing replies"],
    ["Zheng et al. (2023)", "LLM-as-judge evaluation", "Judges agree with humans above 80%", "Bias requires human validation"],
  ], [1900, 2600, 2400, 2460]),
  Blank(),
  P("**Research gap.** No study has (a) compared an LLM agent with lexicon and fine-tuned baselines for aspect-level analysis of citizen feedback across several Indian digital public services, using comparable collection periods, multilingual text and independently validated labels, or (b) tested experimentally whether grounding replies in the agencies' own published responses reduces unsupported claims in a government setting. This study addresses both gaps with open-weight models, so that the work can be reproduced."),
  H2("Problem Statement"),
  P("Government agencies running India's digital public services receive far more citizen feedback than they can read, so they cannot see which service aspects are failing or respond reliably. In a pilot collection of 32,000 public Google Play reviews of eight government apps, the share of reviews that received an official reply ranged from 0% to 98.7%, and most replies were templates. The consequences fall on three groups. Citizens who cannot log in, fetch a document or recover a failed payment receive no answer or a generic one, and any automated reply that invents a helpline or procedure misleads them further. Agency product and grievance teams cannot prioritise engineering work because star ratings show that users are unhappy but not why. Policy makers lack evidence on which categories of public service underperform. This study therefore tests whether an AI agent can turn this feedback into accurate, validated insight and replies that are grounded in official guidance. The problem is measured through four outcomes: the association between the service aspect a review discusses and whether it is negative; the difference in mean star rating across five service categories; the change in factual groundedness of a drafted reply when official guidance is supplied; and the agent's sentiment classification error rate relative to two established baselines. The study does not claim that complaints are resolved, only that they are analysed and that draft replies are accurate. Table 2 summarises the stakeholders and Table 3 the variables."),
  ...Label("Table 2", "Stakeholders, Consequences of the Problem and Expected Benefit"),
  table(["Stakeholder", "Role", "Consequence today", "Expected benefit"], [
    ["Agency product teams (NeGD, UIDAI, NPCI, NHA, NIC, CRIS)", "Decide what to fix", "Priorities set without evidence of which aspect fails", "Aspect-level evidence of failure (RQ1)"],
    ["Grievance and support teams", "Answer citizens", "Cannot read or answer most reviews; template replies", "Triage plus grounded draft replies for human approval (RQ3)"],
    ["Citizens", "Use the services", "Unanswered or generic replies; risk of incorrect advice", "Faster, accurate answers; fewer invented details"],
    ["Policy makers (MeitY)", "Allocate investment", "No cross-service comparison of satisfaction", "Comparison across service categories (RQ2)"],
  ], [2600, 1600, 2600, 2560]),
  Note("NeGD = National e-Governance Division; UIDAI = Unique Identification Authority of India; NPCI = National Payments Corporation of India; NHA = National Health Authority; NIC = National Informatics Centre; CRIS = Centre for Railway Information Systems; MeitY = Ministry of Electronics and Information Technology."),
  Blank(),
  ...Label("Table 3", "Dependent and Independent Variables by Research Question"),
  table(["RQ", "Independent variable", "Dependent variable", "Unit of analysis"], [
    ["RQ1", "Primary service aspect (nominal, 10 levels)", "Negative sentiment toward that aspect (binary: yes/no)", "One review"],
    ["RQ2", "Service category (nominal, 5 levels)", "Star rating (ordinal, 1–5)", "One review"],
    ["RQ3", "Retrieval condition (within-subject: RAG vs. no RAG)", "Groundedness score (1–5); unsupported claims (count)", "One complaint, answered twice"],
    ["RQ4", "Classifier (agent, VADER, XLM-R)", "Correct sentiment classification (binary) against human reference labels", "One review, classified by all three"],
  ], [800, 2900, 3660, 2000]),
  Blank(),
  H2("Purpose of the Study"),
  P("The purpose is to build and evaluate an agentic LLM pipeline for citizen feedback using open-weight models. It has four objectives, each answered by one research question: **O1**, explain which service aspects drive negative feedback (RQ1); **O2**, compare citizen satisfaction across categories of public service (RQ2); **O3**, test whether grounding replies in official guidance reduces unsupported claims (RQ3); and **O4**, establish whether the agent classifies feedback more accurately than a lexicon baseline (VADER; Hutto & Gilbert, 2014) and a fine-tuned multilingual transformer, XLM-RoBERTa (XLM-R; Barbieri et al., 2022) (RQ4). The study analyses and drafts; it does not send replies or measure whether complaints are resolved."),
];

// ---------------------------------------------------------------------------------- scope
const scope = [
  H1("Scope and Objectives"),
  P("The four research questions follow directly from the four objectives. Each has a null and an alternative hypothesis, is tested at α = .05, and has a measurable success target defined in advance (Table 4)."),
  H2("Research Question 1 (RQ1)"),
  P("Is negative sentiment associated with the service aspect a review discusses (for example login and OTP, server downtime, payments, documents or usability)?"),
  P("*H*₀: Negativity is independent of the aspect discussed. *H*₁: Negativity is associated with the aspect discussed."),
  H2("Research Question 2 (RQ2)"),
  P("Does citizen satisfaction, measured by star rating, differ across the five service categories (citizen services, identity and documents, payments, health and transport) within the same collection period?"),
  P("*H*₀: Mean satisfaction is equal across all five categories (μ₁ = μ₂ = μ₃ = μ₄ = μ₅). *H*₁: At least one category mean differs."),
  H2("Research Question 3 (RQ3)"),
  P("Does grounding the agent's reply in retrieved, verified official guidance (RAG) improve its factual groundedness compared with the same model replying without retrieval?"),
  P("*H*₀: The mean paired difference in groundedness (RAG minus no RAG) is zero (μ_D = 0). *H*₁: The mean paired difference is not zero (μ_D ≠ 0)."),
  H2("Research Question 4 (RQ4)"),
  P("Does the AI agent classify review sentiment (negative, neutral or positive) more accurately than a lexicon tool (VADER) and a fine-tuned multilingual model (XLM-R), measured against labels from independent human reviewers?"),
  P("*H*₀: The agent and each baseline have equal error rates on the same reviews. *H*₁: Their error rates differ."),
  H2("Alignment and Success Criteria"),
  P("Table 4 links each part of the problem to its objective, research question, method and success target. Targets were set before analysis so that success is judged against them rather than against whatever results appear; results below target are still reported."),
  ...Label("Table 4", "Alignment of Problem, Objectives, Research Questions, Methods and Success Targets"),
  table(["Problem component", "Objective / RQ", "Method", "Measurable success target"], [
    ["Teams cannot see which aspect fails", "O1 / RQ1", "Chi-square test, Cramér's V, logistic regression; agent aspect labels validated by human reviewers", "Agent aspect accuracy ≥ 0.80 against reviewers; effect reported as practically meaningful if V ≥ 0.10"],
    ["No cross-service evidence for policy", "O2 / RQ2", "Welch analysis of variance (ANOVA), Kruskal-Wallis test and Tukey honestly significant difference (HSD) on a common 12-month window", "Effect reported as practically meaningful if η² ≥ 0.01"],
    ["Automated replies may invent facts", "O3 / RQ3", "Within-subject RAG vs. no-RAG experiment; paired t-test; blind judge validated by humans; audited guidance", "RAG groundedness mean ≥ 4.0 of 5; ≥ 70% of RAG replies with no unsupported claim; retrieval precision@4 ≥ 0.70; judge-human weighted κ ≥ 0.60"],
    ["Unclear whether an LLM agent beats cheaper methods", "O4 / RQ4", "McNemar's test and bootstrap confidence interval against human-reviewed labels, by language", "Agent macro-F1 ≥ 0.75; reviewer agreement κ ≥ 0.70; agent no worse than XLM-R by more than 0.05 macro-F1"],
  ], [2300, 1100, 3060, 2900]),
  Blank(),
  H2("Scope and Boundaries"),
  P("**In scope:** public Google Play reviews of eight central-government apps in five service categories, collected for the same 12-month window (October 1, 2025 to September 30, 2026) from both the English and the Hindi store listings; classification of sentiment, aspect, severity and language; drafting of replies with routing to a team; and statistical testing of the four questions. **Out of scope:** private grievance records (such as cases in the Centralised Public Grievance Redress and Monitoring System, CPGRAMS), iOS App Store reviews, sending replies to citizens, measuring whether complaints are resolved, model fine-tuning, and causal claims about why services fail. Twitter/X was considered and rejected: read access now requires a paid tier with limited history, and its terms prohibit republishing tweet text, which conflicts with the requirement to share the complete dataset."),
  H2("Feasibility and Timeline"),
  P("The project is feasible within the ten teaching weeks of the course. Both the pilot and the common-window collections are complete, all code runs on a laptop processor, and the LLMs run on the free tier of Groq, which allows about 200,000 tokens per model per day (roughly 300 reviews), so the batch analysis is spread across Weeks 2 to 6 and resumes automatically after each daily limit. The human labelling needs a second, independent reviewer for about four hours in Weeks 3 to 5. Table 5 aligns the activities with the weekly topics and assignments of the course."),
  ...Label("Table 5", "Ten-Week Project Plan Aligned to the Course Schedule"),
  table(["Week", "Course topic", "Project activities", "Deliverable"], [
    ["1", "Define the research problem and topic", "Select the domain and problem; state the problem, purpose and four research questions; confirm data availability; sample-size calculation", "Synopsis draft (Oct 6)"],
    ["2", "Literature search and data collection", "Critical literature review; re-collect reviews for a common 12-month window from English and Hindi listings; data dictionary; start agent batch analysis", "Synopsis final (Oct 13)"],
    ["3", "Formulate objectives and research questions/hypotheses", "Finalise objectives, hypotheses, success targets and variables after mentor feedback; draw the language-stratified reference set; reviewers begin independent labelling", "Approved research questions and targets"],
    ["4", "Choose a research design and methodology", "Fix techniques: LLM classification against lexicon and transformer baselines with a confusion matrix and McNemar's test; chi-square and logistic regression; ANOVA; within-subject experiment with a control (no RAG) and an experimental (RAG) condition; audit of the reference guidance", "Research design, pipeline and verified guidance"],
    ["5", "Data analysis plan", "Document tests, assumptions, effect sizes and targets for each question; exploratory data analysis (EDA); complete reviewer labelling and agreement statistics", "Data analysis plan, EDA and labelled reference set"],
    ["6", "Data analysis plan execution", "Complete batch analysis and baselines; execute RQ1 and RQ2; run the RQ3 experiment on 100 complaints with retrieval-relevance ratings", "Interim report draft (ungraded)"],
    ["7", "Data analysis assessment", "Assess results against targets: assumptions, confidence intervals, effect sizes; execute RQ4; validate the RQ3 judge against 30 human-rated pairs", "Results assessed against success targets"],
    ["8", "Data analysis refinement and project documentation", "Robustness checks, language sub-analysis, limitations; document methods, figures and tables; verify the repository reproduces the results", "Interim report (Assignment 2)"],
    ["9", "Document research results and findings", "Write up results and implications for each stakeholder; prepare slides and the live demonstration", "Final presentation (Assignment 3)"],
    ["10", "Refine documentation of results and findings", "Refine the final report in APA format; final proofreading and similarity check", "Final report draft (ungraded); final report in Week 11 (Assignment 4)"],
  ], [700, 2000, 4660, 2000]),
  Blank(),
];

// ---------------------------------------------------------------------------------- sample size
const sample = [
  H1("Sample Size Calculation"),
  P("Minimum sample sizes were determined a priori for each research question, using the method that matches its test. All power analyses use a two-sided significance level of \u03b1 = .05 and power (1 \u2212 \u03b2) = .80, with z\u2081\u208b\u03b1/\u2082 = 1.960 and z\u2081\u208b\u03b2 = 0.842. Where no prior estimate of the effect existed, Cohen's (1988) conventional small effect sizes were used, which is the conservative choice because smaller effects require larger samples. Table 6 summarises the result; the stepwise calculations follow."),
  ...Label("Table 6", "Sample Size Method, Parameters and Minimum N by Research Question"),
  table(["Research Question", "Method Used", "Key Parameters", "Minimum Sample Size (N)"], [
    ["RQ1", "Power analysis for a chi-square test of independence", "\u03b1 = .05, Power = .80, Effect size *w* = 0.10, df = 9", "1,565"],
    ["RQ2", "Power analysis for one-way ANOVA", "\u03b1 = .05, Power = .80, Effect size *f* = 0.10, *k* = 5", "1,199"],
    ["RQ3", "Power analysis for a paired *t*-test", "\u03b1 = .05, Power = .80, Effect size *d*z = 0.30", "90"],
    ["RQ4", "Power analysis for McNemar's test; confidence interval for accuracy", "\u03b1 = .05, Power = .80, \u03c8 = 0.20, \u03b4 = 0.08 / Z = 1.96, e = 0.05, p = 0.50", "385 (larger of 243 and 385)"],
  ], [1500, 2900, 3160, 1800]),
  Note("Computed with SciPy noncentral distributions in analysis/sample_size.py; automated tests confirm each value."),
  Blank(),
  H2("RQ1: Chi-Square Test of Independence"),
  P("*Justification.* RQ1 relates two categorical variables (10 aspects by negative or not), so the chi-square test applies, with degrees of freedom df = (10 \u2212 1)(2 \u2212 1) = 9. *Step 1.* The critical value is \u03c7\u00b2(.95, 9) = 16.919. *Step 2.* Under the alternative hypothesis the statistic follows a noncentral chi-square distribution with noncentrality \u03bb = *n* \u00d7 *w*\u00b2. Solving P[\u03c7\u00b2(9, \u03bb) > 16.919] = .80 gives \u03bb = 15.65. *Step 3.* With a small effect, *w* = 0.10:"),
  Eq("n = \u03bb / w\u00b2 = 15.65 / (0.10)\u00b2 = 15.65 / 0.01 = 1,565"),
  P("Check: *n* = 1,564 gives power .7997 and *n* = 1,565 gives .8000, so the minimum is **1,565** reviews that name an aspect."),
  H2("RQ2: One-Way Analysis of Variance"),
  P("*Justification.* RQ2 compares a numeric outcome across *k* = 5 independent groups, so one-way ANOVA applies, with numerator df = *k* \u2212 1 = 4. *Step 1.* The statistic follows a noncentral *F* distribution with \u03bb = *n* \u00d7 *f*\u00b2. *Step 2.* With a small effect, *f* = 0.10, the required noncentrality for power .80 at \u03b1 = .05 is \u03bb = 11.99 (critical *F*(4, 1194) = 2.379). *Step 3.*"),
  Eq("n = \u03bb / f\u00b2 = 11.99 / (0.10)\u00b2 = 11.99 / 0.01 = 1,199"),
  P("Check: *n* = 1,198 gives power .7999 and *n* = 1,199 gives .8003, so the minimum is **1,199** reviews in total (about 240 per category)."),
  H2("RQ3: Paired t-Test"),
  P("*Justification.* RQ3 measures the same complaints under two conditions, so the paired *t*-test applies. A small-to-medium standardised difference, *d*z = 0.30, was chosen as the smallest effect that would matter in practice. *Step 1.* Normal approximation with a small-sample correction:"),
  Eq("n = [(z\u2081\u208b\u03b1/\u2082 + z\u2081\u208b\u03b2) / d]\u00b2 + z\u00b2\u2081\u208b\u03b1/\u2082 / 2 = [(1.960 + 0.842) / 0.30]\u00b2 + (1.960)\u00b2 / 2 = 87.21 + 1.92 = 89.13"),
  P("*Step 2.* Rounding up gives 90. Check with the exact noncentral *t* distribution: *n* = 89 gives power .7993 and *n* = 90 gives .8038, so the minimum is **90** complaint pairs."),
  H2("RQ4: McNemar's Test and Confidence Interval"),
  P("*Justification.* RQ4 compares two classifiers on the same reviews (paired binary outcomes: correct or incorrect), so McNemar's test applies, and Connor's (1987) formula gives its sample size. The parameters are the expected proportion of discordant pairs, \u03c8 = 0.20, and the expected difference between the two discordant proportions, \u03b4 = 0.08. *Step 1.*"),
  Eq("n = [z\u2081\u208b\u03b1/\u2082\u221a\u03c8 + z\u2081\u208b\u03b2\u221a(\u03c8 \u2212 \u03b4\u00b2)]\u00b2 / \u03b4\u00b2 = [1.960\u221a0.20 + 0.842\u221a(0.20 \u2212 0.0064)]\u00b2 / 0.0064"),
  Eq("= (0.8765 + 0.3703)\u00b2 / 0.0064 = 1.5546 / 0.0064 = 242.9 \u2192 243"),
  P("*Step 2.* Because RQ4 also reports each classifier's accuracy, the reference set must estimate a proportion within \u00b15 percentage points at 95% confidence. Using the most conservative proportion, *p* = 0.50:"),
  Eq("n = Z\u00b2 p(1 \u2212 p) / e\u00b2 = (1.96)\u00b2 \u00d7 0.50 \u00d7 0.50 / (0.05)\u00b2 = 0.9604 / 0.0025 = 384.2 \u2192 385"),
  P("*Step 3.* RQ4 must satisfy both requirements, so its minimum is the larger value, **385** labelled reviews."),
  H2("Final Sample Size Decision"),
  P("To ensure adequate power across all analyses, the final sample size is the maximum of the minimum sample sizes: **N = max(1,565, 1,199, 90, 385) = 1,565**, set by RQ1. The study therefore uses a stratified random sample of **2,000 reviews** from the common-window dataset: 250 per app, each at least five words long (random seed 42), except Aarogya Setu, which has only 199 such reviews in the window and contributes all of them, with the shortfall of 51 spread evenly across the other apps. In the pilot, 83% of analysed reviews (777 of 937) named at least one aspect, so about 1,660 of the 2,000 are expected to enter the RQ1 test, which meets the 1,565 required; if fewer qualify, the sample is extended until 1,565 is reached. Within this design, RQ2 uses every review in the common-window dataset (far above 1,199), RQ3 uses 100 complaints (above 90, allowing for failed runs), and RQ4 uses the 400-review language-stratified reference set (above 385)."),
];

// ---------------------------------------------------------------------------------- data
const data = [
  H1("Data Description"),
  H2("Data Source and Access"),
  P("The data are public Google Play reviews of eight Government of India apps, collected with the open-source google-play-scraper package. A pilot collection on September 27, 2026 took the newest 4,000 reviews per app (32,000 in total) and was used to build and test the pipeline. It revealed a problem of comparability: the newest 4,000 reviews covered eight days for IRCTC Rail Connect but almost four years for Aarogya Setu (Table 7), so differences between apps could reflect time rather than service. The final dataset therefore observes every app over the same 12-month window, October 1, 2025 to September 30, 2026, collected from both the English and the Hindi listings of the India store to widen language coverage; apps with more than 5,000 reviews in the window are randomly sampled down to 5,000 (seed 42), and each app's sampling fraction is reported. This collection was completed on October 13, 2026. The official replies published with the reviews form the retrieval knowledge base. No Kaggle data and no synthetic data are used. The source pages are:"),
  Bullet("UMANG: https://play.google.com/store/apps/details?id=in.gov.umang.negd.g2c"),
  Bullet("DigiLocker: https://play.google.com/store/apps/details?id=com.digilocker.android"),
  Bullet("mAadhaar: https://play.google.com/store/apps/details?id=in.gov.uidai.mAadhaarPlus"),
  Bullet("BHIM: https://play.google.com/store/apps/details?id=in.org.npci.upiapp"),
  Bullet("Aarogya Setu: https://play.google.com/store/apps/details?id=nic.goi.aarogyasetu"),
  Bullet("ABHA: https://play.google.com/store/apps/details?id=in.ndhm.phr"),
  Bullet("mParivahan: https://play.google.com/store/apps/details?id=com.nic.mparivahan"),
  Bullet("IRCTC Rail Connect: https://play.google.com/store/apps/details?id=cris.org.in.prs.ima"),
  P(`The complete dataset, code, prompts and results are openly available at **${REPO}**. The repository README gives setup and run instructions: install the requirements, add a free Groq key, then run the collection, knowledge-base, analysis and statistics scripts in order. Each script is one command, and automated tests verify the sample-size values, the retrieval safety rules and the service interface.`),
  H2("Dataset Overview"),
  P("The common-window dataset contains 35,294 reviews dated from October 1, 2025 to September 30, 2026 (Table 7). Five apps received more than 5,000 reviews in the window and were randomly sampled down to 5,000; mAadhaar and Aarogya Setu were kept in full. Ratings are polarised: most reviews give one or five stars (Figure 1). 64.9% of reviews are shorter than five words (for example \u201cgood\u201d) and are excluded from the study sample because they name no aspect, leaving 12,370 eligible reviews. Rating is negatively correlated with review length (Spearman \u03c1 = \u2212.57), so dissatisfied citizens write more. 43.7% of reviews carry an official reply, ranging from almost none for ABHA to every review for UMANG. Only 1.8% of reviews are written in Devanagari script even with the Hindi listing included, and Hinglish written in Latin script adds further non-English text, which is why the reference set is stratified by language."),
  ...Label("Table 7", "Reviews per App: Pilot Coverage and the Common 12-Month Window"),
  table(["App", "Pilot: days covered", "Reviews in window", "Kept (fraction)", "Eligible (\u2265 5 words)", "Mean rating", "Official reply rate"], [
    ["UMANG", "52", "165,986", "5,000 (3.0%)", "401", "4.44", "100.0%"],
    ["DigiLocker", "130", "11,352", "5,000 (44.0%)", "1,883", "3.71", "46.6%"],
    ["mAadhaar", "335", "4,720", "4,720 (100%)", "1,724", "3.48", "0.3%"],
    ["BHIM", "49", "41,142", "5,000 (12.2%)", "2,634", "3.35", "62.8%"],
    ["Aarogya Setu", "1,355", "574", "574 (100%)", "199", "3.52", "5.7%"],
    ["ABHA", "80", "16,366", "5,000 (30.6%)", "416", "4.39", "0.1%"],
    ["mParivahan", "67", "14,993", "5,000 (33.3%)", "2,740", "2.32", "93.9%"],
    ["IRCTC Rail Connect", "8", "65,790", "5,000 (7.6%)", "2,373", "2.97", "4.3%"],
  ], [1700, 1150, 1300, 1450, 1300, 1100, 1360]),
  Note("Window: October 1, 2025 to September 30, 2026, English and Hindi listings combined. The pilot column shows how many days the newest 4,000 reviews covered in the first collection, which motivated the common window."),
  Blank(),
  ...Label("Figure 1", "Distribution of Star Ratings by App, Common 12-Month Window"),
  image(path.join(PROJ, "reports/figures/eda_rating_distribution.png"), 5.6),
  Note("Share of each app's reviews in the window at each star rating, sorted by the share of one- and two-star reviews."),
  H2("Data Dictionary"),
  ...Label("Table 8", "Data Dictionary: Variables, Types, Units, Roles and Relevance"),
  table(["Variable", "Type", "Units / values", "Role", "Meaning and relevance"], [
    ["review_id", "String", "UUID", "Key", "Unique Google Play review identifier; links all files"],
    ["app_name", "Nominal (8)", "UMANG … IRCTC Rail Connect", "Stratum", "App reviewed; sampling is stratified by app"],
    ["service_category", "Nominal (5)", "Citizen services, identity/documents, payments, health, transport", "IV (RQ2)", "Service type assigned to each app"],
    ["text", "String", "Characters (≤ 500)", "Input", "Review text as written; input to all classifiers"],
    ["rating", "Ordinal", "Stars, 1–5", "DV (RQ2)", "Citizen's satisfaction rating"],
    ["thumbs_up", "Integer", "Count of votes", "Descriptive", "Helpful votes from other users"],
    ["review_date", "Datetime", "ISO 8601 date-time", "Filter", "When the review was posted; must fall in the common window"],
    ["dev_reply", "String", "Text", "Knowledge base", "Official reply from the app's government team"],
    ["primary_aspect", "Nominal (10)", "Login/OTP, downtime, usability, Aadhaar/KYC, payments, documents, support, privacy, update bugs, other", "IV (RQ1)", "Main service aspect discussed (agent output, validated by reviewers)"],
    ["primary_negative", "Binary", "Yes / no", "DV (RQ1)", "Whether that aspect is discussed negatively"],
    ["overall_sentiment", "Nominal (3)", "Negative, neutral, positive", "Prediction (RQ4)", "Label from the agent, VADER or XLM-R"],
    ["label_sentiment", "Nominal (3)", "Negative, neutral, positive", "Reference (RQ4)", "Settled label from two independent human reviewers"],
    ["label_aspect", "Nominal (10)", "As primary_aspect", "Reference (RQ1)", "Reviewers' settled primary aspect, used to validate the agent"],
    ["language", "Nominal (5)", "English, Hinglish, Hindi, other Indian, other", "Stratum (RQ4)", "Language and script of the review"],
    ["condition", "Nominal (2)", "RAG / no RAG", "IV (RQ3)", "Whether verified guidance was supplied to the responder"],
    ["groundedness", "Ordinal", "Score, 1–5", "DV (RQ3)", "Support of the reply's specific facts by official guidance"],
    ["unsupported_claims", "Integer", "Count per reply", "DV (RQ3)", "Specific facts not supported by official guidance"],
    ["retrieved_relevant", "Binary", "Yes / no per retrieved item", "Validation (RQ3)", "Reviewer's judgement of retrieval relevance"],
  ], [1750, 1150, 2260, 1250, 2950]),
  Note("IV = independent variable; DV = dependent variable. The full dictionary for every file is in docs/data_dictionary.md in the repository."),
  H2("Repository Structure"),
  Mono("digital-india-agent/"),
  Mono("├── scraper/     Google Play collection (common-window collector)"),
  Mono("├── rag/         knowledge-base builder and retriever"),
  Mono("├── agent/       Google ADK graph workflow and output schemas"),
  Mono("├── api/         FastAPI service"),
  Mono("├── frontend/    React web application"),
  Mono("├── analysis/    sampling, baselines, sample size, EDA, RAG experiment, statistical tests"),
  Mono("├── data/        raw/ (window and pilot collections), processed/, kb_index/"),
  Mono("├── reports/     figures/ and tables/ generated by the analysis scripts"),
  Mono("├── docs/        data dictionary and labelling guidelines"),
  Mono("└── tests/       automated tests", true),
  Blank(),
  H2("Ethical Considerations and Limitations"),
  P("**Privacy.** Only public review text is used. Reviewer usernames and profile images are never collected, and names that officials repeat in their replies are replaced with “User” before the knowledge base is built. The only data sent to the hosted models is the public review text. **Bias.** Reviewers are self-selected and are not a representative sample of citizens, so results describe feedback, not public opinion; smartphone users and English writers are over-represented, which the language-stratified reference set partly offsets. LLMs can carry their own biases, so ground-truth labels come from human reviewers, the reply checker and judge come from a different model family than the responder, and the judge is validated against human ratings. **Limitations.** A common window removes differences in collection period, but apps still differ in review volume, so high-volume apps are sampled and the sampling fraction is reported. Official replies are scarce for some apps, which limits what retrieval can supply; the guidance audit removes unverifiable entries rather than filling gaps. Hosted models can change, so model identifiers and dates are recorded."),
];

// ---------------------------------------------------------------------------------- approach
const approach = [
  H1("Analytic Approach"),
  H2("Solution Pipeline"),
  P("The solution is one reproducible pipeline from data preparation to evaluation (Figure 2 and Table 9). *Data preparation* collects the reviews for the common window, removes names, draws the stratified samples and builds the knowledge base of official replies. *Modelling* is an agent built as a graph workflow: an analyzer model labels sentiment, aspects, severity and language as structured output; a routing step passes only actionable complaints onward; a retrieval step fetches up to four items of verified official guidance for the same app; a responder model drafts a reply that may use contact details only from that guidance; and a checker model from a different family rejects unsupported drafts, allowing one redraft before the case is flagged for a person. *Validation* checks the labels and the guidance with independent human reviewers. *Evaluation* runs the same agent in batch and tests the four research questions against their targets. Reproducibility rests on fixed random seeds, temperature 0, pinned model identifiers, automated tests and the public repository."),
  P("**Data preparation steps.** (1) Collect every review in the window from the English and Hindi listings and remove duplicates by review identifier. (2) Drop reviews with empty text; missing app versions, which no test uses, are left as missing. (3) Detect script and flag reviews shorter than five words, which are excluded from the study sample but kept for RQ2. (4) Replace reviewer names in official replies with \u201cUser\u201d and pair each reply with the complaint it answered. (5) Encode categorical variables (app, category, aspect, sentiment) as labelled categories and ratings as integers. (6) Draw the stratified study sample and the language-stratified reference set with a fixed seed. **Reproducing the results.** After installing the requirements, the pipeline runs with seven commands documented in the repository README: collection (scraper.window_scraper), knowledge base (rag.build_kb), sampling (analysis.sampling), agent batch analysis (analysis.run_analyzer), baselines (analysis.baselines), the RAG experiment (analysis.rq4_rag_ablation) and the statistical tests (analysis.stats_tests), which regenerate every table and figure."),
  ...Label("Figure 2", "End-to-End Solution Pipeline"),
  image(path.join(HERE, "arch.png"), 6.3),
  Note("All language models are open-weight and served by Groq. The research layer runs the same agent code as the application."),
  Blank(),
  ...Label("Table 9", "Tools Used at Each Pipeline Stage"),
  table(["Stage", "Tools", "Expected outcome"], [
    ["Data preparation", "Python, google-play-scraper, pandas", "Common-window dataset; stratified study sample and reference set"],
    ["Knowledge base (RAG)", "fastembed (multilingual MiniLM, 384 dimensions), NumPy cosine search", "Index of official replies with verified contact details, searchable by app"],
    ["Agent", "Google Agent Development Kit 2.x; Groq models gpt-oss-20b, gpt-oss-120b, qwen3.8-27b", "Structured labels and a checked, cited draft reply per review"],
    ["Baselines", "VADER; XLM-RoBERTa (Hugging Face transformers)", "Comparison labels for RQ4"],
    ["Validation", "Excel labelling sheets with fixed options; scikit-learn agreement statistics", "Human reference labels, agreement (κ), retrieval precision"],
    ["Statistics", "SciPy, statsmodels, scikit-learn, matplotlib", "Test results, effect sizes, tables and figures"],
    ["Application", "FastAPI, React", "Web interface for single reviews and live results"],
  ], [1900, 3900, 3560]),
  Blank(),
  H2("Validation of Labels and Reference Guidance"),
  P("**Reference labels.** A 400-review reference set is drawn from the study sample, stratified by language so that non-English text is adequately covered: 200 English reviews and 200 Hindi, Hinglish or other Indian-language reviews (or all available, if fewer). Two human reviewers, the researcher and a second, independent reviewer, label every review for sentiment, primary aspect and language, working separately and without seeing star ratings or any model output. Agreement is reported as Cohen's κ for sentiment and for aspect, with a target of κ ≥ 0.70; disagreements are settled by a joint second reading, and the settled label is the ground truth. Labels generated by an LLM are not used as ground truth, which removes the risk that an LLM-written answer key favours the LLM agent. **Reference guidance.** The knowledge base of official replies is audited before the RQ3 experiment: every email address, telephone number and web address in it is checked against the agency's official website, and entries that are outdated or cannot be verified are removed. During the experiment a reviewer rates whether each retrieved item is relevant to the complaint, giving retrieval precision at four (target ≥ 0.70)."),
  H2("Solution to RQ1"),
  P("**Method and justification.** A chi-square test of independence between the primary aspect and negativity, because both variables are categorical. Cramér's *V* gives the strength of association and standardised residuals show which aspects drive it. A logistic regression of negativity on indicators for every aspect mentioned provides odds ratios as a robustness check. Because the aspect labels come from the agent, their validity is measured first: the agent's primary aspect is compared with the reviewers' settled label on the reference set (target accuracy ≥ 0.80). **Assumptions.** Observations are independent, secured by using one review and its first-listed aspect as the unit; expected cell counts are at least five, so sparse aspects are reported descriptively. **Outputs.** χ², df, *p*, Cramér's *V*, a residual table, odds ratios with 95% confidence intervals, aspect-label accuracy and a chart of the negative share by aspect."),
  H2("Solution to RQ2"),
  P("**Method and justification.** One-way ANOVA of star rating on service category, because one numeric outcome is compared across five independent groups, with Tukey HSD for pairwise differences and η² as the effect size. All categories are drawn from the same 12-month window, so differences cannot be explained by apps being observed over different periods. **Assumptions.** Independence of reviews; equal variances, checked and addressed with Welch's ANOVA; and approximate normality, which polarised ordinal ratings violate, so the Kruskal-Wallis test is reported as a rank-based check. With a large sample almost any difference is significant, so interpretation rests on η². **Outputs.** *F*, *p*, η², Kruskal-Wallis *H*, a Tukey table and a chart of category means with 95% confidence intervals."),
  H2("Solution to RQ3"),
  P("**Method and justification.** A within-subjects experiment on 100 actionable complaints from all eight apps. The same responder (identical prompt, model and temperature 0) drafts each reply twice: in the experimental condition with the retrieved, audited guidance and in the control condition without it, so each complaint is its own control and a paired *t*-test applies. A judge model from a different family, blind to the condition, scores both drafts against the same official reference for groundedness, helpfulness and unsupported claims, following reference-based evaluation of retrieval systems (Es et al., 2024). The official reply to the complaint itself is excluded from retrieval to prevent leakage. **Assumptions.** Pairs are independent of each other; paired differences are approximately normal, which the Wilcoxon signed-rank test checks without that assumption; and the judge is valid, which is tested because LLM judges can be biased (Zheng et al., 2023): both reviewers rate 30 pairs blind and in random order, and judge-human agreement is reported as quadratic-weighted κ (target ≥ 0.60). **Outputs.** Mean difference, *t*, *p*, Cohen's *d*z, McNemar's test on replies with at least one unsupported claim, retrieval precision and judge-human agreement, each compared with its target."),
  H2("Solution to RQ4"),
  P("**Method and justification.** The agent, VADER and XLM-R classify the same 400 reference reviews, so McNemar's test on paired correct or incorrect decisions applies, with Holm correction for the two comparisons and a bootstrap 95% confidence interval for the difference in macro-F1. Macro-F1 is the primary metric because classes are imbalanced. Ground truth is the reviewers' settled label. Because the reference set is stratified by language, results are reported separately for English and non-English text, which tests where each method fails. **Assumptions.** Paired nominal outcomes on the same items and enough discordant pairs for the chi-square approximation. **Outputs.** Accuracy, macro-F1, Cohen's κ, a confusion matrix, McNemar χ² and *p*, the bootstrap interval, and results by language, each compared with its target."),
  H2("Evaluation Metrics and Worked Calculations"),
  P("For classification, with TP, FP and FN the true positives, false positives and false negatives of class *c*:"),
  Eq("Precision_c = TP_c / (TP_c + FP_c)          Recall_c = TP_c / (TP_c + FN_c)"),
  Eq("F1_c = 2 × Precision_c × Recall_c / (Precision_c + Recall_c)          Macro-F1 = (F1_neg + F1_neu + F1_pos) / 3"),
  Eq("Cohen's κ = (p_o − p_e) / (1 − p_e)          Retrieval precision@4 = relevant items retrieved / items retrieved"),
  P("The test statistics and effect sizes are given below, each with a worked calculation from a pilot run of the pipeline on the initial collection (the newest 4,000 reviews per app). The pilot demonstrates feasibility; its values are provisional, and the pilot labels for RQ4 were produced by an LLM, which is why the final design replaces them with human reviewers."),
  Eq("McNemar: χ² = (|b − c| − 1)² / (b + c)"),
  P("where *b* and *c* count the reviews only one classifier gets right. Pilot, agent versus VADER: *b* = 166, *c* = 15, so χ² = (|166 − 15| − 1)² / 181 = 22,500 / 181 = 124.31, above the critical value of 3.84."),
  Eq("Cramér's V = √[χ² / (n × (min(r, c) − 1))]"),
  P("Pilot for RQ1 on 777 reviews: χ²(9) = 269.32, so *V* = √[269.32 / (777 × 1)] = √0.347 = 0.59, well above the 0.10 threshold."),
  Eq("η² = SS_between / SS_total          Cohen's d_z = mean(D) / SD(D)"),
  P("For RQ2 on the 35,294 common-window reviews: *F*(4, 35289) = 1,412.24 and \u03b7\u00b2 = 0.138, well above the 0.01 threshold. On the pilot collection, where apps covered different periods, \u03b7\u00b2 was only 0.026, which shows how strongly unequal periods had distorted the comparison. Pilot for RQ3 on 100 pairs: mean difference in groundedness 1.05 with standard deviation 1.086, so *d*z = 1.05 / 1.086 = 0.97; the RAG mean of 4.29 met its target, but only 56% of RAG replies had no unsupported claim, short of the 70% target, which the guidance audit is intended to improve."),
];

const reco = [
  H1("Recommendation and Application"),
  P("**Target users.** The primary users are the product and grievance teams of the agencies behind the eight apps: NeGD (UMANG, DigiLocker), UIDAI (mAadhaar), NPCI (BHIM), the National Health Authority (ABHA), and NIC and CRIS (Aarogya Setu, mParivahan, IRCTC Rail Connect). A secondary audience is policy analysts comparing citizen satisfaction across services."),
  P("**Actionable recommendations.** First, use aspect-level results to set engineering priorities: if RQ1 confirms that login and server-availability complaints are almost always negative, authentication and capacity should be fixed before interface work. Second, use RQ2 to direct attention to the lowest-rated service categories. Third, deploy reply drafting only where an agency has published guidance, with a staff member approving each reply, and route all other complaints to people; this is how the agent already behaves. Fourth, agencies with no published replies should publish standard guidance, since the benefit of grounding depends on it. Fifth, adopt the triage outputs (aspect, severity and language) as a daily dashboard so that severe complaints in any language reach the right team. The web application built in this project demonstrates each of these uses."),
  H2("Use of AI Tools"),
  P("An AI assistant (Anthropic, 2026) was used to support programming, to produce provisional labels for the pilot (which the final design replaces with human reviewers), and to help draft and edit this document. The author reviewed all content and is responsible for it."),
];

const refs = [
  PB(),
  H1("References"),
  Ref("Androutsopoulou, A., Karacapilidis, N., Loukis, E., & Charalabidis, Y. (2019). Transforming the communication between citizens and government through AI-guided chatbots. *Government Information Quarterly, 36*(2), 358\u2013367. https://doi.org/10.1016/j.giq.2018.10.001"),
  Ref("Anthropic. (2026). *Claude* (Opus 5.5) [Large language model]. https://claude.ai"),
  Ref("Barbieri, F., Espinosa Anke, L., & Camacho-Collados, J. (2022). XLM-T: Multilingual language models in Twitter for sentiment analysis and beyond. In *Proceedings of the Thirteenth Language Resources and Evaluation Conference* (pp. 258\u2013266). European Language Resources Association. https://aclanthology.org/2022.lrec-1.27/"),
  Ref("Cohen, J. (1988). *Statistical power analysis for the behavioral sciences* (2nd ed.). Lawrence Erlbaum Associates."),
  Ref("Connor, R. J. (1987). Sample size for testing differences in proportions for the paired-sample design. *Biometrics, 43*(1), 207\u2013211. https://doi.org/10.2307/2531961"),
  Ref("Es, S., James, J., Espinosa-Anke, L., & Schockaert, S. (2024). RAGAs: Automated evaluation of retrieval augmented generation. In *Proceedings of the 18th Conference of the European Chapter of the Association for Computational Linguistics: System Demonstrations* (pp. 150\u2013158). Association for Computational Linguistics. https://aclanthology.org/2024.eacl-demo.16/"),
  Ref("Genc-Nayebi, N., & Abran, A. (2017). A systematic literature review: Opinion mining studies from mobile app store user reviews. *Journal of Systems and Software, 125*, 207\u2013219. https://doi.org/10.1016/j.jss.2016.11.027"),
  Ref("Gilardi, F., Alizadeh, M., & Kubli, M. (2023). ChatGPT outperforms crowd workers for text-annotation tasks. *Proceedings of the National Academy of Sciences, 120*(30), Article e2305016120. https://doi.org/10.1073/pnas.2305016120"),
  Ref("Guzman, E., & Maalej, W. (2014). How do users like this feature? A fine grained sentiment analysis of app reviews. In *2014 IEEE 22nd International Requirements Engineering Conference* (pp. 153\u2013162). IEEE. https://doi.org/10.1109/RE.2014.6912257"),
  Ref("Hassan, S., Tantithamthavorn, C., Bezemer, C.-P., & Hassan, A. E. (2018). Studying the dialogue between users and developers of free apps in the Google Play Store. *Empirical Software Engineering, 23*(3), 1275\u20131312. https://doi.org/10.1007/s10664-017-9538-9"),
  Ref("Hutto, C., & Gilbert, E. (2014). VADER: A parsimonious rule-based model for sentiment analysis of social media text. *Proceedings of the International AAAI Conference on Web and Social Media, 8*(1), 216\u2013225. https://ojs.aaai.org/index.php/ICWSM/article/view/14550"),
  Ref("Jain, A., Dey, L., Dasgupta, T., & Naskar, A. (2023). Factors affecting user experience of contact tracing app during COVID-19: An aspect-based sentiment analysis of user-generated review. *Behaviour & Information Technology, 42*(2), 249\u2013264. https://doi.org/10.1080/0144929X.2022.2139758"),
  Ref("Ji, Z., Lee, N., Frieske, R., Yu, T., Su, D., Xu, Y., Ishii, E., Bang, Y. J., Madotto, A., & Fung, P. (2023). Survey of hallucination in natural language generation. *ACM Computing Surveys, 55*(12), 1\u201338. https://doi.org/10.1145/3571730"),
  Ref("Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., K\u00fcttler, H., Lewis, M., Yih, W., Rockt\u00e4schel, T., Riedel, S., & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *Advances in Neural Information Processing Systems, 33*, 9459\u20139474."),
  Ref("Patwa, P., Aguilar, G., Kar, S., Pandey, S., PYKL, S., Gamb\u00e4ck, B., Chakraborty, T., Solorio, T., & Das, A. (2020). SemEval-2020 Task 9: Overview of sentiment analysis of code-mixed tweets. In *Proceedings of the Fourteenth Workshop on Semantic Evaluation* (pp. 774\u2013790). International Committee for Computational Linguistics. https://aclanthology.org/2020.semeval-1.100/"),
  Ref("Pontiki, M., Galanis, D., Pavlopoulos, J., Papageorgiou, H., Androutsopoulos, I., & Manandhar, S. (2014). SemEval-2014 Task 4: Aspect based sentiment analysis. In *Proceedings of the 8th International Workshop on Semantic Evaluation* (pp. 27\u201335). Association for Computational Linguistics. https://aclanthology.org/S14-2004/"),
  Ref("United Nations Department of Economic and Social Affairs. (2024). *E-Government Survey 2024: Accelerating digital transformation for sustainable development*. United Nations. https://publicadministration.un.org/egovkb/en-us/Reports/UN-E-Government-Survey-2024"),
  Ref("Zhang, W., Deng, Y., Liu, B., Pan, S., & Bing, L. (2024). Sentiment analysis in the era of large language models: A reality check. In *Findings of the Association for Computational Linguistics: NAACL 2024* (pp. 3881\u20133906). Association for Computational Linguistics. https://aclanthology.org/2024.findings-naacl.246/"),
  Ref("Zheng, L., Chiang, W.-L., Sheng, Y., Zhuang, S., Wu, Z., Zhuang, Y., Lin, Z., Li, Z., Li, D., Xing, E. P., Zhang, H., Gonzalez, J. E., & Stoica, I. (2023). Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. *Advances in Neural Information Processing Systems, 36*. https://arxiv.org/abs/2306.05685"),
];

const hStyle = (id, name, run, paragraph) => ({ id, name, basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: SIZE, color: "000000", ...run }, paragraph: { spacing: DOUBLE, keepNext: true, ...paragraph } });

const doc = new Document({
  creator: "Rohan Mani John",
  title: "QM640 Synopsis",
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: SIZE } } },
    paragraphStyles: [
      hStyle("Heading1", "Heading 1", { bold: true }, { alignment: AlignmentType.CENTER, outlineLevel: 0 }),
      hStyle("Heading2", "Heading 2", { bold: true }, { alignment: AlignmentType.LEFT, outlineLevel: 1 }),
      hStyle("Heading3", "Heading 3", { bold: true, italics: true }, { alignment: AlignmentType.LEFT, outlineLevel: 2 }),
      // contents entries single-spaced so the list (and its closing field paragraph) stays on one page
      { id: "TOC1", name: "toc 1", basedOn: "Normal", next: "Normal", run: { font: FONT, size: SIZE }, paragraph: { spacing: { line: 240, lineRule: LineRuleType.AUTO, before: 0, after: 0 } } },
      { id: "TOC2", name: "toc 2", basedOn: "Normal", next: "Normal", run: { font: FONT, size: SIZE }, paragraph: { spacing: { line: 240, lineRule: LineRuleType.AUTO, before: 0, after: 0 }, indent: { left: 360 } } },
    ],
  },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: "bullet", text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SIZE })] })] }) },
    children: [...titlePage, ...contents, ...intro, ...scope, ...sample, ...data, ...approach, ...reco, ...refs],
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT, buf.length, "bytes"); });
