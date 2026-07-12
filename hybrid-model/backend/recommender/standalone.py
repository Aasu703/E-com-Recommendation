"""Standalone user-facing wrappers for the content-based and collaborative
sub-models, so each component can be evaluated INDIVIDUALLY on the same
user_id -> recommendations interface as the baseline and hybrid models.

These wrappers exist for the component-level evaluation (results_eval_components.py)
required by the thesis objectives. They do not change ContentBasedRecommender
or CollaborativeRecommender themselves.
"""

from __future__ import annotations

import logging

import pandas as pd

from .collaborative import CollaborativeRecommender
from .content_based import ContentBasedRecommender

logger = logging.getLogger(__name__)


class ContentOnlyRecommender:
    """Content-based recommender exposed as a per-user recommender.

    Seeds from the user's most recent TRAIN interaction and returns the most
    content-similar products. A user with no training history has no seed, so
    an empty list is returned (pure content-based cannot act without a seed) --
    this is the honest standalone behaviour and is reported as such.
    """

    def __init__(self) -> None:
        self.cb = ContentBasedRecommender()
        self.interactions_df: pd.DataFrame | None = None
        self.last_seed: dict[str, str] = {}
        self.is_fitted = False

    def fit(self, products_df: pd.DataFrame, interactions_df: pd.DataFrame) -> "ContentOnlyRecommender":
        self.cb.fit(products_df)
        df = interactions_df.reset_index(drop=True).copy()
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        self.last_seed = (
            df.sort_values("timestamp").groupby("user_id")["product_id"].last().to_dict()
        )
        self.interactions_df = df
        self.is_fitted = True
        return self

    def recommend(self, user_id: str, top_k: int = 10, context: dict | None = None) -> list[dict]:
        """Return content-similar products to the user's most recent seed item."""
        if not self.is_fitted:
            logger.warning("ContentOnlyRecommender used before fit")
            return []
        seed = self.last_seed.get(user_id)
        if not seed:
            return []
        return self.cb.recommend(seed, top_k=top_k, exclude_out_of_stock=True)


class CollaborativeOnlyRecommender:
    """SVD collaborative recommender exposed as a per-user recommender.

    Uses the existing predict path. The <3-interaction popularity fallback is
    disabled for any user that actually has SVD factors (i.e. appears in the
    fitted user-item matrix): those users are served their reconstructed SVD
    scores directly. Only users with no factors at all (e.g. zero train
    history) receive the popularity fallback.
    """

    def __init__(self) -> None:
        self.cf = CollaborativeRecommender()
        self.is_fitted = False

    def fit(self, products_df: pd.DataFrame, interactions_df: pd.DataFrame) -> "CollaborativeOnlyRecommender":
        self.cf.fit(interactions_df, products_df)
        self.is_fitted = True
        return self

    def recommend(self, user_id: str, top_k: int = 10, context: dict | None = None) -> list[dict]:
        """Return SVD-scored products, or popularity fallback if no factors."""
        if not self.is_fitted or self.cf.predictions_df is None or self.cf.products_df is None:
            logger.warning("CollaborativeOnlyRecommender used before fit")
            return []
        if user_id in self.cf.predictions_df.index:
            scores = self.cf.predictions_df.loc[user_id].sort_values(ascending=False).head(top_k)
            meta = self.cf.products_df.set_index("product_id")
            return [{
                "product_id": pid,
                "name": meta.loc[pid, "name"],
                "category": meta.loc[pid, "category"],
                "price_npr": int(meta.loc[pid, "price_npr"]),
                "predicted_score": float(score),
                "is_popularity_fallback": False,
            } for pid, score in scores.items()]
        return [self.cf._fallback_record(item) for item in self.cf.popularity_fallback[:top_k]]
