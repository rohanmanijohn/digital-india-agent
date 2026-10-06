"""Minimum sample size per research question (alpha = .05, power = .80 unless stated).

Usage: python -m analysis.sample_size
Output: printed table + reports/tables/sample_size.csv
"""
import math

import pandas as pd
from scipy.stats import chi2, f, nct, ncf, ncx2, norm, t

from config import ASPECTS, APPS, ROOT

ALPHA, POWER = 0.05, 0.80
Z_A2, Z_B = norm.ppf(1 - ALPHA / 2), norm.ppf(POWER)


def mcnemar_n(psi: float, delta: float) -> int:
    """Paired proportions (Connor, 1987). psi = discordant proportion, delta = difference in discordant cells."""
    return math.ceil((Z_A2 * math.sqrt(psi) + Z_B * math.sqrt(psi - delta**2)) ** 2 / delta**2)


def ci_proportion_n(p: float = 0.5, e: float = 0.05) -> int:
    """n for a 95% CI of half-width e around a proportion (e.g. classifier accuracy)."""
    return math.ceil(Z_A2**2 * p * (1 - p) / e**2)


def chisq_n(w: float, df: int) -> int:
    """Chi-square test of independence, Cohen's w (noncentral chi-square)."""
    crit, n = chi2.ppf(1 - ALPHA, df), 10
    while 1 - ncx2.cdf(crit, df, n * w**2) < POWER:
        n += 1
    return n


def anova_n(effect_f: float, k: int) -> int:
    """One-way ANOVA, Cohen's f, k groups (total N)."""
    n = 2 * k
    while True:
        crit = f.ppf(1 - ALPHA, k - 1, n - k)
        if 1 - ncf.cdf(crit, k - 1, n - k, n * effect_f**2) >= POWER:
            return n
        n += 1


def paired_t_n(d: float) -> int:
    """Two-sided paired t-test, Cohen's d_z (noncentral t)."""
    n = 3
    while True:
        crit = t.ppf(1 - ALPHA / 2, n - 1)
        if 1 - nct.cdf(crit, n - 1, d * math.sqrt(n)) >= POWER:
            return n
        n += 1


def main():
    k_aspects = len(ASPECTS)
    k_categories = len({cat for _, cat in APPS.values()})
    rows = [
        ("RQ1", "McNemar (paired proportions)", "alpha=.05, power=.80, psi=0.20, delta=0.08", mcnemar_n(0.20, 0.08)),
        ("RQ1", "95% CI on accuracy", "Z=1.96, p=0.5, e=0.05", ci_proportion_n()),
        ("RQ2", f"Chi-square, {k_aspects} aspects x 2 (negative / not)",
         f"alpha=.05, power=.80, w=0.10 (small), df={k_aspects - 1}", chisq_n(0.10, k_aspects - 1)),
        ("RQ3", f"One-way ANOVA, k={k_categories} service categories",
         "alpha=.05, power=.80, f=0.10 (small)", anova_n(0.10, k_categories)),
        ("RQ4", "Paired t-test (RAG vs no-RAG, same reviews)", "alpha=.05, power=.80, d=0.30 (small-medium)",
         paired_t_n(0.30)),
    ]
    table = pd.DataFrame(rows, columns=["RQ", "Method", "Key parameters", "Minimum N"])
    out_dir = ROOT / "reports" / "tables"
    out_dir.mkdir(parents=True, exist_ok=True)
    table.to_csv(out_dir / "sample_size.csv", index=False)
    print(table.to_string(index=False))
    print(f"\nFinal minimum sample size (max across RQs): {table['Minimum N'].max()}")


if __name__ == "__main__":
    main()
