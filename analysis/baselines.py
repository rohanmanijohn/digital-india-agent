"""RQ1 baselines on analysis_sample.csv: VADER (lexicon) and XLM-RoBERTa (fine-tuned multilingual transformer).

Usage: python -m analysis.baselines
Output: data/processed/baseline_predictions.csv
"""
import pandas as pd
import torch
from transformers import pipeline
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from config import DATA_PROCESSED

# Multilingual (incl. Hindi) sentiment model trained on ~198M tweets, fine-tuned on 8 languages (Barbieri et al., 2022)
XLMR_MODEL = "cardiffnlp/twitter-xlm-roberta-base-sentiment"


def vader_label(compound: float) -> str:
    # Standard thresholds from Hutto & Gilbert (2014)
    if compound >= 0.05:
        return "positive"
    if compound <= -0.05:
        return "negative"
    return "neutral"


def main():
    df = pd.read_csv(DATA_PROCESSED / "analysis_sample.csv")
    texts = df["text"].astype(str).tolist()

    vader = SentimentIntensityAnalyzer()
    df["vader_compound"] = [vader.polarity_scores(t)["compound"] for t in texts]
    df["vader_label"] = df["vader_compound"].map(vader_label)

    torch.set_num_threads(max(1, torch.get_num_threads()))
    clf = pipeline("sentiment-analysis", model=XLMR_MODEL, tokenizer=XLMR_MODEL, device=-1)
    preds = clf(texts, batch_size=32, truncation=True, max_length=256)
    df["xlmr_label"] = [p["label"].lower() for p in preds]
    df["xlmr_score"] = [round(p["score"], 4) for p in preds]

    out = DATA_PROCESSED / "baseline_predictions.csv"
    df[["review_id", "vader_compound", "vader_label", "xlmr_label", "xlmr_score"]].to_csv(out, index=False)
    print(df[["vader_label", "xlmr_label"]].apply(pd.Series.value_counts).to_string())
    print(f"Saved -> {out}")


if __name__ == "__main__":
    main()
