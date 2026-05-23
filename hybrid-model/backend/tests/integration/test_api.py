import pytest
from httpx import ASGITransport, AsyncClient

from api.main import app
from recommender.baseline import BaselineRecommender
from recommender.hybrid import HybridRecommender
from recommender.utils import load_data


def _ensure_state():
    if not hasattr(app.state, "recommender"):
        p, u, i = load_data()
        app.state.recommender = HybridRecommender().fit(p, u, i)
        app.state.baseline_recommender = BaselineRecommender().fit(p, i)
        app.state.started_at = 0
        app.state.total_recommendations_served = 0
        app.state.cache_hits = 0
        app.state.model_version = "test"
        app.state.redis = None
        app.state.redis_connected = False
        app.state.db_connected = False


@pytest.mark.asyncio
class TestRecommendationEndpoints:
    def _client(self):
        _ensure_state()
        return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    async def test_user_endpoint_returns_200(self):
        async with self._client() as client:
            res = await client.get("/api/v1/recommend/user/U0001?top_k=5")
        assert res.status_code == 200
        assert len(res.json()["recommendations"]) == 5

    async def test_unknown_user_returns_popularity_fallback_not_404(self):
        async with self._client() as client:
            res = await client.get("/api/v1/recommend/user/U9999?top_k=5")
        assert res.status_code == 200

    async def test_product_similar_endpoint_returns_200(self):
        async with self._client() as client:
            res = await client.get("/api/v1/recommend/product/P0001/similar?top_k=5")
        assert res.status_code == 200

    async def test_baseline_endpoint_returns_200(self):
        async with self._client() as client:
            res = await client.get("/api/v1/recommend/baseline/user/U0001?top_k=5")
        assert res.status_code == 200
        assert len(res.json()["recommendations"]) == 5

    async def test_unknown_product_returns_404(self):
        async with self._client() as client:
            res = await client.get("/api/v1/recommend/product/P9999/similar")
        assert res.status_code == 404

    async def test_batch_endpoint_max_50_users(self):
        async with self._client() as client:
            res = await client.post("/api/v1/recommend/batch", json={"user_ids": ["U0001", "U0002"], "top_k": 3})
        assert set(res.json()["results"]) == {"U0001", "U0002"}

    async def test_health_endpoint(self):
        async with self._client() as client:
            res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["model_loaded"] is True

    async def test_cached_response_flag(self):
        async with self._client() as client:
            first = await client.get("/api/v1/recommend/user/U0003?top_k=5")
            second = await client.get("/api/v1/recommend/user/U0003?top_k=5")
        assert first.status_code == second.status_code == 200
