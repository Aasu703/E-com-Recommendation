"""User endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("")
async def list_users(request: Request, limit: int = 300):
    """List users for demo selectors."""
    return request.app.state.recommender.users_df.head(limit).to_dict("records")
