"""Offline evaluation metrics for recommendation models."""

from __future__ import annotations

import itertools
import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class Evaluator:
    """Evaluate recommenders with a time-based train/test split."""

    def evaluate(
        self,
        recommender,
        interactions_df: pd.DataFrame,
        products_df: pd.DataFrame,
        K_values: list[int] | None = None,
        min_test_interactions: int = 1,
        split_date: pd.Timestamp | str | None = None,
    ) -> dict:
        """Run precision, recall, NDCG, coverage, and diversity evaluation.

        The held-out test set is every interaction with timestamp >= split_date.
        split_date defaults to 2025-01-01 (the fixed-date protocol) so existing
        callers are unaffected; results_eval_80_20.py passes the 80th-percentile
        timestamp instead. The caller is responsible for having fit the model on
        interactions strictly before the same split_date (leak-free).
        """
        K_values = K_values or [5, 10, 20]
        cutoff = pd.Timestamp("2025-01-01") if split_date is None else pd.Timestamp(split_date)
        data = interactions_df.copy()
        data["timestamp"] = pd.to_datetime(data["timestamp"])
        test = data[data["timestamp"] >= cutoff]
        users = [u for u, grp in test.groupby("user_id") if len(grp) >= min_test_interactions]
        category_by_product = products_df.set_index("product_id")["category"].to_dict()
        out: dict = {}
        for k in K_values:
            precision, recall, ndcg, diversity = [], [], [], []
            covered: set[str] = set()
            for user_id in users:
                actual = set(test.loc[test["user_id"] == user_id, "product_id"])
                recs = recommender.recommend(user_id, top_k=k, context={"exclude_interacted": False}) if hasattr(recommender, "cb") else recommender.recommend(user_id, top_k=k)
                rec_ids = [r["product_id"] for r in recs]
                covered.update(rec_ids)
                hits = [1 if pid in actual else 0 for pid in rec_ids]
                precision.append(sum(hits) / k)
                recall.append(sum(hits) / max(len(actual), 1))
                dcg = sum(hit / np.log2(idx + 2) for idx, hit in enumerate(hits))
                ideal = sum(1 / np.log2(idx + 2) for idx in range(min(len(actual), k)))
                ndcg.append(dcg / ideal if ideal else 0)
                cats = [category_by_product.get(pid) for pid in rec_ids]
                pairs = list(itertools.combinations(cats, 2))
                same = sum(1 for a, b in pairs if a == b)
                diversity.append(1 - same / len(pairs) if pairs else 0)
            out[k] = {
                "precision": {"mean": float(np.mean(precision or [0])), "std": float(np.std(precision or [0]))},
                "recall": {"mean": float(np.mean(recall or [0])), "std": float(np.std(recall or [0]))},
                "ndcg": {"mean": float(np.mean(ndcg or [0])), "std": float(np.std(ndcg or [0]))},
                "coverage": float(len(covered) / len(products_df)) if len(products_df) else 0,
                "diversity": {"mean": float(np.mean(diversity or [0])), "std": float(np.std(diversity or [0]))},
                "n_users_evaluated": len(users),
            }
        return out

    def print_report(self, results: dict) -> None:
        """Print a compact ASCII metrics table."""
        print("K | Precision | Recall | NDCG | Coverage | Diversity | Users")
        print("--|-----------|--------|------|----------|-----------|------")
        for k, metrics in results.items():
            print(
                f"{k} | {metrics['precision']['mean']:.3f} | {metrics['recall']['mean']:.3f} | "
                f"{metrics['ndcg']['mean']:.3f} | {metrics['coverage']:.3f} | "
                f"{metrics['diversity']['mean']:.3f} | {metrics['n_users_evaluated']}"
            )
