"""Exploratory data analysis of the full scraped corpus.

Usage: python -m analysis.eda
Output: reports/figures/eda_*.png, reports/tables/descriptives_*.csv, reports/tables/data_quality.csv
"""
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from analysis import plot_style as ps
from config import DATA_RAW, ROOT

FIG = ROOT / "reports" / "figures"
TAB = ROOT / "reports" / "tables"


def load() -> pd.DataFrame:
    df = pd.read_csv(sorted(DATA_RAW.glob("playstore_reviews_*.csv"))[-1], parse_dates=["review_date"])
    df["n_words"] = df["text"].astype(str).str.split().str.len()
    df["n_chars"] = df["text"].astype(str).str.len()
    # script detection: any Devanagari / other Indic script characters
    df["script"] = np.select(
        [df["text"].str.contains(r"[ऀ-ॿ]", regex=True),
         df["text"].str.contains(r"[ঀ-෿]", regex=True)],
        ["devanagari", "other_indic"], default="latin_or_other",
    )
    return df


def data_quality(df: pd.DataFrame) -> pd.DataFrame:
    rows = {
        "rows": len(df),
        "duplicate review_id": int(df["review_id"].duplicated().sum()),
        "duplicate text (same app)": int(df.duplicated(["app_id", "text"]).sum()),
        "missing text": int(df["text"].isna().sum()),
        "missing rating": int(df["rating"].isna().sum()),
        "missing app_version": int(df["app_version"].isna().sum()),
        "reviews < 5 words": int((df["n_words"] < 5).sum()),
        "reviews with official reply": int(df["has_dev_reply"].sum()),
        "rating outside 1-5": int((~df["rating"].between(1, 5)).sum()),
    }
    return pd.DataFrame(rows.items(), columns=["check", "count"])


