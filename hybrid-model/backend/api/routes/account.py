"""Account endpoints for authenticated real users: preferences and orders."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from api.auth import get_current_user, save_app_users

router = APIRouter(prefix="/api/v1/account", tags=["account"])


class PreferencesUpdate(BaseModel):
    preferred_categories: list[str] = Field(min_length=3)


class OrderItem(BaseModel):
    product_id: str
    name: str
    price_npr: int
    quantity: int = Field(ge=1)


class PlaceOrderRequest(BaseModel):
    items: list[OrderItem] = Field(min_length=1)
    total: int


@router.get("/preferences")
async def get_preferences(current_user: dict = Depends(get_current_user)) -> dict:
    return {"preferred_categories": current_user["preferred_categories"]}


@router.put("/preferences")
async def update_preferences(
    request: Request, body: PreferencesUpdate, current_user: dict = Depends(get_current_user)
) -> dict:
    categories = list(dict.fromkeys(body.preferred_categories))
    if len(categories) < 3:
        raise HTTPException(status_code=400, detail="Select at least 3 preferred categories")
    valid_categories = set(request.app.state.recommender.products_df["category"].unique())
    invalid = [c for c in categories if c not in valid_categories]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown categories: {invalid}")

    user_id = current_user["user_id"]
    async with request.app.state.app_users_lock:
        app_users = request.app.state.app_users
        app_users[user_id]["preferred_categories"] = categories
        save_app_users(app_users)

    users_df = request.app.state.recommender.users_df
    users_df.loc[users_df["user_id"] == user_id, "preferred_categories"] = "|".join(categories)

    return {"preferred_categories": categories}


@router.get("/orders")
async def list_orders(current_user: dict = Depends(get_current_user)) -> dict:
    return {"orders": current_user.get("orders", [])}


@router.post("/orders")
async def place_order(request: Request, body: PlaceOrderRequest, current_user: dict = Depends(get_current_user)) -> dict:
    user_id = current_user["user_id"]
    order = {
        "order_id": f"ORD-{uuid.uuid4().hex[:8].upper()}",
        "items": [item.model_dump() for item in body.items],
        "total": body.total,
        "placed_at": datetime.now(timezone.utc).isoformat(),
    }

    async with request.app.state.app_users_lock:
        app_users = request.app.state.app_users
        app_users[user_id].setdefault("orders", []).append(order)
        save_app_users(app_users)

    return order
