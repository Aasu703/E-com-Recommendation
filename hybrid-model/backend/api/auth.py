"""Lightweight file-backed auth: password hashing, JWTs, and real-user persistence.

Real users are never written into the evaluated dataset. They live in a single
JSON file (``settings.APP_USERS_FILE``) and a parallel interactions log
(``settings.LIVE_INTERACTIONS_FILE``), both separate from
``nepali_ecommerce_data/{users,interactions}.csv``, which `results_*.py` and
every other evaluation script read exclusively.
"""

from __future__ import annotations

import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
from fastapi import Header, HTTPException, Request
from jose import JWTError, jwt
from passlib.context import CryptContext

from api.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def load_app_users() -> dict:
    path = Path(settings.APP_USERS_FILE)
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_app_users(app_users: dict) -> None:
    """Write the JSON store atomically (temp file + os.replace)."""
    path = Path(settings.APP_USERS_FILE)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(app_users, indent=2), encoding="utf-8")
    os.replace(tmp_path, path)


def mint_real_user_id(app_users: dict) -> str:
    """Next RU#### id, never colliding with the simulated U#### dataset."""
    existing = [int(uid[2:]) for uid in app_users if uid.startswith("RU") and uid[2:].isdigit()]
    return f"RU{max(existing, default=0) + 1:04d}"


def _decode_bearer(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
    except JWTError:
        return None
    return payload.get("sub")


async def get_current_user(request: Request, authorization: str | None = Header(default=None)) -> dict:
    """FastAPI dependency: the authenticated real user, or 401."""
    user_id = _decode_bearer(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = request.app.state.app_users.get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"user_id": user_id, **user}


async def get_optional_user(request: Request, authorization: str | None = Header(default=None)) -> dict | None:
    """FastAPI dependency: the authenticated real user, or None (guests allowed)."""
    user_id = _decode_bearer(authorization)
    if not user_id:
        return None
    user = request.app.state.app_users.get(user_id)
    if not user:
        return None
    return {"user_id": user_id, **user}


LIVE_INTERACTION_COLUMNS = [
    "interaction_id",
    "user_id",
    "product_id",
    "interaction_type",
    "rating",
    "implicit_score",
    "timestamp",
    "month",
    "is_festival_period",
]


def append_live_interactions(rows: list[dict]) -> None:
    """Append real-user interaction rows to the live (non-evaluation) CSV log.

    Reindexed to a fixed column order so callers that omit a column (e.g. the
    `/interact` endpoint doesn't set `interaction_id`/`rating`) can never shift
    the CSV's columns out of alignment with an earlier append that did set them.
    """
    if not rows:
        return
    path = Path(settings.LIVE_INTERACTIONS_FILE)
    path.parent.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(rows).reindex(columns=LIVE_INTERACTION_COLUMNS)
    header = not path.exists()
    df.to_csv(path, mode="a", header=header, index=False)


def top_product_for_category(recommender, category: str) -> str | None:
    """Most-popular in-stock product in a category, used as the CB seed for cold-start."""
    from recommender.utils import get_popular_products

    products = recommender.products_df
    cat_products = products[(products["category"] == category) & (products["in_stock"])]
    if cat_products.empty:
        cat_products = products[products["category"] == category]
    if cat_products.empty:
        return None
    popular = get_popular_products(recommender.interactions_df, cat_products, top_k=1)
    return popular[0]["product_id"] if popular else None


def seed_new_user(recommender, user_id: str, name: str, categories: list[str], created_at: str) -> None:
    """Register a brand-new real user with the live recommender state.

    Appends a `users_df` row (so future restarts/replays see it) and a small
    number of low-weight synthetic `preference_seed` interactions -- one per
    chosen category, against that category's current top product -- so the
    user's very first "Recommended for You" has a real content-based signal
    instead of nothing. These rows are excluded from `cf.user_interaction_counts`
    (see `replay_live_state`) so the alpha badge honestly starts at 0 real
    interactions, and are never written to `interactions.csv`.
    """
    new_user_row = pd.DataFrame([{
        "user_id": user_id,
        "name": name,
        "city": "Unknown",
        "age": 30,
        "gender": "unspecified",
        "user_type": "new",
        "preferred_categories": "|".join(categories),
        "joined_date": created_at[:10],
        "is_verified": False,
    }])
    recommender.users_df = pd.concat([recommender.users_df, new_user_row], ignore_index=True)

    base_time = datetime.now(timezone.utc)
    seed_rows: list[dict] = []
    for i, category in enumerate(categories):
        product_id = top_product_for_category(recommender, category)
        if not product_id:
            continue
        ts = base_time + timedelta(seconds=i)
        seed_rows.append({
            "interaction_id": f"SEED-{user_id}-{i}",
            "user_id": user_id,
            "product_id": product_id,
            "interaction_type": "preference_seed",
            "rating": None,
            "implicit_score": 0.5,
            "timestamp": ts.isoformat(),
            "month": ts.month,
            "is_festival_period": ts.month in {10, 11},
        })

    if seed_rows:
        recommender.interactions_df = pd.concat(
            [recommender.interactions_df, pd.DataFrame(seed_rows)], ignore_index=True
        )
        append_live_interactions(seed_rows)


def replay_live_state(recommender) -> dict:
    """Merge persisted real users + live interactions into a freshly fitted/loaded recommender.

    Runs once at startup, after `HybridRecommender.fit()`/`.load()`. Never
    re-fits CF/CB (that stays `jobs/retrain.py`'s job) -- only replays the same
    in-memory mutations `POST /interact` and registration already perform, so a
    server restart doesn't wipe a live user's account or learned profile.
    """
    app_users = load_app_users()
    if app_users:
        rows = []
        for user_id, record in app_users.items():
            categories = record.get("preferred_categories", [])
            rows.append({
                "user_id": user_id,
                "name": record.get("name", user_id),
                "city": "Unknown",
                "age": 30,
                "gender": "unspecified",
                "user_type": "new",
                "preferred_categories": "|".join(categories),
                "joined_date": (record.get("created_at") or date.today().isoformat())[:10],
                "is_verified": False,
            })
        recommender.users_df = pd.concat(
            [recommender.users_df, pd.DataFrame(rows)], ignore_index=True
        )

    live_path = Path(settings.LIVE_INTERACTIONS_FILE)
    if live_path.exists():
        live_df = pd.read_csv(live_path)
        if not live_df.empty:
            recommender.interactions_df = pd.concat(
                [recommender.interactions_df, live_df], ignore_index=True
            )

    counted = recommender.interactions_df[
        recommender.interactions_df["interaction_type"] != "preference_seed"
    ]
    recommender.cf.user_interaction_counts = counted.groupby("user_id").size().to_dict()

    return app_users
