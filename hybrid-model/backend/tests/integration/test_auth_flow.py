import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from api.config import settings
from api.main import app
from recommender.baseline import BaselineRecommender
from recommender.hybrid import HybridRecommender
from recommender.utils import load_data


@pytest.mark.asyncio
class TestAuthFlow:
    def _client(self, tmp_path):
        # Each test gets its own freshly-fitted recommender: registration mutates
        # users_df/interactions_df, and these must not leak between test methods.
        settings.APP_USERS_FILE = str(tmp_path / "app_users.json")
        settings.LIVE_INTERACTIONS_FILE = str(tmp_path / "live_interactions.csv")
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
        app.state.app_users = {}
        app.state.app_users_lock = asyncio.Lock()
        return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    async def test_register_onboard_recommend_interact_changes_recommendations(self, tmp_path):
        categories = ["Electronics", "Books & Education", "Daily Groceries"]
        async with self._client(tmp_path) as client:
            # Register (auto-authenticates), simulating the onboarding quiz submission.
            res = await client.post("/api/v1/auth/register", json={
                "email": "flow@example.com",
                "password": "supersecret1",
                "name": "Flow User",
                "preferred_categories": categories,
            })
            assert res.status_code == 200
            body = res.json()
            token = body["access_token"]
            user_id = body["user"]["user_id"]
            assert user_id.startswith("RU")
            headers = {"Authorization": f"Bearer {token}"}

            me = await client.get("/api/v1/auth/me", headers=headers)
            assert me.status_code == 200
            assert me.json()["user_id"] == user_id

            # Cold start: first recommendations are blended across the chosen categories,
            # not dominated by a single one, and the interaction count starts honest at 0.
            first = await client.get(f"/api/v1/recommend/user/{user_id}?top_k=9")
            assert first.status_code == 200
            first_body = first.json()
            assert first_body["context"]["cold_start_blend"] is True
            assert first_body["context"]["user_interaction_count"] == 0
            first_ids = [r["product_id"] for r in first_body["recommendations"]]
            categories_seen = {r["category"] for r in first_body["recommendations"]}
            assert len(categories_seen & set(categories)) >= 2
            assert len(first_ids) > 0

            # Live loop: log real interactions via the JWT, no body user_id required.
            for product_id in first_ids[:5]:
                interact = await client.post(
                    "/api/v1/recommend/interact",
                    json={"product_id": product_id, "interaction_type": "click"},
                    headers=headers,
                )
                assert interact.status_code == 200
                assert interact.json()["recorded"]["user_id"] == user_id

            # Recommendations visibly reflect the new interaction count and shifted alpha.
            second = await client.get(f"/api/v1/recommend/user/{user_id}?top_k=9")
            second_body = second.json()
            assert second_body["context"]["user_interaction_count"] == 5
            assert second_body["context"]["alpha_avg"] > first_body["context"]["alpha_avg"]

    async def test_interact_rejects_unknown_type(self, tmp_path):
        async with self._client(tmp_path) as client:
            res = await client.post("/api/v1/auth/register", json={
                "email": "badtype@example.com",
                "password": "supersecret1",
                "name": "Bad Type",
                "preferred_categories": ["Electronics", "Books & Education", "Daily Groceries"],
            })
            token = res.json()["access_token"]
            interact = await client.post(
                "/api/v1/recommend/interact",
                json={"product_id": "P0001", "interaction_type": "not_a_type"},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert interact.status_code == 400

    async def test_interact_without_user_id_or_token_rejected(self, tmp_path):
        async with self._client(tmp_path) as client:
            res = await client.post(
                "/api/v1/recommend/interact",
                json={"product_id": "P0001", "interaction_type": "view"},
            )
        assert res.status_code == 400

    async def test_demo_persona_interact_still_works_without_auth(self, tmp_path):
        # /demo's body-supplied user_id path must keep working unauthenticated.
        async with self._client(tmp_path) as client:
            res = await client.post(
                "/api/v1/recommend/interact",
                json={"user_id": "U0001", "product_id": "P0001", "interaction_type": "view"},
            )
        assert res.status_code == 200
        assert res.json()["recorded"]["user_id"] == "U0001"

    async def test_restart_replay_preserves_real_user_and_interactions(self, tmp_path):
        async with self._client(tmp_path) as client:
            res = await client.post("/api/v1/auth/register", json={
                "email": "restart@example.com",
                "password": "supersecret1",
                "name": "Restart User",
                "preferred_categories": ["Electronics", "Books & Education", "Daily Groceries"],
            })
            token = res.json()["access_token"]
            user_id = res.json()["user"]["user_id"]

            await client.post(
                "/api/v1/recommend/interact",
                json={"product_id": "P0001", "interaction_type": "click"},
                headers={"Authorization": f"Bearer {token}"},
            )

        # Simulate a server restart: fresh recommender fit from the static CSVs only,
        # then replay the persisted real users + live interactions on top of it.
        from api.auth import replay_live_state

        p, u, i = load_data()
        fresh_recommender = HybridRecommender().fit(p, u, i)
        app.state.app_users = replay_live_state(fresh_recommender)
        app.state.recommender = fresh_recommender

        assert user_id in app.state.app_users
        assert (fresh_recommender.users_df["user_id"] == user_id).any()
        assert fresh_recommender.cf.user_interaction_counts.get(user_id, 0) == 1
