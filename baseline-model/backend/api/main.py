"""FastAPI application factory for the baseline recommendation API."""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis

from api.config import settings
from api.routes import health, products, recommendations, users
from recommender.baseline import BaselineRecommender
from recommender.utils import load_data

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the baseline model and prepare optional infrastructure connections."""
    app.state.started_at = time.time()
    app.state.total_recommendations_served = 0
    app.state.cache_hits = 0
    app.state.model_version = "baseline-1.0.0"
    products_df, users_df, interactions_df = load_data()
    app.state.recommender = BaselineRecommender().fit(products_df, interactions_df)
    app.state.recommender.users_df = users_df
    try:
        app.state.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await app.state.redis.ping()
        app.state.redis_connected = True
    except Exception:
        logger.warning("Redis unavailable; using uncached responses")
        app.state.redis = None
        app.state.redis_connected = False
    app.state.db_connected = False
    yield
    if getattr(app.state, "redis", None):
        await app.state.redis.aclose()


app = FastAPI(
    title="Nepali E-Commerce Baseline Recommendation API",
    description="Baseline recent-product recommendation system for Nepal's e-commerce market",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(recommendations.router)
app.include_router(products.router)
app.include_router(users.router)
app.include_router(health.router)
