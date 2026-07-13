"""Literal 80/20 temporal split evaluation of the five models at K=10.

The thesis methodology describes an 80/20 time-based split. This script derives
the cutoff empirically as the 80th-percentile interaction timestamp, so that
~80% of interactions fall in train and ~20% in test, then fits every model ONLY
on the train slice and evaluates on the held-out test slice (leak-free).

The fixed-date protocol (test >= 2025-01-01) is reported alongside as a
sensitivity check; the thesis reports both.

Outputs:
  results/eval_80_20.csv
  results/eval_80_20.txt
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
K = 10
FIXED_DATE = pd.Timestamp("2025-01-01")
MODEL_ORDER = ["Baseline", "Popularity", "ContentBased", "Collaborative", "Hybrid"]


def fit_all(products_df, users_df, train_df) -> dict:
    return {
        "Baseline": BaselineRecommender().fit(products_df, train_df),
        "Popularity": PopularityRecommender().fit(products_df, train_df),
        "ContentBased": ContentOnlyRecommender().fit(products_df, train_df),
        "Collaborative": CollaborativeOnlyRecommender().fit(products_df, train_df),
        "Hybrid": HybridRecommender().fit(products_df, users_df, train_df),
    }


def evaluate_protocol(name, cutoff, products_df, users_df, interactions_df, evaluator, emit, rows):
    train_df = interactions_df[interactions_df["timestamp"] < cutoff].copy()
    test_df = interactions_df[interactions_df["timestamp"] >= cutoff].copy()
    emit("-" * 78)
    emit(f"{name}: cutoff = {cutoff}  (train {len(train_df):,} rows / test {len(test_df):,} rows,"
         f" {len(train_df) / len(interactions_df):.1%} / {len(test_df) / len(interactions_df):.1%})")
    emit(f"Train users: {train_df['user_id'].nunique()} | Test users: {test_df['user_id'].nunique()}")
    emit("-" * 78)
    emit("Model         | Precision@10 | Recall@10 | NDCG@10 | Coverage@10 | Users")
    emit("--------------|--------------|-----------|---------|-------------|------")
    models = fit_all(products_df, users_df, train_df)
    for model_name in MODEL_ORDER:
        res = evaluator.evaluate(models[model_name], interactions_df, products_df, K_values=[K], split_date=cutoff)[K]
        emit(f"{model_name:<13} | {res['precision']['mean']:.4f}       | {res['recall']['mean']:.4f}    | "
             f"{res['ndcg']['mean']:.4f}  | {res['coverage']:.4f}      | {res['n_users_evaluated']}")
        rows.append({
            "protocol": name,
            "cutoff": str(cutoff.date()),
            "model": model_name,
            "k": K,
            "precision": res["precision"]["mean"],
            "recall": res["recall"]["mean"],
            "ndcg": res["ndcg"]["mean"],
            "coverage": res["coverage"],
            "diversity": res["diversity"]["mean"],
            "n_users_evaluated": res["n_users_evaluated"],
        })
    emit()


def main() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    products_df, users_df, interactions_df = load_data()
    interactions_df = interactions_df.copy()
    interactions_df["timestamp"] = pd.to_datetime(interactions_df["timestamp"])

    cutoff_80 = interactions_df["timestamp"].quantile(0.8)

    lines: list[str] = []

    def emit(text: str = "") -> None:
        print(text)
        lines.append(text)

    emit("=" * 78)
    emit("80/20 TEMPORAL SPLIT evaluation (primary) + fixed-date sensitivity check")
    emit("=" * 78)
    emit(f"Total interactions: {len(interactions_df):,}")
    emit(f"80th-percentile timestamp (80/20 cutoff): {cutoff_80}")
    emit()

    evaluator = Evaluator()
    rows: list[dict] = []
    evaluate_protocol("80/20 split", cutoff_80, products_df, users_df, interactions_df, evaluator, emit, rows)
    evaluate_protocol("Fixed-date (2025-01-01)", FIXED_DATE, products_df, users_df, interactions_df, evaluator, emit, rows)

    txt_path = RESULTS_DIR / "eval_80_20.txt"
    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    csv_path = RESULTS_DIR / "eval_80_20.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "protocol", "cutoff", "model", "k", "precision", "recall", "ndcg",
            "coverage", "diversity", "n_users_evaluated",
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {txt_path}")
    print(f"Wrote {csv_path}")


if __name__ == "__main__":
    main()
