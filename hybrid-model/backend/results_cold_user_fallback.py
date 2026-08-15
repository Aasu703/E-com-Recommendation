"""Cold-user fallback experiment (RQ3 follow-up).

RESULTS_SUMMARY.md §7 shows zero-history users get alpha=0 under the shipped
adaptive strategy, which nullifies the popularity fallback populated into
cf_score_arr, and the shipped model never reads users.csv's onboarding
`preferred_categories` column at all. `HybridRecommender(cold_user_fallback=True)`
(recommender/hybrid.py) is an opt-in pathway that, only for zero-history users
under the adaptive strategy, forces alpha=1.0 (so the popularity fallback
actually contributes) and adds a +0.08 boost to products in the user's
onboarding preferred_categories. The shipped default (cold_user_fallback=False)
is unchanged.

Same train-only fit / held-out test split and segment definitions as
tests/run_advanced_evaluation.py RQ3 (train < 2025-01-01, test >= 2025-01-01;
zero-history = 0 train interactions, low-activity = 1-3).

Outputs:
  results/cold_user_fallback.txt
  results/cold_user_fallback.csv
"""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
import pandas as pd

from recommender.hybrid import HybridRecommender
from recommender.utils import load_data

RESULTS_DIR = Path(__file__).parent / "results"
SPLIT_DATE = pd.Timestamp("2025-01-01")
K = 10
COLD_START_THRESHOLD = 3


def evaluate_segment(
    hybrid: HybridRecommender,
    user_list: list[str],
    test_df: pd.DataFrame,
    products_df: pd.DataFrame,
) -> dict | None:
    if not user_list:
        return None
    precision, recall, ndcg = [], [], []
    covered = set()
    for user_id in user_list:
        actual = set(test_df.loc[test_df["user_id"] == user_id, "product_id"])
        recs = hybrid.recommend(user_id, top_k=K)
        rec_ids = [r["product_id"] for r in recs]
        covered.update(rec_ids)
        hits = [1 if pid in actual else 0 for pid in rec_ids]
        precision.append(sum(hits) / K)
        recall.append(sum(hits) / max(len(actual), 1))
        dcg = sum(hit / np.log2(idx + 2) for idx, hit in enumerate(hits))
        idcg = sum(1 / np.log2(idx + 2) for idx in range(min(len(actual), K)))
        ndcg.append(dcg / idcg if idcg > 0 else 0)
    return {
        "n": len(user_list),
        "precision": float(np.mean(precision)),
        "recall": float(np.mean(recall)),
        "ndcg": float(np.mean(ndcg)),
        "coverage": len(covered) / len(products_df),
    }


def main() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    products_df, users_df, interactions_df = load_data()
    interactions_df = interactions_df.copy()
    interactions_df["timestamp"] = pd.to_datetime(interactions_df["timestamp"])

    train_df = interactions_df[interactions_df["timestamp"] < SPLIT_DATE].copy()
    test_df = interactions_df[interactions_df["timestamp"] >= SPLIT_DATE].copy()

    train_counts = train_df["user_id"].value_counts().to_dict()
    test_users = list(test_df["user_id"].unique())
    zero_users = [u for u in test_users if train_counts.get(u, 0) == 0]
    low_users = [u for u in test_users if 1 <= train_counts.get(u, 0) <= COLD_START_THRESHOLD]

    lines: list[str] = []

    def emit(text: str = "") -> None:
        print(text)
        lines.append(text)

    emit("=" * 70)
    emit("Cold-user fallback experiment (opt-in; shipped default unaffected)")
    emit("=" * 70)
    emit(
        f"Split date: {SPLIT_DATE.date()} | Zero-history test users: {len(zero_users)} "
        f"| Low-activity test users: {len(low_users)}"
    )
    emit()

    rows = []
    variants = [
        ("shipped (cold_user_fallback=False)", False),
        ("experimental (cold_user_fallback=True)", True),
    ]
    for label, fallback in variants:
        hybrid = HybridRecommender(cold_user_fallback=fallback).fit(products_df, users_df, train_df)
        for seg_name, seg_users in [
            ("Zero-history (0 train)", zero_users),
            ("Low-activity (1-3 train)", low_users),
        ]:
            m = evaluate_segment(hybrid, seg_users, test_df, products_df)
            if m is None:
                continue
            emit(
                f"{label} | {seg_name}: Precision@{K}={m['precision']:.4f} "
                f"Recall@{K}={m['recall']:.4f} NDCG@{K}={m['ndcg']:.4f} "
                f"Coverage={m['coverage']:.4f} (n={m['n']})"
            )
            rows.append({"variant": label, "segment": seg_name, "k": K, **m})
        emit()

    txt_path = RESULTS_DIR / "cold_user_fallback.txt"
    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    csv_path = RESULTS_DIR / "cold_user_fallback.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["variant", "segment", "k", "n", "precision", "recall", "ndcg", "coverage"]
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {txt_path}")
    print(f"Wrote {csv_path}")


if __name__ == "__main__":
    main()
