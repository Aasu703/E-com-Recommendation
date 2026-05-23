"""Product catalog endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1/products", tags=["products"])


@router.get("")
async def list_products(request: Request, limit: int = 50):
    """List products from the in-memory catalog."""
    return request.app.state.recommender.products_df.head(limit).to_dict("records")
