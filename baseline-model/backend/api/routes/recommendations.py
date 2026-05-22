"""Recommendation API endpoints."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from api.config import settings
from api.schemas import RecommendedProduct, RecommendationResponse, SimilarProductsResponse
from recommender.utils import get_popular_products

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
async def recommend_user(request: Request, user_id: str, top_k: int = 10, exclude_out_of_stock: bool = True):
    """Return baseline recent-product recommendations."""
    request.app.state.total_recommendations_served += 1
    key = f"rec:baseline:user:{user_id}:{top_k}:{exclude_out_of_stock}"
    cached = await _cache_get(request, key)
    if cached:
        cached["cached"] = True
        return cached
    recs = request.app.state.recommender.recommend(
        user_id,
        top_k=top_k,
        exclude_out_of_stock=exclude_out_of_stock,
    )
    context = {"model": "baseline", "strategy": "recent_products", "exclude_out_of_stock": exclude_out_of_stock}
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
    """Backward-compatible alias for the baseline endpoint."""
    return await recommend_user(request, user_id, top_k, exclude_out_of_stock)


@router.get("/product/{product_id}/similar", response_model=SimilarProductsResponse)
async def similar_products(request: Request, product_id: str, top_k: int = 10, exclude_out_of_stock: bool = True):
    """Return recent products as the baseline product-page fallback."""
    products = request.app.state.recommender.products_df
    if product_id not in set(products["product_id"]):
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found in catalog")
    key = f"rec:baseline:product:{product_id}:{top_k}:{exclude_out_of_stock}"
    cached = await _cache_get(request, key)
    if cached:
        cached["cached"] = True
        return cached
    raw = request.app.state.recommender.recommend(
        "product-page",
        top_k=top_k + 1,
        exclude_out_of_stock=exclude_out_of_stock,
    )
    recs = [item for item in raw if item["product_id"] != product_id][:top_k]
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
    """Run baseline recommendations for up to 50 users concurrently."""
    async def one(uid: str):
        recs = await asyncio.to_thread(request.app.state.recommender.recommend, uid, body.top_k)
        return uid, [_format_product(item).model_dump() for item in recs]

    pairs = await asyncio.gather(*(one(uid) for uid in body.user_ids))
    return {"results": dict(pairs), "generated_at": _now()}
