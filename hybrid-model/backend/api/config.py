"""Application settings."""

from __future__ import annotations

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Environment-backed settings."""

    DATABASE_URL: str = "postgresql+asyncpg://nepali_rec:password@localhost/nepali_rec_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 21600
    MODEL_DIR: str = "models/"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    DEFAULT_TOP_K: int = 10
    MAX_TOP_K: int = 50
    COLD_START_THRESHOLD: int = 1
    APP_USERS_FILE: str = "nepali_ecommerce_data/app_users.json"
    LIVE_INTERACTIONS_FILE: str = "nepali_ecommerce_data/live_interactions.csv"
    JWT_SECRET: str = "dev-only-insecure-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_origins(cls, value):
        """Allow comma-separated origins from .env."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    class Config:
        env_file = ".env"


settings = Settings()
