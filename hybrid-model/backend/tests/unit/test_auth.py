import asyncio

import pytest
from httpx import ASGITransport, AsyncClient
from jose import JWTError

from api import auth
from api.config import settings
from api.main import app
from recommender.baseline import BaselineRecommender
from recommender.hybrid import HybridRecommender
from recommender.utils import load_data


class TestPasswordHashing:
    def test_hash_and_verify_roundtrip(self):
        hashed = auth.hash_password("supersecret1")
        assert hashed != "supersecret1"
        assert auth.verify_password("supersecret1", hashed)

    def test_verify_rejects_wrong_password(self):
        hashed = auth.hash_password("supersecret1")
        assert not auth.verify_password("wrongpassword", hashed)


class TestTokens:
    def test_create_and_decode_roundtrip(self):
        token = auth.create_access_token("RU0001")
        payload = auth.decode_access_token(token)
        assert payload["sub"] == "RU0001"

    def test_decode_rejects_tampered_token(self):
        token = auth.create_access_token("RU0001")
        with pytest.raises(JWTError):
            auth.decode_access_token(token + "tampered")


class TestAppUsersPersistence:
    def setup_method(self):
        self._orig_users_file = settings.APP_USERS_FILE

    def teardown_method(self):
        settings.APP_USERS_FILE = self._orig_users_file

    def test_mint_real_user_id_increments(self):
        assert auth.mint_real_user_id({}) == "RU0001"
        assert auth.mint_real_user_id({"RU0001": {}}) == "RU0002"
        assert auth.mint_real_user_id({"RU0001": {}, "RU0005": {}}) == "RU0006"

    def test_mint_real_user_id_ignores_simulated_users(self):
        # Simulated dataset users (U####) must never collide with or influence RU#### minting.
        assert auth.mint_real_user_id({"U0042": {}}) == "RU0001"

    def test_save_and_load_roundtrip(self, tmp_path):
        settings.APP_USERS_FILE = str(tmp_path / "app_users.json")
        users = {"RU0001": {"email": "a@b.com"}}
        auth.save_app_users(users)
        assert auth.load_app_users() == users

    def test_load_missing_file_returns_empty_dict(self, tmp_path):
        settings.APP_USERS_FILE = str(tmp_path / "does_not_exist.json")
        assert auth.load_app_users() == {}


@pytest.mark.asyncio
class TestRegisterDuplicateEmail:
    def _client(self, tmp_path):
        # Registration mutates recommender.users_df/interactions_df, so each test
        # gets its own freshly-fitted recommender instead of sharing app.state
        # across tests (which would leak RU#### rows between test methods).
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

    async def test_duplicate_email_rejected(self, tmp_path):
        payload = {
            "email": "dup@example.com",
            "password": "supersecret1",
            "name": "First",
            "preferred_categories": ["Electronics", "Books & Education", "Daily Groceries"],
        }
        async with self._client(tmp_path) as client:
            first = await client.post("/api/v1/auth/register", json=payload)
            assert first.status_code == 200

            second = await client.post("/api/v1/auth/register", json={**payload, "name": "Second"})
            assert second.status_code == 409

    async def test_fewer_than_three_categories_rejected(self, tmp_path):
        # Pydantic's Field(min_length=3) rejects this before the handler runs.
        async with self._client(tmp_path) as client:
            res = await client.post("/api/v1/auth/register", json={
                "email": "two@example.com",
                "password": "supersecret1",
                "name": "Two Cats",
                "preferred_categories": ["Electronics", "Books & Education"],
            })
        assert res.status_code == 422

    async def test_unknown_category_rejected(self, tmp_path):
        async with self._client(tmp_path) as client:
            res = await client.post("/api/v1/auth/register", json={
                "email": "unknown@example.com",
                "password": "supersecret1",
                "name": "Unknown Cat",
                "preferred_categories": ["Electronics", "Books & Education", "Not A Real Category"],
            })
        assert res.status_code == 400
