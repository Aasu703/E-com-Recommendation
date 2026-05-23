"""Shared FastAPI dependencies."""

from __future__ import annotations

from fastapi import Request


def get_recommender(request: Request):
    """Return the application recommender instance."""
    return request.app.state.recommender
