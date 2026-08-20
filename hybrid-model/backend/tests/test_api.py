from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import app
from recommender.baseline import BaselineRecommender
from recommender.hybrid import HybridRecommender
from recommender.utils import load_data


def ensure_app_state() -> None:
    if hasattr(app.state, "recommender"):
        return

    products, users, interactions = load_data()
    app.state.recommender = HybridRecommender().fit(products, users, interactions)
    app.state.baseline_recommender = BaselineRecommender().fit(products, interactions)
    app.state.started_at = 0
    app.state.total_recommendations_served = 0
    app.state.cache_hits = 0
    app.state.model_version = "test"
    app.state.redis = None
    app.state.redis_connected = False
    app.state.db_connected = False


@pytest.fixture
async def client():
    ensure_app_state()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as async_client:
        yield async_client


@pytest.mark.asyncio
async def test_health_returns_ok(client):
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_user_recommendations_return_known_user_results(client):
    response = await client.get("/api/v1/recommend/user/U0001?top_k=5")

    assert response.status_code == 200
    recommendations = response.json()["recommendations"]
    assert isinstance(recommendations, list)
    assert len(recommendations) <= 5


@pytest.mark.asyncio
async def test_unknown_user_is_handled_without_500(client):
    response = await client.get("/api/v1/recommend/user/UNKNOWN_USER_XYZ?top_k=5")

    assert response.status_code != 500
    if response.status_code == 200:
        assert isinstance(response.json()["recommendations"], list)


@pytest.mark.asyncio
async def test_similar_products_returns_list_for_known_product(client):
    response = await client.get("/api/v1/recommend/product/P0001/similar?top_k=3")

    assert response.status_code == 200
    assert isinstance(response.json()["similar_products"], list)


@pytest.mark.asyncio
async def test_similar_products_unknown_product_returns_404(client):
    response = await client.get("/api/v1/recommend/product/UNKNOWN_PRODUCT_XYZ/similar")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_popular_recommendations_return_top_k_list(client):
    response = await client.get("/api/v1/recommend/popular?top_k=5")

    assert response.status_code == 200
    recommendations = response.json()["recommendations"]
    assert isinstance(recommendations, list)
    assert len(recommendations) == 5


# ---------------------------------------------------------------------------
# Catalogue search / filter / sort / pagination
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_products_list_paginates(client):
    response = await client.get("/api/v1/products?limit=5&page=1")

    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 1
    assert body["limit"] == 5
    assert len(body["items"]) == 5
    assert body["total"] >= 5


@pytest.mark.asyncio
async def test_products_search_matches_name(client):
    response = await client.get("/api/v1/products?q=Tea&limit=100")

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) > 0
    assert all("tea" in item["name"].lower() for item in items)


@pytest.mark.asyncio
async def test_products_search_matches_brand_and_tag(client):
    by_brand = await client.get("/api/v1/products?q=himalaya&limit=100")
    by_tag = await client.get("/api/v1/products?q=thangka&limit=100")

    assert by_brand.status_code == 200
    assert by_tag.status_code == 200
    assert all(
        "himalaya" in item["brand"].lower() for item in by_brand.json()["items"]
    )
    assert all(
        "thangka" in item["tags"].lower() for item in by_tag.json()["items"]
    )


@pytest.mark.asyncio
async def test_products_filter_by_category_and_stock(client):
    response = await client.get(
        "/api/v1/products?category=Electronics&in_stock=true&limit=100"
    )

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) > 0
    assert all(item["category"] == "Electronics" for item in items)
    assert all(item["in_stock"] for item in items)


@pytest.mark.asyncio
async def test_products_sort_by_price_asc(client):
    response = await client.get("/api/v1/products?sort=price_asc&limit=100")

    assert response.status_code == 200
    prices = [item["price_npr"] for item in response.json()["items"]]
    assert prices == sorted(prices)


@pytest.mark.asyncio
async def test_products_unknown_sort_rejected(client):
    response = await client.get("/api/v1/products?sort=bogus")

    assert response.status_code == 400
