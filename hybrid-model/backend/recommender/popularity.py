"""Popularity baseline: rank products by interaction count."""

from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger(__name__)


class PopularityRecommender:
    """Non-personalized recommender that ranks products by interaction count.

    Unlike :class:`BaselineRecommender` (which sorts by most-recent interaction
    timestamp), this ranks the catalog by how many interactions each product
    received in the fitted period, so fitting it on the train slice keeps it
    leak-free. The same ranked list is returned to every user.
    """

    def __init__(self) -> None:
        self.products_df: pd.DataFrame | None = None
        self.interactions_df: pd.DataFrame | None = None
        self.ranked: pd.DataFrame | None = None
        self.is_fitted = False

    def fit(self, products_df: pd.DataFrame, interactions_df: pd.DataFrame) -> "PopularityRecommender":
        """Store the catalog and precompute the popularity ranking."""
        self.products_df = products_df.reset_index(drop=True).copy()
        self.interactions_df = interactions_df.reset_index(drop=True).copy()
        counts = (
            self.interactions_df.groupby("product_id").size().rename("interaction_count").reset_index()
        )
        merged = self.products_df.merge(counts, on="product_id", how="left")
        merged["interaction_count"] = merged["interaction_count"].fillna(0)
        # Ties broken deterministically by product_id so runs are reproducible.
        self.ranked = merged.sort_values(
            ["interaction_count", "product_id"], ascending=[False, True]
        ).reset_index(drop=True)
        self.is_fitted = True
        return self

    def recommend(self, user_id: str, top_k: int = 10, exclude_out_of_stock: bool = True) -> list[dict]:
        """Return the most-interacted products (same list for every user)."""
        if not self.is_fitted or self.ranked is None:
            logger.warning("PopularityRecommender used before fit")
            return []

        ranked = self.ranked
        if exclude_out_of_stock:
            ranked = ranked.loc[ranked["in_stock"].astype(bool)]

        results: list[dict] = []
        for _, row in ranked.head(top_k).iterrows():
            results.append({
                "product_id": row["product_id"],
                "name": row["name"],
                "category": row["category"],
                "subcategory": row.get("subcategory", ""),
                "brand": row.get("brand", ""),
                "price_npr": int(row["price_npr"]),
                "avg_rating": None if pd.isna(row.get("avg_rating")) else float(row.get("avg_rating")),
                "in_stock": bool(row.get("in_stock", True)),
                "is_new_arrival": bool(row.get("is_new_arrival", False)),
                "interaction_count": int(row["interaction_count"]),
                "hybrid_score": 0.0,
                "cf_score": 0.0,
                "cb_score": 0.0,
                "alpha_used": 0.0,
                "is_festival_recommendation": False,
                "freshness_boost_applied": False,
            })
        return results
