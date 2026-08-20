"""Pydantic request and response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class RecommendForUserRequest(BaseModel):
    user_id: str
    top_k: int = Field(default=10, ge=1, le=50)
    month: int | None = Field(default=None, ge=1, le=12)
    exclude_interacted: bool = True
    exclude_out_of_stock: bool = True


class SimilarProductsRequest(BaseModel):
    product_id: str
    top_k: int = Field(default=10, ge=1, le=50)
    exclude_out_of_stock: bool = True


class InteractionRequest(BaseModel):
    user_id: str | None = None
    product_id: str
    interaction_type: str = Field(default="view")


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str = Field(min_length=1)
    preferred_categories: list[str] = Field(min_length=3)


class LoginRequest(BaseModel):
    email: str
    password: str


class UserProfile(BaseModel):
    user_id: str
    email: str
    name: str
    preferred_categories: list[str]
    created_at: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class RecommendedProduct(BaseModel):
    product_id: str
    name: str
    category: str
    subcategory: str = ""
    brand: str = ""
    price_npr: int
    price_formatted: str
    image_url: str | None = None
    avg_rating: float | None = None
    in_stock: bool = True
    is_new_arrival: bool = False
    hybrid_score: float = 0
    cf_score: float = 0
    cb_score: float = 0
    alpha_used: float = 0
    is_festival_recommendation: bool = False
    freshness_boost_applied: bool = False


class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: list[RecommendedProduct]
    model_version: str
    context: dict = {}
    generated_at: str
    cached: bool


class SimilarProductsResponse(BaseModel):
    product_id: str
    seed_product_name: str
    similar_products: list[RecommendedProduct]
    generated_at: str
    cached: bool


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    redis_connected: bool
    db_connected: bool
    uptime_seconds: float
    model_version: str
