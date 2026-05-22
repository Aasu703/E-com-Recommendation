"""FastAPI application factory for the recommendation API."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis

from api.config import settings
from api.routes import health, products, recommendations, users
from recommender.baseline import BaselineRecommender
from recommender.hybrid import HybridRecommender
from recommender.utils import load_data

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load/train model and prepare optional infrastructure connections."""
    app.state.started_at = time.time()
    app.state.total_recommendations_served = 0
    app.state.cache_hits = 0
    app.state.model_version = "1.0.0"
    model_path = Path(settings.MODEL_DIR) / "hybrid_recommender.pkl"
    if model_path.exists():
        app.state.recommender = HybridRecommender.load(model_path)
        products_df = app.state.recommender.products_df
        interactions_df = app.state.recommender.interactions_df
    else:
        products_df, users_df, interactions_df = load_data()
        app.state.recommender = HybridRecommender().fit(products_df, users_df, interactions_df)
        app.state.recommender.save(model_path)
    if products_df is None or interactions_df is None:
        products_df, _, interactions_df = load_data()
    app.state.baseline_recommender = BaselineRecommender().fit(products_df, interactions_df)
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
    title="Nepali E-Commerce Recommendation API",
    description="Hybrid AI recommendation system for Nepal's e-commerce market",
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
