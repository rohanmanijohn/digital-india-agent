# Gold-Set Labelling Guidelines (RQ1)

**Current procedure (27 Sep 2026):** the 400 rows were pre-labelled by Claude (Anthropic) following these
guidelines, blind to star ratings and to all system predictions (blue columns D–G, provenance in
`data/processed/gold_ai_labels.csv`). The researcher checks each row: `ok` in column H, or `fixed` plus the corrected
value(s) in columns I–L. The rules below apply to both the AI labels and the researcher's check.

File: `data/processed/gold_set.xlsx`, sheet `label_me`. 400 reviews, 50 per app, randomly drawn from the analysis
sample.

**The star rating is hidden on purpose.** Judge only what the text says. Label all 400 before you look at any model
output, so your labels are not influenced by the models.

## Columns to fill (dropdowns are provided)

| Column | Values | Rule |
|---|---|---|
| `label_sentiment` | positive / neutral / negative | The writer's overall attitude to the **app or service**. See the decision rules below. |
| `label_relevant` | yes / no | "yes" if it is feedback on the app or service. "no" for spam, random names, or unrelated rants. |
| `label_primary_aspect` | one of the 10 aspects, or none | The aspect the review is **mainly** about. See the definitions below. |
| `label_language` | english / hinglish / hindi / other_indian_language / other | Script and language, as defined below. |
| `notes` | free text | Anything ambiguous: sarcasm, mixed sentiment, and so on. |

## Sentiment decision rules
1. **Complaints win.** A review with both praise and a complaint ("good app but OTP never comes") is **negative** if
   the complaint describes something that does not work. It is **positive** only if the complaint is a minor
   suggestion ("great app, please add dark mode").
2. **Feature requests** with no dissatisfaction are **neutral**.
3. **Questions** ("how do I change my bank?") are **neutral** unless they express frustration.
4. **Sarcasm** is labelled by its intended meaning ("wow, 10 OTPs and still no login, great job" is negative).
5. **Neutral** also covers purely factual statements and text you cannot interpret.

## Aspect definitions
| Aspect | Covers |
|---|---|
| login_otp_authentication | login, OTP, PIN, password, face or biometric authentication |
| server_downtime_performance | server error, "not working", slow, down, loading, maintenance |
| ui_usability | ease of use, design, navigation, language options, "easy / user friendly" |
| aadhaar_kyc_linking | Aadhaar linking, eKYC, mobile-number linking, name mismatch |
| payments_transactions | payments, UPI, refunds, money debited, challan payment |
| documents_certificates | fetching or issuing documents: marksheets, DL, RC, certificates, passbook |
| customer_support_grievance | helpline, no response, complaint not resolved |
| privacy_security | data privacy, permissions, security concerns |
| app_update_bugs | crashes, "app not opening", bugs after an update, compatibility |
| other | about the service but none of the above (general praise, policy opinions) |
| none | no aspect (only for irrelevant text) |

## Language
- **hindi**: Devanagari script (for example "ऐप नहीं खुल रहा").
- **hinglish**: Hindi written in Latin script and/or mixed with English (for example "otp nahi aa raha").
- **other_indian_language**: Tamil, Gujarati, Bengali and others.

## Reliability (strongly recommended)
Ask a second person to label a random **100** of the same rows **independently**, in a copy of the file without your
labels. Report Cohen's κ between the two of you (κ ≥ 0.61 = substantial agreement). This lets you claim the gold
standard itself is reliable. Examiners look for this.

Time needed: about 20–30 seconds per review, so **3–4 hours** in total. Split it over a few sessions.
