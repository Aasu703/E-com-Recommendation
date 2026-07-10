"""Leak-free offline evaluation: train-only fit, held-out time-split test.

Fixes a methodology bug in notebooks/05_evaluation.ipynb, where both
BaselineRecommender and HybridRecommender were fit on the FULL interactions
frame (including everything from 2025-01-01 onward) before being evaluated
against that same >= 2025-01-01 slice. That is train/test leakage: the models
had already seen the "held-out" interactions during fitting.

This script fits both models on interactions strictly before the split date
and evaluates them only on the held-out slice, using the same
recommender.evaluator.Evaluator machinery (and hence the same test-set
construction and metric definitions) as the original notebook, so the two
result sets are directly comparable.

Outputs:
  results/clean_eval_results.txt  -- human-readable report, clean vs leaky
  results/clean_eval_results.csv  -- machine-readable table, clean numbers only
"""

from __future__ import annotations

import csv
from pathlib import Path

import pandas as pd

from recommender.baseline import BaselineRecommender
from recommender.evaluator import Evaluator
from recommender.hybrid import HybridRecommender
from recommender.utils import load_data

RESULTS_DIR = Path(__file__).parent / "results"
SPLIT_DATE = pd.Timestamp("2025-01-01")
K_VALUES = [5, 10, 20]

# Verbatim from the executed cells of notebooks/05_evaluation.ipynb (see
# REPO_AUDIT.md section 6). These are the LEAKY numbers: that notebook fit
# both models on the full interactions frame before evaluating on the
# >= 2025-01-01 slice. Kept here only for an explicit side-by-side comparison.
LEAKY_RESULTS = {
    "Hybrid": {
        5: {"precision": 0.059, "recall": 0.044, "ndcg": 0.053, "coverage": 0.638, "diversity": 0.301},
        10: {"precision": 0.054, "recall": 0.082, "ndcg": 0.065, "coverage": 0.894, "diversity": 0.353},
        20: {"precision": 0.043, "recall": 0.133, "ndcg": 0.087, "coverage": 0.936, "diversity": 0.408},
    },
    "Baseline": {
        5: {"precision": 0.019, "recall": 0.015, "ndcg": 0.021, "coverage": 0.010, "diversity": 0.900},
        10: {"precision": 0.017, "recall": 0.027, "ndcg": 0.025, "coverage": 0.020, "diversity": 0.800},
        20: {"precision": 0.018, "recall": 0.060, "ndcg": 0.039, "coverage": 0.040, "diversity": 0.858},
    },
}


