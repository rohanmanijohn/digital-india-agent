"""Sample-size calculations must reproduce the figures reported in the synopsis."""
from analysis import sample_size as ss
from analysis.quota import is_daily_limit
from analysis.stats_tests import star_to_sentiment


def test_mcnemar_sample_size():
    assert ss.mcnemar_n(0.20, 0.08) == 243


def test_ci_sample_size():
    assert ss.ci_proportion_n(0.5, 0.05) == 385


def test_chisq_sample_size():
    assert ss.chisq_n(0.10, 9) == 1565


def test_anova_sample_size():
    assert ss.anova_n(0.10, 5) == 1199


def test_paired_t_sample_size():
    assert ss.paired_t_n(0.30) == 90


def test_star_mapping():
    assert [star_to_sentiment(r) for r in range(1, 6)] == ["negative", "negative", "neutral", "positive", "positive"]


def test_daily_limit_detection():
    assert is_daily_limit(Exception("Rate limit reached ... on requests per day (RPD): Limit 1000"))
    assert not is_daily_limit(Exception("Rate limit reached ... on tokens per minute (TPM)"))
