# Literature Review: Working Draft

Every reference below was checked against its publisher, ACL Anthology, PubMed or proceedings page (September 2026).
Rewrite the synthesis in your own words before submitting: the program checks similarity (> 15% is returned).

---

## 1. Thematic synthesis

### 1.1 Digital government and the citizen feedback loop
The UN E-Government Survey 2024 ranks India 97th of 193 countries on the E-Government Development Index. This is a
middling position despite very large platforms such as UMANG and DigiLocker (United Nations Department of Economic
and Social Affairs [UN DESA], 2024). The survey measures supply: services, infrastructure and human capital. It does
not measure how citizens experience those services. Androutsopoulou et al. (2019) argue that AI chatbots can make
government-citizen communication two-way and scalable, but their platform was a design proposal. It was not
evaluated on real complaints and predates large language models (LLMs). For India specifically, Jain et al. (2023)
applied aspect-based sentiment analysis to Aarogya Setu reviews and found that user experience factors cluster into
a small number of aspects. Their study covers one app, a pandemic period, and English reviews only.

### 1.2 Mining app-store reviews
Genc-Nayebi and Abran (2017) systematically reviewed opinion mining of app-store reviews. They found that most
studies classify whole reviews, rarely model individual features, and seldom handle informal or multilingual text.
Guzman and Maalej (2014) showed that feature-level (aspect-level) sentiment reveals what users like or dislike about
specific features, which whole-review sentiment hides. Hassan et al. (2018) studied the developer side and found
that responding to reviews is associated with users raising their ratings. However, responses are costly, so
developers answer only a minority of reviews. That is the operational gap an assistive drafting agent targets.

### 1.3 Sentiment methods: lexicons, fine-tuned transformers, code-mixing
Lexicon methods such as VADER are transparent and need no training data, and they are strong on English social media
(Hutto & Gilbert, 2014). They cannot read Hindi or Hinglish. Multilingual transformers fine-tuned on tweets (XLM-T;
Barbieri et al., 2022) generalise across languages. Code-mixed Hinglish is still hard: the best system in the
SemEval-2020 SentiMix task reached about 75% F1 (Patwa et al., 2020). Aspect-based sentiment analysis was formalised
by Pontiki et al. (2014). Their scheme needs labelled data for each domain, and none exists for Indian government
services.

### 1.4 LLMs as annotators and classifiers
Gilardi et al. (2023) found that zero-shot ChatGPT outperformed crowd workers on several text-annotation tasks.
Zhang et al. (2024) give a more cautious picture. LLMs match fine-tuned models on simple sentiment classification but
lag on structured and fine-grained tasks such as aspect-based sentiment. Whether an LLM agent adds value over a
fine-tuned transformer is therefore an open empirical question. RQ1 tests it directly.

### 1.5 Grounding, hallucination and evaluation
LLMs hallucinate: they produce fluent statements that are unsupported by any source (Ji et al., 2023). In a
government context, an invented helpline or procedure is harmful. Retrieval-augmented generation (RAG) conditions
the model on retrieved documents to reduce this (Lewis et al., 2020). RAG output is usually evaluated with
reference-free metrics such as faithfulness (RAGAS; Es et al., 2024) or with an LLM acting as judge. LLM judges
agree well with human preferences but show position and self-preference biases (Zheng et al., 2023). So judge scores
should come from a different model family and be validated against a human sample.

### 1.6 Gap addressed by this study
No study found (a) evaluates an LLM agent for aspect-level analysis of feedback across several Indian digital public
services, including code-mixed text, against lexicon and fine-tuned baselines with a human-labelled test set; or
(b) tests experimentally whether grounding replies in the government's own published responses reduces unsupported
claims. This study does both, using open-weight models so the results can be reproduced.

---

## 2. Summary table (Step 1.3 format)