def flatten(model_name: str, results: dict) -> list[dict]:
    rows = []
    for k in K_VALUES:
        m = results[k]
        rows.append({
            "model": model_name,
            "k": k,
            "precision": m["precision"]["mean"],
            "recall": m["recall"]["mean"],
            "ndcg": m["ndcg"]["mean"],
            "coverage": m["coverage"],
            "diversity": m["diversity"]["mean"],
            "n_users_evaluated": m["n_users_evaluated"],
        })
    return rows


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

    emit("=" * 72)
    emit("CLEAN (leak-free) offline evaluation")
    emit("=" * 72)
    emit(f"Split date: {SPLIT_DATE.date()}")
    emit(f"Total interactions: {len(interactions_df):,}")
    emit(f"Train interactions (< split date, used to fit models): {len(train_df):,}")
    emit(f"Test interactions (>= split date, held out): {len(test_df):,}")
    emit(f"Train users: {train_df['user_id'].nunique():,} | Test users: {test_df['user_id'].nunique():,}")
    emit()

    emit("Fitting BaselineRecommender on TRAIN ONLY...")
    baseline = BaselineRecommender().fit(products_df, train_df)
    emit("Fitting HybridRecommender on TRAIN ONLY...")
    hybrid = HybridRecommender().fit(products_df, users_df, train_df)
    emit()

    evaluator = Evaluator()
    # Evaluator.evaluate() builds its own test set internally by filtering the
    # interactions_df passed to it for timestamp >= 2025-01-01, and evaluates
    # recommender.recommend() against it. The leakage fix is entirely in what
    # the models above were FIT on (train_df); passing the full interactions_df
    # here only affects test-set construction, which is identical to the
    # original (leaky) notebook run and keeps the comparison apples-to-apples.
    emit("Evaluating Hybrid on held-out test set...")
    hybrid_results = evaluator.evaluate(hybrid, interactions_df, products_df, K_VALUES)
    emit("Evaluating Baseline on held-out test set...")
    baseline_results = evaluator.evaluate(baseline, interactions_df, products_df, K_VALUES)
    emit()

    emit("-" * 72)
    emit("CLEAN RESULTS (train-only fit, held-out test)")
    emit("-" * 72)
    emit("Hybrid:")
    emit("K | Precision | Recall | NDCG | Coverage | Diversity | Users")
    emit("--|-----------|--------|------|----------|-----------|------")
    for k in K_VALUES:
        m = hybrid_results[k]
        emit(f"{k} | {m['precision']['mean']:.3f} | {m['recall']['mean']:.3f} | "
             f"{m['ndcg']['mean']:.3f} | {m['coverage']:.3f} | {m['diversity']['mean']:.3f} | {m['n_users_evaluated']}")
    emit()
    emit("Baseline:")
    emit("K | Precision | Recall | NDCG | Coverage | Diversity | Users")
    emit("--|-----------|--------|------|----------|-----------|------")
    for k in K_VALUES:
        m = baseline_results[k]
        emit(f"{k} | {m['precision']['mean']:.3f} | {m['recall']['mean']:.3f} | "
             f"{m['ndcg']['mean']:.3f} | {m['coverage']:.3f} | {m['diversity']['mean']:.3f} | {m['n_users_evaluated']}")
    emit()

    emit("-" * 72)
    emit("CLEAN vs LEAKY (notebooks/05_evaluation.ipynb) — Hybrid model")
    emit("-" * 72)
    emit("K | Metric    | Leaky | Clean | Delta")
    emit("--|-----------|-------|-------|------")
    for k in K_VALUES:
        clean = hybrid_results[k]
        leaky = LEAKY_RESULTS["Hybrid"][k]
        for metric, leaky_key in [("Precision", "precision"), ("Recall", "recall"), ("NDCG", "ndcg"), ("Coverage", "coverage")]:
            clean_val = clean[leaky_key]["mean"] if isinstance(clean[leaky_key], dict) else clean[leaky_key]
            leaky_val = leaky[leaky_key]
            emit(f"{k} | {metric:<9} | {leaky_val:.3f} | {clean_val:.3f} | {clean_val - leaky_val:+.3f}")
    emit()

    emit("-" * 72)
    emit("CLEAN vs LEAKY (notebooks/05_evaluation.ipynb) — Baseline model")
    emit("-" * 72)
    emit("K | Metric    | Leaky | Clean | Delta")
    emit("--|-----------|-------|-------|------")
    for k in K_VALUES:
        clean = baseline_results[k]
        leaky = LEAKY_RESULTS["Baseline"][k]
        for metric, leaky_key in [("Precision", "precision"), ("Recall", "recall"), ("NDCG", "ndcg"), ("Coverage", "coverage")]:
            clean_val = clean[leaky_key]["mean"] if isinstance(clean[leaky_key], dict) else clean[leaky_key]
            leaky_val = leaky[leaky_key]
            emit(f"{k} | {metric:<9} | {leaky_val:.3f} | {clean_val:.3f} | {clean_val - leaky_val:+.3f}")
    emit()

    txt_path = RESULTS_DIR / "clean_eval_results.txt"
    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    csv_path = RESULTS_DIR / "clean_eval_results.csv"
    rows = flatten("Baseline", baseline_results) + flatten("Hybrid", hybrid_results)
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["model", "k", "precision", "recall", "ndcg", "coverage", "diversity", "n_users_evaluated"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {txt_path}")
    print(f"Wrote {csv_path}")


if __name__ == "__main__":
    main()