def descriptives(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby(["service_category", "app_name"])
    out = pd.DataFrame({
        "n": g.size(),
        "mean_rating": g["rating"].mean().round(2),
        "sd_rating": g["rating"].std().round(2),
        "median_rating": g["rating"].median(),
        "pct_1_star": (g["rating"].apply(lambda s: (s == 1).mean()) * 100).round(1),
        "pct_5_star": (g["rating"].apply(lambda s: (s == 5).mean()) * 100).round(1),
        "median_words": g["n_words"].median(),
        "iqr_words": g["n_words"].apply(lambda s: s.quantile(0.75) - s.quantile(0.25)),
        "pct_official_reply": (g["has_dev_reply"].mean() * 100).round(1),
        "pct_devanagari": (g["script"].apply(lambda s: (s == "devanagari").mean()) * 100).round(1),
        "first_review": g["review_date"].min().dt.date,
        "last_review": g["review_date"].max().dt.date,
    }).reset_index()
    return out


def fig_rating_distribution(df: pd.DataFrame):
    share = pd.crosstab(df["app_name"], df["rating"], normalize="index") * 100
    share = share.loc[(share[1] + share[2]).sort_values().index]  # most negative at the bottom
    fig, ax = plt.subplots(figsize=(7.5, 4.2))
    left = np.zeros(len(share))
    for star, color in zip(range(1, 6), ps.STAR_COLORS):
        vals = share[star].values
        ax.barh(share.index, vals, left=left, color=color, edgecolor="white", linewidth=1.5, height=0.62,
                label=f"{star}★")
        for i, (v, l) in enumerate(zip(vals, left)):
            if star in (1, 5) and v >= 9:
                ax.text(l + v / 2, i, f"{v:.0f}%", ha="center", va="center", fontsize=8,
                        color="white")
        left += vals
    ax.set_xlim(0, 100)
    ax.set_xlabel("Share of reviews (%)")
    ax.grid(axis="y", visible=False)
    ax.legend(ncol=5, loc="lower center", bbox_to_anchor=(0.5, 1.0), handlelength=1.2, columnspacing=1.2)
    fig.savefig(FIG / "eda_rating_distribution.png")
    plt.close(fig)


def fig_review_length(df: pd.DataFrame):
    order = df.groupby("app_name")["n_words"].median().sort_values().index
    fig, ax = plt.subplots(figsize=(7.5, 4.2))
    data = [df.loc[df["app_name"] == a, "n_words"].clip(lower=1) for a in order]
    ax.boxplot(data, orientation="horizontal", tick_labels=list(order), showfliers=False, widths=0.5,
               medianprops={"color": ps.BLUE, "linewidth": 2},
               boxprops={"color": ps.INK_2, "linewidth": 1}, whiskerprops={"color": ps.INK_2, "linewidth": 1},
               capprops={"color": ps.INK_2, "linewidth": 1})
    ax.set_xscale("log")
    ax.set_xticks([1, 2, 5, 10, 20, 50, 100], labels=["1", "2", "5", "10", "20", "50", "100"])
    ax.axvline(5, color=ps.INK_2, linewidth=1, linestyle=(0, (3, 3)))
    ax.text(5.2, len(order) + 0.35, "analysis threshold (5 words)", fontsize=8, color=ps.INK_2, va="bottom")
    ax.set_xlabel("Words per review (log scale; whiskers = 1.5 × IQR, outliers hidden)")
    ax.grid(axis="y", visible=False)
    fig.savefig(FIG / "eda_review_length.png")
    plt.close(fig)


def fig_official_reply_rate(df: pd.DataFrame):
    rate = (df.groupby("app_name")["has_dev_reply"].mean() * 100).sort_values()
    fig, ax = plt.subplots(figsize=(7.5, 3.8))
    ax.barh(rate.index, rate.values, color=ps.BLUE, height=0.55)
    for i, v in enumerate(rate.values):
        ax.text(v + 1, i, f"{v:.1f}%", va="center", fontsize=8.5, color=ps.INK)
    ax.set_xlim(0, max(100, rate.max() + 10))
    ax.set_xlabel("Reviews that received an official reply from the app's team (%)")
    ax.grid(axis="y", visible=False)
    fig.savefig(FIG / "eda_official_reply_rate.png")
    plt.close(fig)


def fig_time_coverage(df: pd.DataFrame):
    span = df.groupby("app_name")["review_date"].agg(["min", "max"]).sort_values("min")
    fig, ax = plt.subplots(figsize=(7.5, 3.8))
    for i, (app, r) in enumerate(span.iterrows()):
        ax.plot([r["min"], r["max"]], [i, i], color=ps.BLUE, linewidth=2, solid_capstyle="round")
        ax.plot([r["min"], r["max"]], [i, i], "o", color=ps.BLUE, markersize=5)
        days = (r["max"] - r["min"]).days
        ax.text(r["max"], i + 0.28, f"{days} days", fontsize=8, color=ps.INK_2, ha="right")
    ax.set_yticks(range(len(span)), labels=span.index)
    ax.set_xlabel("Review date (newest 4,000 reviews per app)")
    ax.grid(axis="y", visible=False)
    fig.autofmt_xdate()
    fig.savefig(FIG / "eda_time_coverage.png")
    plt.close(fig)


def main():
    FIG.mkdir(parents=True, exist_ok=True)
    TAB.mkdir(parents=True, exist_ok=True)
    ps.apply()
    df = load()

    dq = data_quality(df)
    dq.to_csv(TAB / "data_quality.csv", index=False)
    desc = descriptives(df)
    desc.to_csv(TAB / "descriptives_by_app.csv", index=False)
    overall = df[["rating", "n_words", "n_chars", "thumbs_up"]].describe().T.round(2)
    overall.to_csv(TAB / "descriptives_overall.csv")
    corr = df[["rating", "n_words", "thumbs_up"]].corr(method="spearman").round(3)
    corr.to_csv(TAB / "spearman_correlations.csv")

    fig_rating_distribution(df)
    fig_review_length(df)
    fig_official_reply_rate(df)
    fig_time_coverage(df)

    print(dq.to_string(index=False), "\n")
    print(desc.drop(columns=["first_review", "last_review"]).to_string(index=False), "\n")
    print(overall.to_string(), "\n")
    print("Spearman correlations:\n", corr.to_string())
    print(f"\nFigures -> {FIG}\nTables -> {TAB}")


if __name__ == "__main__":
    main()
