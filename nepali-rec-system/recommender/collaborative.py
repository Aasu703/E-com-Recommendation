"""SVD collaborative filtering on implicit interaction scores."""

from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import svds

from .utils import get_popular_products

logger = logging.getLogger(__name__)


class CollaborativeRecommender:
    """SVD-based collaborative filtering with popularity fallback."""

    def __init__(self) -> None:
        """Initialize an unfitted collaborative recommender."""
        self.predictions_df: pd.DataFrame | None = None
        self.user_interaction_counts: dict[str, int] = {}
        self.popularity_fallback: list[dict] = []
        self.products_df: pd.DataFrame | None = None
        self.user_item_df: pd.DataFrame | None = None

    def fit(self, interactions_df: pd.DataFrame, products_df: pd.DataFrame, k: int = 20) -> "CollaborativeRecommender":
        """Build user-item matrix, run SVD, and store predicted scores."""
        self.products_df = products_df.reset_index(drop=True).copy()
        matrix = interactions_df.pivot_table(
            index="user_id",
            columns="product_id",
            values="implicit_score",
            aggfunc="mean",
            fill_value=0,
        )
        matrix = matrix.reindex(columns=self.products_df["product_id"], fill_value=0)
        self.user_item_df = matrix
        self.user_interaction_counts = interactions_df.groupby("user_id").size().to_dict()
        self.popularity_fallback = get_popular_products(interactions_df, products_df, top_k=50)

        values = matrix.to_numpy(dtype=float)
        nonzero = values > 0
        user_means = np.divide(values.sum(axis=1), nonzero.sum(axis=1), out=np.zeros(values.shape[0]), where=nonzero.sum(axis=1) != 0)
        centered = np.where(nonzero, values - user_means[:, None], 0)
        sparse = csr_matrix(centered)
        latent_k = min(k, min(sparse.shape) - 1)
        if latent_k <= 0:
            predictions = values
        else:
            u, sigma, vt = svds(sparse, k=latent_k, random_state=42)
            predictions = u @ np.diag(sigma) @ vt + user_means[:, None]
        predictions = np.clip(predictions, 0, 5)
        self.predictions_df = pd.DataFrame(predictions, index=matrix.index, columns=matrix.columns)
        return self

    def recommend(
        self,
        user_id: str,
        top_k: int = 10,
        exclude_interacted: bool = True,
        interactions_df: pd.DataFrame | None = None,
    ) -> list[dict]:
        """Return product recommendations for a user."""
        if self.predictions_df is None or self.products_df is None:
            logger.warning("CollaborativeRecommender used before fit")
            return []
        if user_id not in self.predictions_df.index or self.user_interaction_counts.get(user_id, 0) < 3:
            logger.warning("Cold-start user %s, returning popularity fallback", user_id)
            return [self._fallback_record(item) for item in self.popularity_fallback[:top_k]]
        scores = self.predictions_df.loc[user_id].copy()
        if exclude_interacted and interactions_df is not None:
            seen = set(interactions_df.loc[interactions_df["user_id"] == user_id, "product_id"])
            scores = scores.drop(labels=[pid for pid in seen if pid in scores.index], errors="ignore")
        top = scores.sort_values(ascending=False).head(top_k)
        meta = self.products_df.set_index("product_id")
        return [{
            "product_id": pid,
            "name": meta.loc[pid, "name"],
            "category": meta.loc[pid, "category"],
            "price_npr": int(meta.loc[pid, "price_npr"]),
            "predicted_score": float(score),
            "is_popularity_fallback": False,
        } for pid, score in top.items()]

    def _fallback_record(self, item: dict) -> dict:
        """Convert a popularity item to the collaborative response shape."""
        return {
            "product_id": item["product_id"],
            "name": item["name"],
            "category": item["category"],
            "price_npr": int(item["price_npr"]),
            "predicted_score": float(item["popularity_score"] * 5),
            "is_popularity_fallback": True,
        }

    def save(self, path: Path) -> None:
        """Persist the fitted model."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: Path) -> "CollaborativeRecommender":
        """Load a persisted model."""
        return joblib.load(Path(path))
