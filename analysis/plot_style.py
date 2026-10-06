"""Shared matplotlib style for report figures (APA: no in-image titles; the caption carries the title)."""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

INK = "#0b0b0b"
INK_2 = "#52514e"
GRID = "#e4e3df"
BLUE = "#2a78d6"
# Diverging 1-5 stars: red arm, neutral gray midpoint, blue arm (validated: adjacent CVD dE >= 17, normal dE >= 21)
STAR_COLORS = ["#b42b2a", "#ef7d79", "#dcdad4", "#5598e7", "#104281"]
SENTIMENT_COLORS = {"negative": "#b42b2a", "neutral": "#dcdad4", "positive": "#104281"}


def apply():
    plt.rcParams.update({
        "figure.dpi": 110,
        "savefig.dpi": 220,
        "savefig.bbox": "tight",
        "font.family": "DejaVu Sans",
        "font.size": 10,
        "axes.edgecolor": GRID,
        "axes.labelcolor": INK_2,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.grid": True,
        "axes.axisbelow": True,
        "grid.color": GRID,
        "grid.linewidth": 0.6,
        "xtick.color": INK_2,
        "ytick.color": INK,
        "legend.frameon": False,
        "figure.facecolor": "white",
        "axes.facecolor": "white",
    })
