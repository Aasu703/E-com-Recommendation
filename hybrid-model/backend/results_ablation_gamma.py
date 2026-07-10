"""Gamma (cold-start threshold) ablation for the hybrid recommender.

alpha = Uc / (Uc + gamma), where Uc is a user's interaction count and gamma
(COLD_START_THRESHOLD) was a hand-picked constant of 3 in recommender/hybrid.py.
recommender/hybrid.py now exposes gamma as an optional HybridRecommender(gamma=...)
constructor argument (default unchanged at 3) so it can be swept without
touching the scoring formula itself.

Uses the same train-only fit / held-out test split as results_eval_clean.py
(train < 2025-01-01, test >= 2025-01-01) so these numbers are directly
comparable to the Task 1 clean results. gamma only affects alpha computation
inside HybridRecommender.recommend(), not model fitting, so we fit the
CB/CF sub-models once and vary COLD_START_THRESHOLD on the same fitted
instance between evaluation runs -- this is equivalent to refitting for each
gamma value (fit() does not depend on gamma) but avoids redundant SVD/TF-IDF
work.

Outputs:
  results/gamma_ablation.txt
  results/gamma_ablation.csv
"""

from __future__ import annotations

import csv
from pathlib import Path

import pandas as pd

from recommender.evaluator import Evaluator
from recommender.hybrid import HybridRecommender
from recommender.utils import load_data

RESULTS_DIR = Path(__file__).parent / "results"
SPLIT_DATE = pd.Timestamp("2025-01-01")
GAMMA_VALUES = [1, 3, 5, 10]
K = 10


def main() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    products_df, users_df, interactions_df = load_data()
    interactions_df = interactions_df.copy()
    interactions_df["timestamp"] = pd.to_datetime(interactions_df["timestamp"])

    train_df = interactions_df[interactions_df["timestamp"] < SPLIT_DATE].copy()

    lines: list[str] = []

    def emit(text: str = "") -> None:
        print(text)
        lines.append(text)

    emit("=" * 60)
    emit("Gamma (cold-start threshold) ablation")
    emit("alpha = Uc / (Uc + gamma)")
    emit("=" * 60)
    emit(f"Split date: {SPLIT_DATE.date()} | Train interactions: {len(train_df):,}")
    emit(f"K = {K}")
    emit()

    hybrid = HybridRecommender().fit(products_df, users_df, train_df)
    evaluator = Evaluator()

    rows = []
    emit("gamma | Precision@10 | NDCG@10")
    emit("------|--------------|--------")
    for gamma in GAMMA_VALUES:
        hybrid.COLD_START_THRESHOLD = gamma
        results = evaluator.evaluate(hybrid, interactions_df, products_df, K_values=[K])
        precision = results[K]["precision"]["mean"]
        ndcg = results[K]["ndcg"]["mean"]
        recall = results[K]["recall"]["mean"]
        coverage = results[K]["coverage"]
        emit(f"{gamma:<5} | {precision:.4f}       | {ndcg:.4f}")
        rows.append({"gamma": gamma, "k": K, "precision": precision, "recall": recall, "ndcg": ndcg, "coverage": coverage})

    emit()
    best_precision = max(rows, key=lambda r: r["precision"])
    best_ndcg = max(rows, key=lambda r: r["ndcg"])
    emit(f"Highest Precision@{K}: gamma={best_precision['gamma']} ({best_precision['precision']:.4f})")
    emit(f"Highest NDCG@{K}: gamma={best_ndcg['gamma']} ({best_ndcg['ndcg']:.4f})")
    emit(f"Current default in recommender/hybrid.py: gamma=3 (unchanged by this ablation)")

    txt_path = RESULTS_DIR / "gamma_ablation.txt"
    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    csv_path = RESULTS_DIR / "gamma_ablation.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["gamma", "k", "precision", "recall", "ndcg", "coverage"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {txt_path}")
    print(f"Wrote {csv_path}")


if __name__ == "__main__":
    main()
