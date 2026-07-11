"""Product catalog endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/v1/products", tags=["products"])


@router.get("")
async def list_products(request: Request, limit: int = 50):
    """List products from the in-memory catalog."""
    return request.app.state.recommender.products_df.head(limit).to_dict("records")


@router.get("/{product_id}")
async def get_product(request: Request, product_id: str):
    """Fetch a single product by id."""
    df = request.app.state.recommender.products_df
    match = df[df["product_id"] == product_id]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return match.iloc[0].to_dict()
