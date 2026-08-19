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
    COLD_START_THRESHOLD = 1  # default gamma in the formula (γ=1 best in results/gamma_ablation.txt, dataset v4)

    def __init__(
        self,
        gamma: int = COLD_START_THRESHOLD,
        strategy: str = "adaptive",
        alpha: float | None = None,
        freshness_boost: bool = True,
        festival_boost: bool = True,
        cold_user_fallback: bool = True,
    ) -> None:
        """Initialize unfitted content and collaborative models.

        gamma overrides the class-level COLD_START_THRESHOLD default for this
        instance only (used by results_ablation_gamma.py); existing callers
        that construct HybridRecommender() with no arguments get gamma=1, the
        measured-best value (results/gamma_ablation.txt).

        strategy selects how CF and CB are combined (used by
        results_ablation_alpha.py):
          * "adaptive" (default) -- alpha = Uc / (Uc + gamma), the shipped
            behaviour; unchanged for existing callers.
          * "fixed" -- a constant blend weight ``alpha`` (defaults to 0.5)
            applied to every user/product, i.e. a weighted-fixed hybrid.
          * "switching" -- pure CB when the user's interaction count is below
            gamma, pure CF otherwise (a switching heuristic).

        freshness_boost / festival_boost toggle the +0.08 new-arrival and +0.25
        festival additive boosts; both default to True (shipped behaviour) and
        are switched off only for the boost ablation.

        cold_user_fallback (default True, shipped behaviour) resolves the RQ3
        cold-start weakness for zero-history users under the "adaptive"
        strategy. Previously (default False) such users got alpha=0 -- which
        nullifies the popularity fallback populated into the CF score, leaving
        their top-10 as 100% new arrivals scoring 0.0000 (RESULTS_SUMMARY.md
        §7). With the fallback on, zero-history users get alpha=1.0 (so the
        popularity fallback actually scores) plus a +0.08 boost on products
        matching their onboarding `preferred_categories` (results_cold_user_fallback.py
        measured Precision@10 rise 0.0000 -> 0.0016 for that segment). Pass
        cold_user_fallback=False to restore the old behaviour.
        """
        self.cb = ContentBasedRecommender()
        self.cf = CollaborativeRecommender()
        self.COLD_START_THRESHOLD = gamma
        self.strategy = strategy
        self.fixed_alpha = 0.5 if alpha is None else float(alpha)
        self.freshness_boost = freshness_boost
        self.festival_boost = festival_boost
        self.cold_user_fallback = cold_user_fallback
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
        """Return hybrid recommendations sorted by score.

        Vectorized over the product catalog (rather than a per-product Python
        loop + per-product `_compute_alpha` DataFrame filter) because that
        O(n^2) pattern is fine at hundreds of products but becomes a multi-
        second-per-call bottleneck at dataset v3's 2,500 products. Scoring
        logic is identical to `_compute_alpha` (kept unmodified for
        `api/recommend_blend.py`, which calls it directly per product).
        """
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

        keep_mask = pd.Series(True, index=products.index)
        if exclude_interacted:
            seen = set(self.interactions_df.loc[self.interactions_df["user_id"] == user_id, "product_id"])
            keep_mask &= ~products.index.isin(seen)
        if exclude_out_of_stock:
            keep_mask &= products["in_stock"].astype(bool)

        kept = products.loc[keep_mask.to_numpy()]
        if kept.empty:
            return []

        cf_score_arr = cf_norm.reindex(kept.index, fill_value=0.0).to_numpy(dtype=float)
        cb_score_arr = cb_scores.reindex(kept.index, fill_value=0.0).to_numpy(dtype=float)
        is_new_arrival_arr = kept["is_new_arrival"].astype(bool).to_numpy()

        u_c = self.cf.user_interaction_counts.get(user_id, 0)
        if self.strategy == "fixed":
            alpha_arr = np.full(len(kept), float(self.fixed_alpha))
        elif self.strategy == "switching":
            alpha_arr = np.full(len(kept), 1.0 if u_c >= self.COLD_START_THRESHOLD else 0.0)
        else:  # adaptive
            base_alpha = u_c / (u_c + self.COLD_START_THRESHOLD)
            alpha_arr = np.where(is_new_arrival_arr, base_alpha * 0.5, base_alpha)

        preferred_category_arr = np.zeros(len(kept), dtype=bool)
        if self.cold_user_fallback and self.strategy == "adaptive" and u_c == 0:
            alpha_arr = np.full(len(kept), 1.0)
            if self.users_df is not None:
                urow = self.users_df.loc[self.users_df["user_id"] == user_id]
                if not urow.empty and pd.notna(urow.iloc[0].get("preferred_categories")):
                    preferred = set(str(urow.iloc[0]["preferred_categories"]).split("|"))
                    preferred_category_arr = kept["category"].isin(preferred).to_numpy()

        hybrid_score_arr = alpha_arr * cf_score_arr + (1 - alpha_arr) * cb_score_arr
        hybrid_score_arr = hybrid_score_arr + np.where(preferred_category_arr, 0.08, 0.0)

        freshness_applied_arr = is_new_arrival_arr & self.freshness_boost
        hybrid_score_arr = hybrid_score_arr + np.where(freshness_applied_arr, 0.08, 0.0)

        if month in {10, 11}:
            in_festival_category_arr = kept["category"].isin(self.festival_categories).to_numpy()
        else:
            in_festival_category_arr = np.zeros(len(kept), dtype=bool)
        festival_applied_arr = in_festival_category_arr & self.festival_boost
        hybrid_score_arr = hybrid_score_arr + np.where(festival_applied_arr, 0.25, 0.0)

        # Stable descending sort: ties keep original product_id order, matching
        # the previous `list.sort(key=..., reverse=True)` behaviour exactly.
        order = np.argsort(-hybrid_score_arr, kind="stable")[:top_k]

        results: list[dict] = []
        for i in order:
            row = kept.iloc[i]
            results.append({
                "product_id": kept.index[i],
                "name": row["name"],
                "category": row["category"],
                "subcategory": row["subcategory"],
                "brand": row["brand"],
                "price_npr": int(row["price_npr"]),
                "image_url": row.get("image_url"),
                "avg_rating": None if pd.isna(row["avg_rating"]) else float(row["avg_rating"]),
                "in_stock": bool(row["in_stock"]),
                "is_new_arrival": bool(is_new_arrival_arr[i]),
                "cf_score": float(cf_score_arr[i]),
                "cb_score": float(np.clip(cb_score_arr[i], 0, 1)),
                "hybrid_score": float(hybrid_score_arr[i]),
                "alpha_used": float(alpha_arr[i]),
                "freshness_boost_applied": bool(freshness_applied_arr[i]),
                "is_festival_recommendation": bool(festival_applied_arr[i]),
                "cold_user_fallback_applied": bool(preferred_category_arr[i]),
            })
        return results

    def _compute_alpha(self, user_id: str, product_id: str, month: int | None) -> float:
        """Compute the CF blend weight alpha for the configured strategy.

        alpha weights CF in hybrid_score = alpha*cf + (1-alpha)*cb.
          * "fixed": a constant weight (self.fixed_alpha).
          * "switching": pure CF (1.0) when the user's interaction count is at
            least gamma, else pure CB (0.0).
          * "adaptive" (default): saturation curve alpha = Uc / (Uc + gamma),
            halved for new arrivals to favour content-based discovery.
        """
        if self.strategy == "fixed":
            return float(self.fixed_alpha)

        u_c = self.cf.user_interaction_counts.get(user_id, 0)

        if self.strategy == "switching":
            return 1.0 if u_c >= self.COLD_START_THRESHOLD else 0.0

        # adaptive
        if self.products_df is None:
            return 0.15
        # alpha_u = Uc / (Uc + gamma)
        alpha = u_c / (u_c + self.COLD_START_THRESHOLD)

        row = self.products_df.loc[self.products_df["product_id"] == product_id]
        if row.empty:
            return float(alpha)

        product = row.iloc[0]
        # For new arrivals, we prefer content-based (lower alpha)
        if bool(product["is_new_arrival"]):
            alpha *= 0.5

        return float(alpha)

    def save(self, path: Path | str) -> None:
        """Save the full hybrid model."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: Path | str) -> "HybridRecommender":
        """Load a saved hybrid model.

        Backfills attributes added after an older pickle was saved so a stale
        model file (e.g. one trained before `cold_user_fallback` shipped) never
        crashes `recommend()` with AttributeError. Missing attributes are filled
        from a freshly-constructed instance's defaults, matching the shipped
        configuration.
        """
        model = joblib.load(Path(path))
        defaults = cls()
        for attr in ("cold_user_fallback", "freshness_boost", "festival_boost", "strategy", "fixed_alpha"):
            if not hasattr(model, attr):
                setattr(model, attr, getattr(defaults, attr))
        return model
