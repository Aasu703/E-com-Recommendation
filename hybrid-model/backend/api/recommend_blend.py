"""Cold-start recommendation blending for brand-new real users.

`HybridRecommender.recommend()` derives its content-based signal from a
single seed product -- the user's most-recent interaction (see
`recommender/hybrid.py`). For a user who just completed the category
preference quiz, that means only whichever category's seed happens to be
"most recent" would show up in "Recommended for You" -- not all of their
chosen categories.

This module blends across ALL of a cold user's preferred categories instead,
entirely in `api/` -- `recommender/` is never modified. It reuses the exact
same `cb.recommend()` (already used by the `/product/{id}/similar` endpoint)
and the recommender's own unmodified `_compute_alpha()`/hybrid-score formula,
just over a different (multi-seed) candidate set. Non-cold users are
unaffected: they keep going through `recommender.recommend()` as before.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from api.auth import top_product_for_category


def is_cold_start(recommender, user_id: str, gamma: int) -> bool:
    """True for a real (RU####) user below the interaction-count threshold who has preferences set."""
    if not user_id.startswith("RU"):
        return False
    if recommender.cf.user_interaction_counts.get(user_id, 0) >= gamma:
        return False
    users_df = recommender.users_df
    row = users_df.loc[users_df["user_id"] == user_id]
    if row.empty:
        return False
    return bool(str(row.iloc[0].get("preferred_categories") or "").strip())


def blended_recommendations(
    recommender,
    user_id: str,
    top_k: int,
    month: int | None,
    exclude_interacted: bool,
    exclude_out_of_stock: bool,
) -> list[dict]:
    """Round-robin blend of cb.recommend() across the user's preferred categories."""
    users_df = recommender.users_df
    row = users_df.loc[users_df["user_id"] == user_id].iloc[0]
    categories = [c for c in str(row["preferred_categories"]).split("|") if c]

    products = recommender.products_df.set_index("product_id")
    seen: set[str] = set()
    if exclude_interacted:
        seen = set(recommender.interactions_df.loc[recommender.interactions_df["user_id"] == user_id, "product_id"])

    per_category: list[list[dict]] = []
    for category in categories:
        seed = top_product_for_category(recommender, category)
        if not seed:
            per_category.append([])
            continue
        per_category.append(recommender.cb.recommend(seed, top_k=top_k, exclude_out_of_stock=exclude_out_of_stock))

    merged: list[dict] = []
    picked: set[str] = set(seen)
    index = 0
    while len(merged) < top_k and any(index < len(bucket) for bucket in per_category):
        for bucket in per_category:
            if index >= len(bucket):
                continue
            item = bucket[index]
            product_id = item["product_id"]
            if product_id in picked:
                continue
            picked.add(product_id)
            merged.append(item)
            if len(merged) >= top_k:
                break
        index += 1

    results: list[dict] = []
    for item in merged:
        product_id = item["product_id"]
        if product_id not in products.index:
            continue
        product = products.loc[product_id]
        cb_score = float(item.get("similarity_score", 0.0))
        alpha = recommender._compute_alpha(user_id, product_id, month)
        hybrid_score = (1 - alpha) * cb_score  # cf_score is 0 for a user with no CF history

        freshness = bool(product["is_new_arrival"])
        freshness_applied = freshness and recommender.freshness_boost
        if freshness_applied:
            hybrid_score += 0.08

        is_festival = month in {10, 11} and product["category"] in recommender.festival_categories
        festival_applied = is_festival and recommender.festival_boost
        if festival_applied:
            hybrid_score += 0.25

        results.append({
            "product_id": product_id,
            "name": product["name"],
            "category": product["category"],
            "subcategory": product["subcategory"],
            "brand": product["brand"],
            "price_npr": int(product["price_npr"]),
            "image_url": product.get("image_url"),
            "avg_rating": None if pd.isna(product["avg_rating"]) else float(product["avg_rating"]),
            "in_stock": bool(product["in_stock"]),
            "is_new_arrival": freshness,
            "cf_score": 0.0,
            "cb_score": float(np.clip(cb_score, 0, 1)),
            "hybrid_score": float(hybrid_score),
            "alpha_used": float(alpha),
            "freshness_boost_applied": bool(freshness_applied),
            "is_festival_recommendation": bool(festival_applied),
        })

    results.sort(key=lambda entry: entry["hybrid_score"], reverse=True)
    return results[:top_k]
