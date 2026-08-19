"""Product catalog endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter(prefix="/api/v1/products", tags=["products"])

SORT_OPTIONS = {
    "price_asc": ("price_npr", True),
    "price_desc": ("price_npr", False),
    "rating": ("avg_rating", False),
    "newest": ("is_new_arrival", False),
}


@router.get("/categories")
async def list_categories(request: Request) -> list[str]:
    """Unique category list, so the frontend never hardcodes it independently of the catalog."""
    return sorted(request.app.state.recommender.products_df["category"].unique().tolist())


@router.get("")
async def list_products(
    request: Request,
    category: str | None = None,
    q: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    in_stock: bool | None = None,
    sort: str | None = Query(default=None, description="price_asc|price_desc|rating|newest"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    """List products with filtering, search, sorting, and pagination."""
    df = request.app.state.recommender.products_df

    if category:
        df = df[df["category"] == category]
    if q:
        q = q.strip()
        mask = (
            df["name"].str.contains(q, case=False, na=False)
            | df["description"].str.contains(q, case=False, na=False)
            | df["tags"].str.contains(q, case=False, na=False)
            | df["brand"].str.contains(q, case=False, na=False)
            | df["subcategory"].str.contains(q, case=False, na=False)
            | df["category"].str.contains(q, case=False, na=False)
        )
        df = df[mask]
    if min_price is not None:
        df = df[df["price_npr"] >= min_price]
    if max_price is not None:
        df = df[df["price_npr"] <= max_price]
    if in_stock is not None:
        df = df[df["in_stock"] == in_stock]

    if sort:
        if sort not in SORT_OPTIONS:
            raise HTTPException(status_code=400, detail=f"Unknown sort: {sort}")
        column, ascending = SORT_OPTIONS[sort]
        df = df.sort_values(column, ascending=ascending, na_position="last")

    total = len(df)
    start = (page - 1) * limit
    page_df = df.iloc[start : start + limit]

    return {
        "items": page_df.to_dict("records"),
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/{product_id}")
async def get_product(request: Request, product_id: str):
    """Fetch a single product by id."""
    df = request.app.state.recommender.products_df
    match = df[df["product_id"] == product_id]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return match.iloc[0].to_dict()
