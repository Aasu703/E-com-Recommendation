"""Precompute user recommendations."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import redis

from api.config import settings
from jobs.celery_app import app
from recommender.hybrid import HybridRecommender

logger = logging.getLogger(__name__)


@app.task(name="jobs.precompute.precompute_all_user_recs")
def precompute_all_user_recs() -> dict:
    """Precompute top-20 recommendations for every known user."""
    model = HybridRecommender.load(Path("models") / "hybrid_recommender.pkl")
    client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    processed = 0
    for user_id in model.users_df["user_id"]:
        recs = model.recommend(user_id, top_k=20)
        client.set(f"rec:user:{user_id}:20:None:True:True", json.dumps({"recommendations": recs}), ex=86400)
        processed += 1
    logger.info("Precomputed recommendations for %s users", processed)
    return {"users_processed": processed}