| Study | Method | Data | Key finding | Limitation relevant here |
|---|---|---|---|---|
| Hutto & Gilbert (2014) | Rule-based lexicon (VADER) | English tweets, reviews, news | F1 = 0.96 on tweets; beats 11 baselines | English only; no aspects |
| Guzman & Maalej (2014) | Collocations + lexicon sentiment + topic models | 7 apps, ~32k reviews | Feature-level sentiment is feasible and informative | Lexicon-based; English |
| Genc-Nayebi & Abran (2017) | Systematic literature review | App-store opinion-mining studies | Field focuses on whole-review classification | Pre-LLM |
| Hassan et al. (2018) | Empirical study of developer responses | Google Play free apps | Responding is associated with rating increases | Developers answer few reviews |
| Androutsopoulou et al. (2019) | Chatbot platform architecture | Government use cases | AI chatbots can make citizen communication two-way | Not evaluated on real complaints |
| Lewis et al. (2020) | Retrieval-augmented generation | Knowledge-intensive QA | Retrieval improves factuality | Generic-domain corpora |
| Patwa et al. (2020) | Shared task overview | 20k Hinglish tweets | Best Hinglish F1 ~ 0.75 | Tweets, not service feedback |
| Barbieri et al. (2022) | XLM-R further trained on tweets (XLM-T) | ~198M tweets, 8 languages | Strong multilingual sentiment baseline | Not trained on reviews |
| Ji et al. (2023) | Survey | NLG tasks | Taxonomy of hallucination and mitigations | Survey, no new data |
| Gilardi et al. (2023) | Zero-shot ChatGPT annotation | 6,183 tweets and news articles | Beats crowd workers by ~25 points | Closed model; US/EU texts |
| Jain et al. (2023) | Hybrid aspect-based sentiment analysis | Aarogya Setu Play reviews | Identifies UX factors of a government app | One app; English; pre-LLM |
| Zheng et al. (2023) | LLM-as-judge | MT-Bench, Chatbot Arena | GPT-4 judge agreement > 80% with humans | Position and self-preference bias |
| Es et al. (2024) | Reference-free RAG metrics (RAGAS) | WikiEval | Faithfulness metric tracks human judgement | Relies on an LLM judge |
| Zhang et al. (2024) | LLM vs fine-tuned models across 13 sentiment tasks | 26 datasets | LLMs ≈ fine-tuned on simple sentiment; weaker on structured ABSA | English-centric |

---

## 3. References (APA 7)

Androutsopoulou, A., Karacapilidis, N., Loukis, E., & Charalabidis, Y. (2019). Transforming the communication between citizens and government through AI-guided chatbots. *Government Information Quarterly, 36*(2), 358–367. https://doi.org/10.1016/j.giq.2018.10.001

Barbieri, F., Espinosa Anke, L., & Camacho-Collados, J. (2022). XLM-T: Multilingual language models in Twitter for sentiment analysis and beyond. In *Proceedings of the Thirteenth Language Resources and Evaluation Conference* (pp. 258–266). European Language Resources Association. https://aclanthology.org/2022.lrec-1.27/

Cohen, J. (1988). *Statistical power analysis for the behavioral sciences* (2nd ed.). Lawrence Erlbaum Associates.

Connor, R. J. (1987). Sample size for testing differences in proportions for the paired-sample design. *Biometrics, 43*(1), 207–211. https://pubmed.ncbi.nlm.nih.gov/3567305/

Es, S., James, J., Espinosa-Anke, L., & Schockaert, S. (2024). RAGAs: Automated evaluation of retrieval augmented generation. In *Proceedings of the 18th Conference of the European Chapter of the Association for Computational Linguistics: System Demonstrations* (pp. 150–158). Association for Computational Linguistics. https://aclanthology.org/2024.eacl-demo.16/

Genc-Nayebi, N., & Abran, A. (2017). A systematic literature review: Opinion mining studies from mobile app store user reviews. *Journal of Systems and Software, 125*, 207–219. https://doi.org/10.1016/j.jss.2016.11.027

Gilardi, F., Alizadeh, M., & Kubli, M. (2023). ChatGPT outperforms crowd workers for text-annotation tasks. *Proceedings of the National Academy of Sciences, 120*(30), Article e2305016120. https://doi.org/10.1073/pnas.2305016120

