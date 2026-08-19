"""Registration, login, and current-user endpoints for real accounts."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from api.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    mint_real_user_id,
    save_app_users,
    seed_new_user,
    verify_password,
)
from api.schemas import AuthResponse, LoginRequest, RegisterRequest, UserProfile

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _profile(user_id: str, record: dict) -> UserProfile:
    return UserProfile(
        user_id=user_id,
        email=record["email"],
        name=record["name"],
        preferred_categories=record["preferred_categories"],
        created_at=record["created_at"],
    )


@router.post("/register", response_model=AuthResponse)
async def register(request: Request, body: RegisterRequest) -> AuthResponse:
    if not _EMAIL_RE.match(body.email):
        raise HTTPException(status_code=400, detail="Invalid email address")

    categories = list(dict.fromkeys(body.preferred_categories))
    if len(categories) < 3:
        raise HTTPException(status_code=400, detail="Select at least 3 preferred categories")
    valid_categories = set(request.app.state.recommender.products_df["category"].unique())
    invalid = [c for c in categories if c not in valid_categories]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown categories: {invalid}")

    async with request.app.state.app_users_lock:
        app_users = request.app.state.app_users
        if any(r["email"].lower() == body.email.lower() for r in app_users.values()):
            raise HTTPException(status_code=409, detail="Email already registered")

        user_id = mint_real_user_id(app_users)
        created_at = datetime.now(timezone.utc).isoformat()
        record = {
            "email": body.email,
            "password_hash": hash_password(body.password),
            "name": body.name,
            "preferred_categories": categories,
            "created_at": created_at,
            "orders": [],
        }
        app_users[user_id] = record
        save_app_users(app_users)

    seed_new_user(request.app.state.recommender, user_id, body.name, categories, created_at)

    token = create_access_token(user_id)
    return AuthResponse(access_token=token, user=_profile(user_id, record))


@router.post("/login", response_model=AuthResponse)
async def login(request: Request, body: LoginRequest) -> AuthResponse:
    app_users = request.app.state.app_users
    match = next(
        ((uid, rec) for uid, rec in app_users.items() if rec["email"].lower() == body.email.lower()),
        None,
    )
    if not match or not verify_password(body.password, match[1]["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id, record = match
    token = create_access_token(user_id)
    return AuthResponse(access_token=token, user=_profile(user_id, record))


@router.get("/me", response_model=UserProfile)
async def me(current_user: dict = Depends(get_current_user)) -> UserProfile:
    return UserProfile(**current_user)
