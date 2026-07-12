"""Component-level offline evaluation: Baseline vs Popularity vs CB-only vs
CF-only vs Hybrid, on the SAME leak-free temporal split as results_eval_clean.py.

The thesis objectives require the content-based and collaborative models to be
evaluated INDIVIDUALLY, not only as blended into the hybrid, and to compare the
recency baseline against a popularity baseline. Every model is fit ONLY on
interactions before the 2025-01-01 split and evaluated on the held-out slice
with recommender.evaluator.Evaluator at K in {5, 10, 20}.

Outputs:
  results/components_eval.csv  -- machine-readable table
  results/components_eval.txt  -- human-readable report
"""

from __future__ import annotations

import csv
from pathlib import Path

import pandas as pd

from recommender.baseline import BaselineRecommender
from recommender.evaluator import Evaluator
from recommender.hybrid import HybridRecommender
from recommender.popularity import PopularityRecommender
from recommender.standalone import CollaborativeOnlyRecommender, ContentOnlyRecommender
from recommender.utils import load_data

RESULTS_DIR = Path(__file__).parent / "results"
SPLIT_DATE = pd.Timestamp("2025-01-01")
K_VALUES = [5, 10, 20]

MODEL_ORDER = ["Baseline", "Popularity", "ContentBased", "Collaborative", "Hybrid"]


def main() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    products_df, users_df, interactions_df = load_data()
    interactions_df = interactions_df.copy()
    interactions_df["timestamp"] = pd.to_datetime(interactions_df["timestamp"])
    train_df = interactions_df[interactions_df["timestamp"] < SPLIT_DATE].copy()
    test_df = interactions_df[interactions_df["timestamp"] >= SPLIT_DATE].copy()

    lines: list[str] = []

    def emit(text: str = "") -> None:
        print(text)
        lines.append(text)

    emit("=" * 78)
    emit("COMPONENT-LEVEL leak-free evaluation (train-only fit, held-out test)")
    emit("=" * 78)
    emit(f"Split date: {SPLIT_DATE.date()}")
    emit(f"Train interactions: {len(train_df):,} | Test interactions: {len(test_df):,}")
    emit(f"Train users: {train_df['user_id'].nunique():,} | Test users: {test_df['user_id'].nunique():,}")
    emit()

    emit("Fitting all five models on TRAIN ONLY...")
    models = {
        "Baseline": BaselineRecommender().fit(products_df, train_df),
        "Popularity": PopularityRecommender().fit(products_df, train_df),
        "ContentBased": ContentOnlyRecommender().fit(products_df, train_df),
        "Collaborative": CollaborativeOnlyRecommender().fit(products_df, train_df),
        "Hybrid": HybridRecommender().fit(products_df, users_df, train_df),
    }
    emit()

    evaluator = Evaluator()
    results: dict[str, dict] = {}
    for name in MODEL_ORDER:
        emit(f"Evaluating {name}...")
        results[name] = evaluator.evaluate(models[name], interactions_df, products_df, K_VALUES)
    emit()

    rows: list[dict] = []
    for k in K_VALUES:
        emit("-" * 78)
        emit(f"K = {k}")
        emit("-" * 78)
        emit("Model         | Precision | Recall | NDCG  | Coverage | Diversity | Users")
        emit("--------------|-----------|--------|-------|----------|-----------|------")
        for name in MODEL_ORDER:
            m = results[name][k]
            emit(f"{name:<13} | {m['precision']['mean']:.3f}     | {m['recall']['mean']:.3f}  | "
                 f"{m['ndcg']['mean']:.3f} | {m['coverage']:.3f}    | {m['diversity']['mean']:.3f}     | {m['n_users_evaluated']}")
            rows.append({
                "model": name,
                "k": k,
                "precision": m["precision"]["mean"],
                "recall": m["recall"]["mean"],
                "ndcg": m["ndcg"]["mean"],
                "coverage": m["coverage"],
                "diversity": m["diversity"]["mean"],
                "n_users_evaluated": m["n_users_evaluated"],
            })
        emit()

    txt_path = RESULTS_DIR / "components_eval.txt"
    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    csv_path = RESULTS_DIR / "components_eval.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["model", "k", "precision", "recall", "ndcg", "coverage", "diversity", "n_users_evaluated"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {txt_path}")
    print(f"Wrote {csv_path}")


if __name__ == "__main__":
    main()
