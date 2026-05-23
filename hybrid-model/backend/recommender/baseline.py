"""Baseline no-recommendation model for e-commerce."""

from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger(__name__)


class BaselineRecommender:
    """Return recent products without personalization."""

    def __init__(self) -> None:
        self.products_df: pd.DataFrame | None = None
        self.interactions_df: pd.DataFrame | None = None
        self.is_fitted = False

    def fit(self, products_df: pd.DataFrame, interactions_df: pd.DataFrame) -> "BaselineRecommender":
        """Store product catalog and interactions."""
        self.products_df = products_df.reset_index(drop=True).copy()
        self.interactions_df = interactions_df.reset_index(drop=True).copy()
        self.is_fitted = True
        return self

    def recommend(self, user_id: str, top_k: int = 10, exclude_out_of_stock: bool = True) -> list[dict]:
        """Return most recent products based on interaction timestamps."""
        if not self.is_fitted or self.products_df is None or self.interactions_df is None:
            logger.warning("BaselineRecommender used before fit")
            return []

        products = self.products_df.copy()
        if exclude_out_of_stock:
            products = products.loc[products["in_stock"].astype(bool)]

        recency = (
            self.interactions_df.groupby("product_id")["timestamp"]
            .max()
            .rename("last_interaction")
            .reset_index()
        )
        merged = products.merge(recency, on="product_id", how="left")
        merged["last_interaction"] = merged["last_interaction"].fillna("")
        merged = merged.sort_values("last_interaction", ascending=False)

        results: list[dict] = []
        for _, row in merged.head(top_k).iterrows():
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
                "hybrid_score": 0.0,
                "cf_score": 0.0,
                "cb_score": 0.0,
                "alpha_used": 0.0,
                "is_festival_recommendation": False,
                "freshness_boost_applied": False,
            })
        return results