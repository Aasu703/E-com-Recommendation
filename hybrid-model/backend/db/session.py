"""Database engine and seed helpers."""

from __future__ import annotations

import logging

from sqlalchemy import create_engine, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session

from api.config import settings
from db.models import Base, Interaction, Product, User
from recommender.utils import load_data

logger = logging.getLogger(__name__)
async_engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False)


def _sync_url() -> str:
    return settings.DATABASE_URL.replace("+asyncpg", "")


def seed_database_from_csvs() -> None:
    """Seed PostgreSQL from CSVs, skipping already-populated tables."""
    engine = create_engine(_sync_url())
    Base.metadata.create_all(engine)
    products_df, users_df, interactions_df = load_data()
    with Session(engine) as session:
        existing = session.scalar(select(func.count()).select_from(Product))
        if existing:
            logger.info("Database already seeded with %s products", existing)
            return
        session.bulk_insert_mappings(Product, products_df.to_dict("records"))
        session.bulk_insert_mappings(User, users_df.to_dict("records"))
        rows = interactions_df.where(interactions_df.notna(), None).to_dict("records")
        session.bulk_insert_mappings(Interaction, rows)
        session.commit()
        logger.info("Seeded %s products, %s users, %s interactions", len(products_df), len(users_df), len(interactions_df))
