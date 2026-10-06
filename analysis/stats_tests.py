"""Hypothesis tests for RQ1-RQ4. Each block runs only if its inputs exist, so this can be re-run at any stage.

Usage: python -m analysis.stats_tests
Output: reports/tables/rq*.csv, reports/figures/rq*.png, reports/results_summary.md
"""
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.metrics import accuracy_score, cohen_kappa_score, confusion_matrix, f1_score
from statsmodels.stats.contingency_tables import mcnemar
from statsmodels.stats.multitest import multipletests
from statsmodels.stats.oneway import anova_oneway
from statsmodels.stats.proportion import proportion_confint
from statsmodels.stats.multicomp import pairwise_tukeyhsd
import statsmodels.api as sm
import matplotlib.pyplot as plt

from analysis import plot_style as ps
from config import ASPECTS, DATA_PROCESSED, DATA_RAW, ROOT

TAB = ROOT / "reports" / "tables"
FIG = ROOT / "reports" / "figures"
LABELS = ["negative", "neutral", "positive"]
SEED = 42
summary: list[str] = []


def say(line: str = ""):
    print(line)
    summary.append(line)


def fmt_p(p: float) -> str:
    return "< .001" if p < 0.001 else f"= {p:.3f}".replace("0.", ".")


def final_gold_labels(sheet: pd.DataFrame) -> pd.DataFrame:
    """Researcher's correction where given, otherwise the disclosed AI reference label."""
    out = sheet[["review_id"]].copy()
    for field in ["sentiment", "relevant", "primary_aspect", "language"]:
        fixed = sheet.get(f"corrected_{field}", pd.Series(index=sheet.index, dtype=object))
        out[f"label_{field}"] = fixed.where(fixed.notna() & (fixed.astype(str).str.strip() != ""), sheet[f"ai_{field}"])
    check = sheet.get("check", pd.Series(index=sheet.index, dtype=object)).astype(str).str.strip().str.lower()
    out["reviewed"] = check.isin(["ok", "fixed"])
    out["corrected"] = check.eq("fixed")
    return out


def star_to_sentiment(r: int) -> str:
    return "negative" if r <= 2 else "neutral" if r == 3 else "positive"


# ---------------------------------------------------------------- RQ1
def _classifier_report(df: pd.DataFrame, truth: str, systems: dict[str, str], tag: str):
    rows = []
    for name, col in systems.items():
        rows.append({
            "system": name, "n": len(df),
            "accuracy": accuracy_score(df[truth], df[col]),
            "macro_f1": f1_score(df[truth], df[col], labels=LABELS, average="macro"),
            "cohen_kappa": cohen_kappa_score(df[truth], df[col]),
        })
    rep = pd.DataFrame(rows).round(3)
    rep.to_csv(TAB / f"rq1_{tag}_metrics.csv", index=False)
    say(rep.to_string(index=False))

    # McNemar: agent vs each baseline on paired correct/incorrect, Holm-corrected
    agent_ok = df[systems["LLM agent"]] == df[truth]
    tests = []
    for name, col in systems.items():
        if name == "LLM agent":
            continue
        base_ok = df[col] == df[truth]
        table = [[(agent_ok & base_ok).sum(), (agent_ok & ~base_ok).sum()],
                 [(~agent_ok & base_ok).sum(), (~agent_ok & ~base_ok).sum()]]
        res = mcnemar(table, exact=False, correction=True)
        # bootstrap 95% CI for the macro-F1 difference
        rng = np.random.default_rng(SEED)
        diffs = []
        for _ in range(2000):
            idx = rng.integers(0, len(df), len(df))
            s = df.iloc[idx]
            diffs.append(f1_score(s[truth], s[systems["LLM agent"]], labels=LABELS, average="macro")
                         - f1_score(s[truth], s[col], labels=LABELS, average="macro"))
        tests.append({"comparison": f"LLM agent vs {name}", "agent_only_correct": table[0][1],
                      "baseline_only_correct": table[1][0], "chi2": res.statistic, "p": res.pvalue,
                      "macro_f1_diff": np.mean(diffs), "ci_low": np.percentile(diffs, 2.5),
                      "ci_high": np.percentile(diffs, 97.5)})
    t = pd.DataFrame(tests)
    t["p_holm"] = multipletests(t["p"], method="holm")[1]
    t.round(4).to_csv(TAB / f"rq1_{tag}_mcnemar.csv", index=False)
    for r in t.itertuples():
        say(f"  {r.comparison}: McNemar χ²(1) = {r.chi2:.2f}, p(Holm) {fmt_p(r.p_holm)}; "
            f"ΔmacroF1 = {r.macro_f1_diff:+.3f} [95% CI {r.ci_low:+.3f}, {r.ci_high:+.3f}]")
    cm = pd.DataFrame(confusion_matrix(df[truth], df[systems["LLM agent"]], labels=LABELS),
                      index=[f"true_{l}" for l in LABELS], columns=[f"pred_{l}" for l in LABELS])
    cm.to_csv(TAB / f"rq1_{tag}_agent_confusion.csv")