Guzman, E., & Maalej, W. (2014). How do users like this feature? A fine grained sentiment analysis of app reviews. In *2014 IEEE 22nd International Requirements Engineering Conference* (pp. 153–162). IEEE. https://doi.org/10.1109/RE.2014.6912257

Hassan, S., Tantithamthavorn, C., Bezemer, C.-P., & Hassan, A. E. (2018). Studying the dialogue between users and developers of free apps in the Google Play Store. *Empirical Software Engineering, 23*(3), 1275–1312.

Hutto, C., & Gilbert, E. (2014). VADER: A parsimonious rule-based model for sentiment analysis of social media text. *Proceedings of the International AAAI Conference on Web and Social Media, 8*(1), 216–225. https://ojs.aaai.org/index.php/ICWSM/article/view/14550

Jain, A., Dey, L., Dasgupta, T., & Naskar, A. (2023). Factors affecting user experience of contact tracing app during COVID-19: An aspect-based sentiment analysis of user-generated review. *Behaviour & Information Technology, 42*(2), 249–264. https://doi.org/10.1080/0144929X.2022.2139758 *(confirm the full author list on the DOI page)*

Ji, Z., Lee, N., Frieske, R., Yu, T., Su, D., Xu, Y., Ishii, E., Bang, Y. J., Madotto, A., & Fung, P. (2023). Survey of hallucination in natural language generation. *ACM Computing Surveys, 55*(12), 1–38. https://doi.org/10.1145/3571730

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *Advances in Neural Information Processing Systems, 33*, 9459–9474.

Patwa, P., Aguilar, G., Kar, S., Pandey, S., PYKL, S., Gambäck, B., Chakraborty, T., Solorio, T., & Das, A. (2020). SemEval-2020 Task 9: Overview of sentiment analysis of code-mixed tweets. In *Proceedings of the Fourteenth Workshop on Semantic Evaluation*. International Committee for Computational Linguistics. https://aclanthology.org/2020.semeval-1.100/

Pontiki, M., Galanis, D., Pavlopoulos, J., Papageorgiou, H., Androutsopoulos, I., & Manandhar, S. (2014). SemEval-2014 Task 4: Aspect based sentiment analysis. In *Proceedings of the 8th International Workshop on Semantic Evaluation (SemEval 2014)* (pp. 27–35). Association for Computational Linguistics. https://aclanthology.org/S14-2004/

United Nations Department of Economic and Social Affairs. (2024). *E-Government Survey 2024: Accelerating digital transformation for sustainable development*. United Nations. https://publicadministration.un.org/egovkb/en-us/Reports/UN-E-Government-Survey-2024

Zhang, W., Deng, Y., Liu, B., Pan, S., & Bing, L. (2024). Sentiment analysis in the era of large language models: A reality check. In *Findings of the Association for Computational Linguistics: NAACL 2024* (pp. 3881–3906). Association for Computational Linguistics. https://aclanthology.org/2024.findings-naacl.246/

Zheng, L., Chiang, W.-L., Sheng, Y., Zhuang, S., Wu, Z., Zhuang, Y., Lin, Z., Li, Z., Li, D., Xing, E. P., Zhang, H., Gonzalez, J. E., & Stoica, I. (2023). Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. *Advances in Neural Information Processing Systems, 36* (Datasets and Benchmarks Track). https://arxiv.org/abs/2306.05685

### Software and data to cite as well
Also cite as software: Google Agent Development Kit, Groq-hosted models (`openai/gpt-oss-20b`, `openai/gpt-oss-120b`,
`qwen/qwen3.8-27b`), the `google-play-scraper` package, and the use of an AI assistant. The orientation deck requires
AI use to be cited.

### Checks before submission
- Gilardi et al.: issue 30 is from memory. Confirm it on the PNAS page.
- Genc-Nayebi & Abran: the DOI is from memory. Confirm it on ScienceDirect.
- Hassan et al. (2018): add the DOI from SpringerLink.
