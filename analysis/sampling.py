"""Draw the study samples from the common-window dataset (fixed seed, reproducible).

  analysis_sample.csv  2,000 reviews, >= 5 words: 250 per app, or every eligible review where an app has fewer
                       (Aarogya Setu: 199); the shortfall is spread evenly over the other apps   -> RQ1, RQ4
  gold_set.xlsx        400-review reference set drawn from that sample, stratified by language:
                       200 English + 200 non-English (Hindi, Hinglish, other Indian languages)    -> RQ1 validation, RQ4
                       Two human reviewers label it independently (see docs/labelling_guidelines.md).

Usage: python -m analysis.sampling
"""
import re

import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

from config import ASPECTS, DATA_PROCESSED, DATA_RAW

SEED = 42
SAMPLE_SIZE = 2000
PER_APP = 250
REFERENCE_PER_STRATUM = 200
MIN_WORDS = 5  # shorter reviews ("good app") carry no aspect information

GOLD_XLSX = DATA_PROCESSED / "gold_set.xlsx"
LANGS = ["english", "hinglish", "hindi", "other_indian_language", "other"]

# Common romanised-Hindi function words; two or more in a review marks it as likely Hinglish.
# This only stratifies the draw - the human reviewers record the actual language.
_HINGLISH = set("nahi nhi hai hain ho raha rha rahi kya kar karo bhi mein me ka ki ke ko se hota kuch bahut bohot ek aap "
                "ji acha accha achha bekar bakwas paisa wala wale kaise kab kyu kyon kiya diya liya tha thi hua hoga sab koi".split())


def language_guess(text: str) -> str:
    text = str(text)
    if re.search(r"[ऀ-ॿ]", text):
        return "hindi"
    if re.search(r"[ঀ-෿]", text):
        return "other_indian_language"
    tokens = re.findall(r"[a-z]+", text.lower())
    return "hinglish" if sum(t in _HINGLISH for t in tokens) >= 2 else "english"


def allocate(eligible_counts: pd.Series) -> dict[str, int]:
    """250 per app; apps with fewer eligible reviews give all they have, the shortfall goes to the others evenly."""
    alloc = {app: min(PER_APP, n) for app, n in eligible_counts.items()}
    shortfall = SAMPLE_SIZE - sum(alloc.values())
    while shortfall > 0:
        room = [a for a in sorted(alloc) if alloc[a] < eligible_counts[a]]
        if not room:
            break
        for app in room:
            if shortfall == 0:
                break
            alloc[app] += 1
            shortfall -= 1
    return alloc


def main():
    raw = sorted(DATA_RAW.glob("playstore_reviews_*_window.csv"))[-1]
    df = pd.read_csv(raw)
    df["n_words"] = df["text"].astype(str).str.split().str.len()
    eligible = df[df["n_words"] >= MIN_WORDS].copy()
    eligible["lang_guess"] = eligible["text"].map(language_guess)
    alloc = allocate(eligible["app_name"].value_counts())
    print("Allocation per app:", alloc)

    sample = pd.concat(
        [eligible[eligible["app_name"] == app].sample(n=n, random_state=SEED) for app, n in sorted(alloc.items())],
        ignore_index=True,
    )
    sample.to_csv(DATA_PROCESSED / "analysis_sample.csv", index=False)

    is_en = sample["lang_guess"] == "english"
    non_en = sample[~is_en]
    n_non_en = min(REFERENCE_PER_STRATUM, len(non_en))
    reference = pd.concat([
        sample[is_en].sample(n=SAMPLE_SIZE // 5 - n_non_en, random_state=SEED),
        non_en.sample(n=n_non_en, random_state=SEED),
    ]).sample(frac=1, random_state=SEED)

    sheet = pd.DataFrame({
        "review_id": reference["review_id"], "app_name": reference["app_name"], "text": reference["text"],
        "reviewer": "",              # initials of the person labelling this copy
        "label_sentiment": "",       # positive / neutral / negative
        "label_relevant": "",        # yes / no
        "label_primary_aspect": "",  # one of ASPECTS, or none
        "label_language": "",        # english / hinglish / hindi / other_indian_language / other
        "notes": "",
    })
    # Star ratings and model outputs are deliberately not shown: reviewers judge the text alone.
    sheet.to_excel(GOLD_XLSX, index=False, sheet_name="label_me")
    _format_sheet(len(sheet))
    print(f"Sample: {len(sample)} reviews from {raw.name} | non-English in sample: {len(non_en)}")
    print(f"Reference set: {len(sheet)} ({len(sheet) - n_non_en} English, {n_non_en} non-English) -> {GOLD_XLSX}")


def _format_sheet(n_rows: int):
    wb = load_workbook(GOLD_XLSX)
    ws = wb["label_me"]
    for col, w in {"A": 14, "B": 16, "C": 80, "D": 10, "E": 16, "F": 14, "G": 30, "H": 22, "I": 30}.items():
        ws.column_dimensions[col].width = w
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="DDE6F7")
    for row in ws.iter_rows(min_row=2):
        row[2].alignment = Alignment(wrap_text=True, vertical="top")
    for col, options in {"E": ["positive", "neutral", "negative"], "F": ["yes", "no"],
                         "G": ASPECTS + ["none"], "H": LANGS}.items():
        dv = DataValidation(type="list", formula1='"' + ",".join(options) + '"', allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f"{col}2:{col}{n_rows + 1}")
    ws.freeze_panes = "D2"
    wb.save(GOLD_XLSX)


if __name__ == "__main__":
    main()