def _by_language(df: pd.DataFrame, truth: str, systems: dict[str, str], tag: str, lang_col: str):
    """Secondary RQ1 analysis: is the agent's edge larger on Hindi / Hinglish / other Indian-language text?"""
    grp = df[lang_col].map(lambda l: "english" if l == "english" else "non_english")
    rows = []
    for g_name, part in df.groupby(grp):
        for name, col in systems.items():
            rows.append({"language": g_name, "system": name, "n": len(part),
                         "accuracy": accuracy_score(part[truth], part[col]),
                         "macro_f1": f1_score(part[truth], part[col], labels=LABELS, average="macro")})
    out = pd.DataFrame(rows).round(3)
    out.to_csv(TAB / f"rq1_{tag}_by_language.csv", index=False)
    say("By language (english vs Hindi/Hinglish/other):\n" + out.pivot(index="system", columns="language",
                                                                          values="macro_f1").to_string())


def _confusion_figure(df: pd.DataFrame, truth: str, pred: str, tag: str):
    ps.apply()
    cm = confusion_matrix(df[truth], df[pred], labels=LABELS)
    ramp = ["#f4f8fd", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95"]  # sequential blue
    from matplotlib.colors import LinearSegmentedColormap
    fig, ax = plt.subplots(figsize=(4.6, 3.9))
    ax.imshow(cm, cmap=LinearSegmentedColormap.from_list("seq", ramp))
    for i in range(3):
        for j in range(3):
            v = cm[i, j]
            ax.text(j, i, f"{v}", ha="center", va="center", fontsize=11,
                    color="white" if v > cm.max() * 0.55 else ps.INK)
    ax.set_xticks(range(3), labels=LABELS)
    ax.set_yticks(range(3), labels=LABELS)
    ax.set_xlabel("Agent prediction")
    ax.set_ylabel("Ground truth" if tag == "gold" else "Star-rating proxy")
    ax.grid(False)
    for spine in ax.spines.values():
        spine.set_visible(False)
    fig.savefig(FIG / f"rq1_{tag}_agent_confusion.png")
    plt.close(fig)


def rq1():
    say("## RQ1 - Agent vs lexicon and transformer baselines (sentiment classification)")
    ar, bp = DATA_PROCESSED / "analyzer_results.jsonl", DATA_PROCESSED / "baseline_predictions.csv"
    if not (ar.exists() and bp.exists()):
        say("Skipped: need analyzer_results.jsonl and baseline_predictions.csv.\n")
        return
    df = (pd.read_json(ar, lines=True).drop_duplicates("review_id")[["review_id", "overall_sentiment", "language"]]
          .merge(pd.read_csv(bp), on="review_id")
          .merge(pd.read_csv(DATA_PROCESSED / "analysis_sample.csv")[["review_id", "rating"]], on="review_id"))
    systems = {"LLM agent": "overall_sentiment", "VADER": "vader_label", "XLM-R": "xlmr_label"}

    df["star_label"] = df["rating"].map(star_to_sentiment)
    say(f"\n### Preliminary: star rating as proxy ground truth (1-2★ neg, 3★ neu, 4-5★ pos), n = {len(df)}")
    say("Caveat: ratings and text often disagree, so this is a proxy, not the RQ1 test.")
    _classifier_report(df, "star_label", systems, "proxy_stars")
    _by_language(df, "star_label", systems, "proxy_stars", "language")
    _confusion_figure(df, "star_label", systems["LLM agent"], "proxy_stars")

    gold_path = DATA_PROCESSED / "gold_set.xlsx"
    gold = final_gold_labels(pd.read_excel(gold_path))
    gold = gold[gold["label_sentiment"].isin(LABELS)]
    if len(gold) < 385:
        say(f"\n### Gold standard: {len(gold)}/400 labelled - need >= 385 before the RQ1 test is valid.\n")
        return
    g = df.merge(gold[["review_id", "label_sentiment", "label_language"]], on="review_id")
    reviewed, corrected = int(gold["reviewed"].sum()), int(gold["corrected"].sum())
    say(f"\n### RQ1 test: reference labels, n = {len(g)}")
    say(f"Ground truth = AI reference labels (Claude, disclosed) reviewed by the researcher: {reviewed}/{len(gold)} rows "
        f"checked, {corrected} corrected ({corrected / max(reviewed, 1):.1%} of checked rows).")
    if reviewed < len(gold):
        say("Caveat: not every row has been checked yet, so this result is provisional.")
    _classifier_report(g, "label_sentiment", systems, "gold")
    _by_language(g, "label_sentiment", systems, "gold", "label_language")
    _confusion_figure(g, "label_sentiment", systems["LLM agent"], "gold")
    say("")


# ---------------------------------------------------------------- RQ2
def rq2():
    say("## RQ2 - Is negative sentiment associated with the service aspect?")
    ar = DATA_PROCESSED / "analyzer_results.jsonl"
    if not ar.exists():
        say("Skipped: need analyzer_results.jsonl.\n")
        return
    res = pd.read_json(ar, lines=True).drop_duplicates("review_id")
    res = res[res["relevant"] & res["aspects"].map(len).gt(0)]
    # unit of analysis = one review; its primary (first-listed) aspect keeps observations independent
    res["primary_aspect"] = res["aspects"].map(lambda a: a[0]["aspect"])
    res["primary_negative"] = res["aspects"].map(lambda a: a[0]["sentiment"] == "negative")
    ct = pd.crosstab(res["primary_aspect"], res["primary_negative"]).reindex(ASPECTS).fillna(0)
    ct = ct[ct.sum(axis=1) >= 5]  # chi-square expected-count assumption
    chi2, p, dof, expected = stats.chi2_contingency(ct)
    n = ct.values.sum()
    v = np.sqrt(chi2 / (n * (min(ct.shape) - 1)))
    say(f"n = {n} reviews with an aspect; χ²({dof}) = {chi2:.2f}, p {fmt_p(p)}, Cramér's V = {v:.3f}")
    resid = (ct - expected) / np.sqrt(expected)
    out = ct.rename(columns={False: "not_negative", True: "negative"})
    out["pct_negative"] = (out["negative"] / out.sum(axis=1) * 100).round(1)
    out["std_residual_negative"] = resid[True].round(2)
    ci = [proportion_confint(r.negative, r.negative + r.not_negative, method="wilson") for r in out.itertuples()]
    out["ci_low"], out["ci_high"] = [c[0] * 100 for c in ci], [c[1] * 100 for c in ci]
    out.round(2).to_csv(TAB / "rq2_aspect_by_sentiment.csv")
    say(out[["negative", "not_negative", "pct_negative", "std_residual_negative"]].to_string())

    # robustness: review-level logistic regression, overall negative ~ all aspects mentioned (multi-hot)
    X = pd.DataFrame([{a: int(any(x["aspect"] == a for x in asp)) for a in ASPECTS} for asp in res["aspects"]])
    X = X.loc[:, X.sum() >= 10].drop(columns=["other"], errors="ignore")
    y = (res["overall_sentiment"] == "negative").astype(int).values
    # aspects whose mentions are all negative (or all non-negative) perfectly separate y -> infinite odds ratio
    separated = [a for a in X.columns if len(set(y[X[a].values == 1])) == 1]
    if separated:
        say(f"Excluded from the logit for perfect separation (reported descriptively above): {', '.join(separated)}")
        X = X.drop(columns=separated)
    try:
        m = sm.Logit(y, sm.add_constant(X)).fit(disp=False)
        orr = pd.DataFrame({"odds_ratio": np.exp(m.params), "ci_low": np.exp(m.conf_int()[0]),
                            "ci_high": np.exp(m.conf_int()[1]), "p": m.pvalues}).round(3)
        orr.to_csv(TAB / "rq2_logit_odds_ratios.csv", index_label="term")
        say(f"Logistic regression (pseudo-R² = {m.prsquared:.3f}):\n{orr.to_string()}")
    except Exception as e:
        say(f"Logistic regression not estimable yet: {e}")

    ps.apply()
    o = out.sort_values("pct_negative")
    fig, ax = plt.subplots(figsize=(7.5, 4.2))
    y_pos = range(len(o))
    ax.hlines(y_pos, o["ci_low"], o["ci_high"], color=ps.INK_2, linewidth=1.2)
    ax.plot(o["pct_negative"], y_pos, "o", color=ps.BLUE, markersize=7)
    ax.set_yticks(list(y_pos), labels=[a.replace("_", " ") for a in o.index])
    ax.set_xlim(0, 100)
    ax.set_xlabel("Reviews where this aspect is discussed negatively (%, 95% Wilson CI)")
    ax.grid(axis="y", visible=False)
    fig.savefig(FIG / "rq2_negative_share_by_aspect.png")
    plt.close(fig)
    say("")


# ---------------------------------------------------------------- RQ3
def rq3():
    say("## RQ3 - Does citizen sentiment differ across service categories?")
    df = pd.read_csv(sorted(DATA_RAW.glob("playstore_reviews_*.csv"))[-1])
    groups = [g["rating"].values for _, g in df.groupby("service_category")]
    welch = anova_oneway(groups, use_var="unequal")
    f_std, p_std = stats.f_oneway(*groups)
    grand = df["rating"].mean()
    ss_between = sum(len(g) * (g.mean() - grand) ** 2 for g in groups)
    eta2 = ss_between / ((df["rating"] - grand) ** 2).sum()
    h, p_kw = stats.kruskal(*groups)
    desc = df.groupby("service_category")["rating"].agg(["count", "mean", "std", "median"]).round(3)
    desc["ci_low"] = desc["mean"] - 1.96 * desc["std"] / np.sqrt(desc["count"])
    desc["ci_high"] = desc["mean"] + 1.96 * desc["std"] / np.sqrt(desc["count"])
    desc.round(3).to_csv(TAB / "rq3_rating_by_category.csv")
    say(f"DV = star rating, n = {len(df)}\n{desc.to_string()}")
    say(f"One-way ANOVA F({len(groups) - 1}, {len(df) - len(groups)}) = {f_std:.2f}, p {fmt_p(p_std)}, η² = {eta2:.3f}")
    say(f"Welch ANOVA F = {welch.statistic:.2f}, p {fmt_p(welch.pvalue)} (unequal variances)")
    say(f"Kruskal-Wallis H({len(groups) - 1}) = {h:.2f}, p {fmt_p(p_kw)} (ordinal DV)")
    tukey = pairwise_tukeyhsd(df["rating"], df["service_category"])
    tk = pd.DataFrame(tukey.summary().data[1:], columns=tukey.summary().data[0])
    tk.to_csv(TAB / "rq3_tukey_hsd.csv", index=False)
    say("Tukey HSD:\n" + tk.to_string(index=False))

    ar = DATA_PROCESSED / "analyzer_results.jsonl"
    if ar.exists():
        res = pd.read_json(ar, lines=True).drop_duplicates("review_id").merge(
            pd.read_csv(DATA_PROCESSED / "analysis_sample.csv")[["review_id", "service_category"]], on="review_id")
        res["score"] = res["overall_sentiment"].map({"negative": -1, "neutral": 0, "positive": 1})
        if res["service_category"].nunique() == desc.shape[0]:
            h2, p2 = stats.kruskal(*[g["score"].values for _, g in res.groupby("service_category")])
            say(f"Secondary DV = LLM sentiment score (-1/0/+1), n = {len(res)}: Kruskal-Wallis H = {h2:.2f}, p {fmt_p(p2)}")
        else:
            say(f"Secondary DV (LLM sentiment) waits for all categories to be analysed ({len(res)} reviews so far).")

    ps.apply()
    d = desc.sort_values("mean")
    fig, ax = plt.subplots(figsize=(7.5, 3.6))
    y_pos = range(len(d))
    ax.hlines(y_pos, d["ci_low"], d["ci_high"], color=ps.INK_2, linewidth=1.2)
    ax.plot(d["mean"], y_pos, "o", color=ps.BLUE, markersize=7)
    for i, (m, n) in enumerate(zip(d["mean"], d["count"])):
        ax.text(m, i + 0.22, f"{m:.2f} (n = {n:,})", ha="center", fontsize=8, color=ps.INK_2)
    ax.set_yticks(list(y_pos), labels=[c.replace("_", " ") for c in d.index])
    ax.set_xlim(1, 5)
    ax.set_xlabel("Mean star rating (95% CI)")
    ax.grid(axis="y", visible=False)
    fig.savefig(FIG / "rq3_rating_by_category.png")
    plt.close(fig)
    say("")


# ---------------------------------------------------------------- RQ4
def rq4():
    say("## RQ4 - Does RAG grounding improve reply groundedness?")
    path = DATA_PROCESSED / "rq4_ablation.jsonl"
    if not path.exists():
        say("Skipped: run `python -m analysis.rq4_rag_ablation` first.\n")
        return
    df = pd.read_json(path, lines=True)
    rows = []
    for metric in ["groundedness", "helpfulness", "unsupported_claims"]:
        a, b = df[f"rag_{metric}"], df[f"no_rag_{metric}"]
        d = a - b
        t_stat, p_t = stats.ttest_rel(a, b)
        w = stats.wilcoxon(a, b, zero_method="wilcox") if (d != 0).any() else None
        rows.append({"metric": metric, "n": len(df), "mean_rag": a.mean(), "mean_no_rag": b.mean(),
                     "mean_diff": d.mean(), "sd_diff": d.std(), "cohen_dz": d.mean() / d.std() if d.std() else np.nan,
                     "t": t_stat, "p_t": p_t, "wilcoxon_W": w.statistic if w else np.nan,
                     "p_wilcoxon": w.pvalue if w else np.nan})
    out = pd.DataFrame(rows).round(4)
    out.to_csv(TAB / "rq4_paired_tests.csv", index=False)
    for r in out.itertuples():
        say(f"{r.metric}: RAG M = {r.mean_rag:.2f} vs no-RAG M = {r.mean_no_rag:.2f}; "
            f"t({r.n - 1}) = {r.t:.2f}, p {fmt_p(r.p_t)}, d_z = {r.cohen_dz:.2f}; Wilcoxon p {fmt_p(r.p_wilcoxon)}")
    a_bad, b_bad = df["rag_unsupported_claims"] > 0, df["no_rag_unsupported_claims"] > 0
    table = [[(~a_bad & ~b_bad).sum(), (~a_bad & b_bad).sum()], [(a_bad & ~b_bad).sum(), (a_bad & b_bad).sum()]]
    m = mcnemar(table, exact=True)
    say(f"Replies with >= 1 unsupported claim: RAG {a_bad.mean():.1%} vs no-RAG {b_bad.mean():.1%}; "
        f"McNemar exact p {fmt_p(m.pvalue)}")
    ps.apply()
    diff = (df["rag_groundedness"] - df["no_rag_groundedness"]).value_counts().reindex(range(-4, 5), fill_value=0)
    fig, ax = plt.subplots(figsize=(7.5, 3.4))
    ax.bar(diff.index, diff.values, color=ps.BLUE, width=0.62)
    for x, v in zip(diff.index, diff.values):
        if v:
            ax.text(x, v + 0.3, str(v), ha="center", fontsize=8.5, color=ps.INK)
    ax.set_xticks(range(-4, 5))
    ax.set_xlabel("Groundedness difference per complaint (RAG minus no-RAG; > 0 favours RAG)")
    ax.set_ylabel("Complaints")
    ax.grid(axis="x", visible=False)
    fig.savefig(FIG / "rq4_groundedness_difference.png")
    plt.close(fig)
    sub = df.assign(has_guidance=df["n_hits"] > 0).groupby("has_guidance")[
        ["rag_groundedness", "no_rag_groundedness"]].mean().round(2)
    say(f"By whether any official guidance was retrieved:\n{sub.to_string()}")

    human = DATA_PROCESSED / "rq4_human_rating.xlsx"
    if human.exists():
        h = pd.read_excel(human, sheet_name="rate_me").merge(pd.read_excel(human, sheet_name="key_do_not_open"),
                                                             on="review_id")
        h = h.dropna(subset=["A_groundedness_1to5", "B_groundedness_1to5"])
        if len(h) >= 20:
            j = df.set_index("review_id")
            human_scores, judge_scores = [], []
            for r in h.itertuples():
                for side in ("A", "B"):
                    cond = r.A_is if side == "A" else ("no_rag" if r.A_is == "rag" else "rag")
                    human_scores.append(int(getattr(r, f"{side}_groundedness_1to5")))
                    judge_scores.append(int(j.loc[r.review_id, f"{cond}_groundedness"]))
            kw = cohen_kappa_score(human_scores, judge_scores, weights="quadratic")
            rho, p_rho = stats.spearmanr(human_scores, judge_scores)
            say(f"Judge validity vs human ratings ({len(human_scores)} replies): quadratic-weighted κ = {kw:.3f}, "
                f"Spearman ρ = {rho:.3f}, p {fmt_p(p_rho)}")
        else:
            say(f"Human validation: {len(h)}/30 rated so far (need >= 20).")
    say("")


def main():
    TAB.mkdir(parents=True, exist_ok=True)
    FIG.mkdir(parents=True, exist_ok=True)
    say("# Results summary (auto-generated by analysis/stats_tests.py)\n")
    for block in (rq1, rq2, rq3, rq4):
        block()
    (ROOT / "reports" / "results_summary.md").write_text("\n".join(summary), encoding="utf-8")


if __name__ == "__main__":
    main()
