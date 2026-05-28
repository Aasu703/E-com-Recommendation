"""Health and metrics endpoints."""

from __future__ import annotations

import time

from fastapi import APIRouter, Request, Response

from api.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(request: Request):
    """Return system health."""
    model_loaded = bool(getattr(request.app.state, "recommender", None))
    redis_connected = bool(getattr(request.app.state, "redis_connected", False))
    return HealthResponse(
        status="ok" if model_loaded else "error",
        model_loaded=model_loaded,
        redis_connected=redis_connected,
        db_connected=bool(getattr(request.app.state, "db_connected", False)),
        uptime_seconds=time.time() - request.app.state.started_at,
        model_version=request.app.state.model_version,
    )


@router.get("/metrics")
async def metrics(request: Request):
    """Return simple text metrics."""
    served = request.app.state.total_recommendations_served
    hits = request.app.state.cache_hits
    hit_rate = hits / served if served else 0
    text = f"model_version {request.app.state.model_version}\ntotal_recommendations_served {served}\ncache_hit_rate {hit_rate:.4f}\nuptime {time.time() - request.app.state.started_at:.2f}\n"
    return Response(text, media_type="text/plain")
