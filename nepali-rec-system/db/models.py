"""SQLAlchemy ORM models."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base."""


class Product(Base):
    __tablename__ = "products"
    product_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    name: Mapped[str]
    category: Mapped[str]
    subcategory: Mapped[str]
    brand: Mapped[str]
    description: Mapped[str]
    price_npr: Mapped[int]
    avg_rating: Mapped[float | None]
    rating_count: Mapped[int]
    tags: Mapped[str]
    is_new_arrival: Mapped[bool]
    in_stock: Mapped[bool]
    created_at: Mapped[datetime] = mapped_column(default=func.now())


class User(Base):
    __tablename__ = "users"
    user_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    name: Mapped[str]
    city: Mapped[str]
    age: Mapped[int]
    gender: Mapped[str]
    user_type: Mapped[str]
    preferred_categories: Mapped[str]
    joined_date: Mapped[date]
    is_verified: Mapped[bool]


class Interaction(Base):
    __tablename__ = "interactions"
    interaction_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id"))
    product_id: Mapped[str] = mapped_column(ForeignKey("products.product_id"))
    interaction_type: Mapped[str]
    rating: Mapped[float | None]
    implicit_score: Mapped[float]
    timestamp: Mapped[datetime]
    month: Mapped[int]
    is_festival_period: Mapped[bool]


class CachedRecommendation(Base):
    __tablename__ = "cached_recommendations"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str]
    recommendations_json: Mapped[str]
    model_version: Mapped[str]
    computed_at: Mapped[datetime]
    expires_at: Mapped[datetime]
