"""Export the EDA plots from notebooks/01_EDA.ipynb as standalone PNGs, plus
one new grouped bar chart comparing Hybrid vs Baseline on the clean (leak-free)
Task 1 metrics.

Source data for the EDA plots: nepali_ecommerce_data/*.csv (same data, same
aggregations as 01_EDA.ipynb -- see REPO_AUDIT.md section 7 for the notebook's
embedded originals). Source data for the comparison plot:
results/clean_eval_results.csv (must exist -- run results_eval_clean.py first).

Output: results/figures/*.png
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import pandas as pd

from recommender.utils import load_data

RESULTS_DIR = Path(__file__).parent / "results"
FIGURES_DIR = RESULTS_DIR / "figures"

# Palette (validated categorical set, fixed order -- see dataviz skill palette.md)
SURFACE = "#fcfcfb"
INK_PRIMARY = "#0b0b0b"
INK_SECONDARY = "#52514e"
INK_MUTED = "#898781"
GRIDLINE = "#e1e0d9"
BASELINE_COLOR = "#898781"  # muted gray -- non-personalized control model
HYBRID_COLOR = "#2a78d6"  # categorical slot 1 (blue) -- the featured model

CATEGORY_COLORS = {
    "Traditional Attire": "#2a78d6",   # slot 1 blue
    "Handicrafts & Art": "#1baf7a",    # slot 2 aqua
    "Electronics": "#eda100",          # slot 3 yellow
    "Kitchen & Home": "#008300",       # slot 4 green
    "Daily Groceries": "#4a3aa7",      # slot 5 violet
    "Fashion & Accessories": "#e34948",# slot 6 red
    "Books & Education": "#e87ba4",    # slot 7 magenta
}


def _base_style(ax, title: str, xlabel: str = "", ylabel: str = "") -> None:
    ax.set_facecolor(SURFACE)
    ax.set_title(title, color=INK_PRIMARY, fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel(xlabel, color=INK_SECONDARY, fontsize=10)
    ax.set_ylabel(ylabel, color=INK_SECONDARY, fontsize=10)
    ax.tick_params(colors=INK_SECONDARY, labelsize=9)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    for spine in ("left", "bottom"):
        ax.spines[spine].set_color(INK_MUTED)
    ax.grid(axis="x", color=GRIDLINE, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)


def plot_top_products(interactions: pd.DataFrame, products: pd.DataFrame) -> None:
    top = (
        interactions.groupby("product_id")
        .size()
        .rename("interaction_count")
        .reset_index()
        .merge(products[["product_id", "name", "category"]], on="product_id", how="left")
        .sort_values("interaction_count", ascending=True)
        .tail(10)
    )
    fig, ax = plt.subplots(figsize=(9, 5.5), facecolor=SURFACE)
    colors = [CATEGORY_COLORS.get(c, INK_MUTED) for c in top["category"]]
    ax.barh(top["name"], top["interaction_count"], color=colors, height=0.6, zorder=3)
    for y, v in enumerate(top["interaction_count"]):
        ax.text(v + 0.3, y, str(int(v)), va="center", color=INK_SECONDARY, fontsize=8)
    _base_style(ax, "Top 10 Products by Interaction Count", xlabel="Interaction count")
    handles = [plt.Rectangle((0, 0), 1, 1, color=c) for c in CATEGORY_COLORS.values()]
    ax.legend(handles, CATEGORY_COLORS.keys(), loc="lower right", fontsize=7, frameon=False)
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "01_top_products_by_interactions.png", dpi=150)
    plt.close(fig)


def plot_user_interaction_distribution(interactions: pd.DataFrame) -> None:
    counts = interactions.groupby("user_id").size()
    fig, ax = plt.subplots(figsize=(8, 5), facecolor=SURFACE)
    ax.hist(counts, bins=20, color=HYBRID_COLOR, edgecolor=SURFACE, linewidth=1, zorder=3)
    ax.axvline(counts.mean(), color=INK_PRIMARY, linestyle="--", linewidth=1.2, zorder=4)
    ax.text(counts.mean() + 0.3, ax.get_ylim()[1] * 0.92, f"mean = {counts.mean():.1f}", color=INK_PRIMARY, fontsize=9)
    _base_style(ax, "Distribution of Interaction Counts Per User", xlabel="Interactions per user", ylabel="Number of users")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "02_interactions_per_user_distribution.png", dpi=150)
    plt.close(fig)


def plot_category_counts(products: pd.DataFrame) -> None:
    counts = products["category"].value_counts().reindex(CATEGORY_COLORS.keys())
    fig, ax = plt.subplots(figsize=(9, 5), facecolor=SURFACE)
    colors = [CATEGORY_COLORS[c] for c in counts.index]
    ax.barh(counts.index, counts.values, color=colors, height=0.6, zorder=3)
    for y, v in enumerate(counts.values):
        ax.text(v + 1, y, str(int(v)), va="center", color=INK_SECONDARY, fontsize=8)
    _base_style(ax, "Product Count by Category", xlabel="Number of products")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "03_products_by_category.png", dpi=150)
    plt.close(fig)


def plot_festival_share(interactions: pd.DataFrame) -> None:
    counts = interactions["is_festival_period"].astype(bool).value_counts()
    labels = ["Non-festival", "Festival (Dashain/Tihar)"]
    values = [counts.get(False, 0), counts.get(True, 0)]
    fig, ax = plt.subplots(figsize=(6, 5), facecolor=SURFACE)
    ax.bar(labels, values, color=[BASELINE_COLOR, HYBRID_COLOR], width=0.5, zorder=3)
    for x, v in enumerate(values):
        ax.text(x, v + 40, f"{v:,} ({v / sum(values):.1%})", ha="center", color=INK_SECONDARY, fontsize=9)
    _base_style(ax, "Festival vs Non-Festival Interactions", ylabel="Interaction count")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "04_festival_vs_nonfestival_interactions.png", dpi=150)
    plt.close(fig)


def plot_new_arrival_share(products: pd.DataFrame) -> None:
    counts = products["is_new_arrival"].astype(bool).value_counts()
    labels = ["Established", "New arrival"]
    values = [counts.get(False, 0), counts.get(True, 0)]
    fig, ax = plt.subplots(figsize=(6, 5), facecolor=SURFACE)
    ax.bar(labels, values, color=[BASELINE_COLOR, HYBRID_COLOR], width=0.5, zorder=3)
    for x, v in enumerate(values):
        ax.text(x, v + 5, f"{v} ({v / sum(values):.0%})", ha="center", color=INK_SECONDARY, fontsize=9)
    _base_style(ax, "New Arrival vs Established Products", ylabel="Product count")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "05_new_arrival_vs_established.png", dpi=150)
    plt.close(fig)


def plot_hybrid_vs_baseline() -> None:
    csv_path = RESULTS_DIR / "clean_eval_results.csv"
    if not csv_path.exists():
        print(f"SKIPPED hybrid_vs_baseline.png: {csv_path} not found -- run results_eval_clean.py first")
        return
    rows = list(csv.DictReader(open(csv_path, encoding="utf-8")))
    at_10 = {r["model"]: r for r in rows if r["k"] == "10"}
    if "Baseline" not in at_10 or "Hybrid" not in at_10:
        print("SKIPPED hybrid_vs_baseline.png: missing Baseline or Hybrid row at K=10")
        return

    metrics = ["precision", "recall", "ndcg", "coverage"]
    labels = ["Precision@10", "Recall@10", "NDCG@10", "Coverage@10"]
    baseline_vals = [float(at_10["Baseline"][m]) for m in metrics]
    hybrid_vals = [float(at_10["Hybrid"][m]) for m in metrics]

    x = range(len(metrics))
    width = 0.32
    fig, ax = plt.subplots(figsize=(9, 5.5), facecolor=SURFACE)
    b1 = ax.bar([i - width / 2 for i in x], baseline_vals, width, color=BASELINE_COLOR, label="Baseline", zorder=3)
    b2 = ax.bar([i + width / 2 for i in x], hybrid_vals, width, color=HYBRID_COLOR, label="Hybrid", zorder=3)
    for bars in (b1, b2):
        for bar in bars:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, h + 0.01, f"{h:.3f}", ha="center", va="bottom", color=INK_SECONDARY, fontsize=8)
    ax.set_xticks(list(x))
    ax.set_xticklabels(labels)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"{v:.2f}"))
    _base_style(ax, "Hybrid vs Baseline -- Clean (Leak-Free) Evaluation @ K=10", ylabel="Score")
    ax.grid(axis="y", color=GRIDLINE, linewidth=0.8, zorder=0)
    ax.grid(axis="x", visible=False)
    ax.legend(frameon=False, loc="upper right")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "hybrid_vs_baseline.png", dpi=150)
    plt.close(fig)


def main() -> None:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    products_df, users_df, interactions_df = load_data()

    plot_top_products(interactions_df, products_df)
    plot_user_interaction_distribution(interactions_df)
    plot_category_counts(products_df)
    plot_festival_share(interactions_df)
    plot_new_arrival_share(products_df)
    plot_hybrid_vs_baseline()

    saved = sorted(FIGURES_DIR.glob("*.png"))
    print(f"Saved {len(saved)} figures to {FIGURES_DIR}:")
    for p in saved:
        print(f"  {p.name}")


if __name__ == "__main__":
    main()
