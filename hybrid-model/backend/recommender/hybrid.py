"""Adaptive weighted hybrid recommendation engine."""

from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .collaborative import CollaborativeRecommender
from .content_based import ContentBasedRecommender
from .utils import min_max_normalize

logger = logging.getLogger(__name__)


class HybridRecommender:
    """Weighted hybrid recommender with adaptive alpha and festival context."""

    festival_categories = {
        "Traditional Attire",
        "Kitchen & Home",
        "Handicrafts & Art",
        "Daily Groceries",
        "Traditional Gifts",
        "Electronics",  # Festival electronics are big in Dashain
    }
    COLD_START_THRESHOLD = 3  # default gamma in the formula

    def __init__(self, gamma: int = COLD_START_THRESHOLD) -> None:
        """Initialize unfitted content and collaborative models.

        gamma overrides the class-level COLD_START_THRESHOLD default for this
        instance only (used by results_ablation_gamma.py); existing callers
        that construct HybridRecommender() with no arguments are unaffected.
        """
        self.cb = ContentBasedRecommender()
        self.cf = CollaborativeRecommender()
        self.COLD_START_THRESHOLD = gamma
        self.products_df: pd.DataFrame | None = None
        self.users_df: pd.DataFrame | None = None
        self.interactions_df: pd.DataFrame | None = None
        self.is_fitted = False

    def fit(
        self,
        products_df: pd.DataFrame,
        users_df: pd.DataFrame,
        interactions_df: pd.DataFrame,
    ) -> "HybridRecommender":
        """Fit content-based and collaborative sub-models."""
        self.products_df = products_df.reset_index(drop=True).copy()
        self.users_df = users_df.reset_index(drop=True).copy()
        self.interactions_df = interactions_df.reset_index(drop=True).copy()
        self.cb.fit(self.products_df)
        self.cf.fit(self.interactions_df, self.products_df)
        self.is_fitted = True
        return self

    def recommend(self, user_id: str, top_k: int = 10, context: dict | None = None) -> list[dict]:
        """Return hybrid recommendations sorted by score."""
        if not self.is_fitted or self.products_df is None or self.interactions_df is None:
            logger.warning("HybridRecommender used before fit")
            return []
        context = context or {}
        month = context.get("month")
        exclude_interacted = context.get("exclude_interacted", True)
        exclude_out_of_stock = context.get("exclude_out_of_stock", True)
        seed_product = context.get("seed_product")
        products = self.products_df.set_index("product_id")

        if user_id not in self.cf.user_interaction_counts:
            logger.warning("Unknown user %s, returning popularity-informed hybrid fallback", user_id)

        cf_raw = self.cf.predictions_df.loc[user_id] if self.cf.predictions_df is not None and user_id in self.cf.predictions_df.index else pd.Series(0, index=products.index)
        cf_norm = pd.Series(min_max_normalize(cf_raw.to_numpy()), index=cf_raw.index)

        cb_scores = pd.Series(0.0, index=products.index)
        seed = seed_product
        if not seed:
            history = self.interactions_df.loc[self.interactions_df["user_id"] == user_id]
            if not history.empty:
                seed = history.sort_values("timestamp").iloc[-1]["product_id"]
        if seed and seed in self.cb.product_index and self.cb.similarity_matrix is not None:
            idx = self.cb.product_index[seed]
            cb_scores = pd.Series(self.cb.similarity_matrix[idx], index=self.cb.products_df["product_id"])
            cb_scores.loc[seed] = 0

        if cf_norm.max() == 0 and cb_scores.max() == 0:
            for item in self.cf.popularity_fallback:
                cf_norm.loc[item["product_id"]] = float(item["popularity_score"])

        seen: set[str] = set()
        if exclude_interacted:
            seen = set(self.interactions_df.loc[self.interactions_df["user_id"] == user_id, "product_id"])
        results: list[dict] = []
        for product_id, row in products.iterrows():
            if product_id in seen:
                continue
            if exclude_out_of_stock and not bool(row["in_stock"]):
                continue
            cf_score = float(cf_norm.get(product_id, 0.0))
            cb_score = float(cb_scores.get(product_id, 0.0))
            alpha = self._compute_alpha(user_id, product_id, month)
            hybrid_score = alpha * cf_score + (1 - alpha) * cb_score
            
            freshness = bool(row["is_new_arrival"])
            if freshness:
                hybrid_score += 0.08
            
            # Festival Boosting (Dashain/Tihar)
            is_festival = month in {10, 11} and row["category"] in self.festival_categories
            if is_festival:
                hybrid_score += 0.25  # Localized boost multiplier
                
            results.append({
                "product_id": product_id,
                "name": row["name"],
                "category": row["category"],
                "subcategory": row["subcategory"],
                "brand": row["brand"],
                "price_npr": int(row["price_npr"]),
                "avg_rating": None if pd.isna(row["avg_rating"]) else float(row["avg_rating"]),
                "in_stock": bool(row["in_stock"]),
                "is_new_arrival": freshness,
                "cf_score": cf_score,
                "cb_score": float(np.clip(cb_score, 0, 1)),
                "hybrid_score": float(hybrid_score),
                "alpha_used": float(alpha),
                "freshness_boost_applied": freshness,
                "is_festival_recommendation": bool(is_festival),
            })
        results.sort(key=lambda item: item["hybrid_score"], reverse=True)
        return results[:top_k]

    def _compute_alpha(self, user_id: str, product_id: str, month: int | None) -> float:
        """Compute adaptive alpha using saturation curve: alpha = Uc / (Uc + gamma)."""
        if self.products_df is None:
            return 0.15
        
        u_c = self.cf.user_interaction_counts.get(user_id, 0)
        # alpha_u = Uc / (Uc + gamma)
        alpha = u_c / (u_c + self.COLD_START_THRESHOLD)
        
        row = self.products_df.loc[self.products_df["product_id"] == product_id]
        if row.empty:
            return float(alpha)
        
        product = row.iloc[0]
        # For new arrivals, we prefer content-based (lower alpha)
        if bool(product["is_new_arrival"]):
            alpha *= 0.5
            
        # For festivals, we might want to favor content/discovery slightly if it's a cold-start scenario
        # but the formula already handles cold start well.
        return float(alpha)

    def save(self, path: Path | str) -> None:
        """Save the full hybrid model."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: Path | str) -> "HybridRecommender":
        """Load a saved hybrid model."""
        return joblib.load(Path(path))
