"""Recommendation API endpoints."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from api.auth import append_live_interactions, get_optional_user
from api.config import settings
from api.recommend_blend import blended_recommendations, is_cold_start
from api.schemas import RecommendedProduct, RecommendationResponse, SimilarProductsResponse, InteractionRequest
from recommender.utils import get_popular_products

ALLOWED_INTERACTION_TYPES = {"view", "click", "add_to_cart", "purchase"}
INTERACTION_SCORE_MAP = {"view": 1.0, "click": 1.0, "add_to_cart": 2.0, "purchase": 4.0}

router = APIRouter(prefix="/api/v1/recommend", tags=["recommendations"])


class BatchRequest(BaseModel):
    """Batch recommendation request."""

    user_ids: list[str] = Field(max_length=50)
    top_k: int = Field(default=10, ge=1, le=50)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _format_product(item: dict) -> RecommendedProduct:
    item = dict(item)
    item["price_formatted"] = f"NPR {int(item.get('price_npr', 0)):,}"
    return RecommendedProduct(**item)


async def _cache_get(request: Request, key: str):
    redis = getattr(request.app.state, "redis", None)
    if not redis:
        return None
    value = await redis.get(key)
    if value:
        request.app.state.cache_hits += 1
        return json.loads(value)
    return None


async def _cache_set(request: Request, key: str, payload: dict, ttl: int | None = None) -> None:
    redis = getattr(request.app.state, "redis", None)
    if redis:
        await redis.set(key, json.dumps(payload), ex=ttl or settings.CACHE_TTL_SECONDS)


@router.get("/user/{user_id}", response_model=RecommendationResponse)
async def recommend_user(request: Request, user_id: str, top_k: int = 10, month: int | None = None, exclude_interacted: bool = True, exclude_out_of_stock: bool = True):
    """Return personalized recommendations for a user."""
    request.app.state.total_recommendations_served += 1
    key = f"rec:user:{user_id}:{top_k}:{month}:{exclude_interacted}:{exclude_out_of_stock}"
    cached = await _cache_get(request, key)
    if cached:
        cached["cached"] = True
        return cached
    recommender = request.app.state.recommender
    context = {"month": month, "exclude_interacted": exclude_interacted, "exclude_out_of_stock": exclude_out_of_stock}

    if is_cold_start(recommender, user_id, settings.COLD_START_THRESHOLD):
        recs = blended_recommendations(recommender, user_id, top_k, month, exclude_interacted, exclude_out_of_stock)
        context["cold_start_blend"] = True
    else:
        recs = recommender.recommend(user_id, top_k=top_k, context=context)

    interaction_count = recommender.cf.user_interaction_counts.get(user_id, 0)
    context["user_interaction_count"] = interaction_count
    context["alpha_avg"] = (sum(r["alpha_used"] for r in recs) / len(recs)) if recs else 0.0

    payload = RecommendationResponse(
        user_id=user_id,
        recommendations=[_format_product(item) for item in recs],
        model_version=request.app.state.model_version,
        context=context,
        generated_at=_now(),
        cached=False,
    ).model_dump()
    await _cache_set(request, key, payload)
    return payload


@router.get("/baseline/user/{user_id}", response_model=RecommendationResponse)
async def recommend_baseline(request: Request, user_id: str, top_k: int = 10, exclude_out_of_stock: bool = True):
    """Return non-personalized recent products."""
    request.app.state.total_recommendations_served += 1
    key = f"rec:baseline:{user_id}:{top_k}:{exclude_out_of_stock}"
    cached = await _cache_get(request, key)
    if cached:
        cached["cached"] = True
        return cached
    recs = request.app.state.baseline_recommender.recommend(
        user_id,
        top_k=top_k,
        exclude_out_of_stock=exclude_out_of_stock,
    )
    context = {"baseline": "recent", "exclude_out_of_stock": exclude_out_of_stock}
    payload = RecommendationResponse(
        user_id=user_id,
        recommendations=[_format_product(item) for item in recs],
        model_version=request.app.state.model_version,
        context=context,
        generated_at=_now(),
        cached=False,
    ).model_dump()
    await _cache_set(request, key, payload)
    return payload


@router.get("/product/{product_id}/similar", response_model=SimilarProductsResponse)
async def similar_products(request: Request, product_id: str, top_k: int = 10, exclude_out_of_stock: bool = True):
    """Return similar products for a product page."""
    products = request.app.state.recommender.products_df
    if product_id not in set(products["product_id"]):
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found in catalog")
    key = f"rec:product:{product_id}:{top_k}:{exclude_out_of_stock}"
    cached = await _cache_get(request, key)
    if cached:
        cached["cached"] = True
        return cached
    raw = request.app.state.recommender.cb.recommend(product_id, top_k=top_k, exclude_out_of_stock=exclude_out_of_stock)
    recs = [{**item, "hybrid_score": item["similarity_score"], "cb_score": item["similarity_score"]} for item in raw]
    name = products.loc[products["product_id"] == product_id, "name"].iloc[0]
    payload = SimilarProductsResponse(
        product_id=product_id,
        seed_product_name=name,
        similar_products=[_format_product(item) for item in recs],
        generated_at=_now(),
        cached=False,
    ).model_dump()
    await _cache_set(request, key, payload)
    return payload


@router.get("/popular", response_model=RecommendationResponse)
async def popular(request: Request, top_k: int = 10, category: str | None = None):
    """Return globally popular products."""
    products = request.app.state.recommender.products_df
    interactions = request.app.state.recommender.interactions_df
    if category:
        products = products[products["category"] == category]
    raw = get_popular_products(interactions, products, top_k=top_k)
    meta = products.set_index("product_id")
    recs = []
    for item in raw:
        row = meta.loc[item["product_id"]]
        recs.append({**item, "subcategory": row["subcategory"], "brand": row["brand"], "avg_rating": row["avg_rating"], "in_stock": row["in_stock"], "is_new_arrival": row["is_new_arrival"], "hybrid_score": item["popularity_score"]})
    return RecommendationResponse(user_id="popular", recommendations=[_format_product(item) for item in recs], model_version=request.app.state.model_version, context={"category": category}, generated_at=_now(), cached=True)


@router.post("/batch")
async def batch(request: Request, body: BatchRequest):
    """Run recommendations for up to 50 users concurrently."""
    async def one(uid: str):
        recs = await asyncio.to_thread(request.app.state.recommender.recommend, uid, body.top_k, {})
        return uid, [_format_product(item).model_dump() for item in recs]

    pairs = await asyncio.gather(*(one(uid) for uid in body.user_ids))
    return {"results": dict(pairs), "generated_at": _now()}


@router.post("/interact")
async def interact(request: Request, body: InteractionRequest, current_user: dict | None = Depends(get_optional_user)):
    """Log an interaction to update the recommender state live.

    The user is taken from the JWT when present (real logged-in shoppers);
    otherwise it falls back to the body-supplied user_id, which keeps /demo's
    persona-switching working unauthenticated exactly as before.
    """
    import pandas as pd

    if body.interaction_type not in ALLOWED_INTERACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown interaction_type: {body.interaction_type}")

    user_id = current_user["user_id"] if current_user else body.user_id
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required (or a valid Authorization bearer token)")

    recommender = request.app.state.recommender
    if recommender.interactions_df is not None:
        score = INTERACTION_SCORE_MAP[body.interaction_type]
        now = datetime.now(timezone.utc)
        new_row_dict = {
            "user_id": user_id,
            "product_id": body.product_id,
            "interaction_type": body.interaction_type,
            "implicit_score": score,
            "timestamp": _now(),
            "month": now.month,
            "is_festival_period": now.month in {10, 11},
        }
        new_row = pd.DataFrame([new_row_dict])
        recommender.interactions_df = pd.concat([recommender.interactions_df, new_row], ignore_index=True)

        # Increment user's interaction count to adapt the Hybrid alpha instantly
        recommender.cf.user_interaction_counts[user_id] = recommender.cf.user_interaction_counts.get(user_id, 0) + 1

        # Real users are persisted so a restart doesn't lose their learned profile;
        # /demo personas (non-RU ids) stay in-memory only, exactly as before.
        if user_id.startswith("RU"):
            append_live_interactions([new_row_dict])

        # Clear cache for this user
        redis = getattr(request.app.state, "redis", None)
        if redis:
            keys = await redis.keys(f"rec:user:{user_id}:*")
            if keys:
                await redis.delete(*keys)

    recorded = body.model_dump()
    recorded["user_id"] = user_id
    return {"status": "success", "recorded": recorded, "generated_at": _now()}
