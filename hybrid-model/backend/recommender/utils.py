"""Shared utilities for loading data and normalizing scores."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)
DATA_DIR = Path(__file__).parent.parent / "nepali_ecommerce_data"


def load_data() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load products, users, and interactions CSVs."""
    required = ["products.csv", "users.csv", "interactions.csv"]
    missing = [name for name in required if not (DATA_DIR / name).exists()]
    if missing:
        # AGENT DECISION: The supplied workspace was missing the promised CSVs, so
        # deterministic local data is generated only when the files do not exist.
        from generate_dataset import generate_dataset

        generate_dataset()
        missing = [name for name in required if not (DATA_DIR / name).exists()]
    if missing:
        raise FileNotFoundError(f"Missing CSV files in {DATA_DIR}: {missing}")
    return (
        pd.read_csv(DATA_DIR / "products.csv"),
        pd.read_csv(DATA_DIR / "users.csv"),
        pd.read_csv(DATA_DIR / "interactions.csv"),
    )


def min_max_normalize(scores: np.ndarray) -> np.ndarray:
    """Normalize array to [0, 1], returning zeros when all values match."""
    arr = np.asarray(scores, dtype=float)
    if arr.size == 0:
        return arr
    min_val = np.nanmin(arr)
    max_val = np.nanmax(arr)
    if np.isclose(min_val, max_val):
        return np.zeros_like(arr, dtype=float)
    return (arr - min_val) / (max_val - min_val)


def get_popular_products(
    interactions_df: pd.DataFrame,
    products_df: pd.DataFrame,
    top_k: int = 10,
) -> list[dict]:
    """Return popularity fallback products."""
    counts = interactions_df["product_id"].value_counts().rename("interaction_count").reset_index()
    merged = products_df.merge(counts, on="product_id", how="left")
    merged["interaction_count"] = merged["interaction_count"].fillna(0)
    merged["avg_rating"] = merged["avg_rating"].fillna(0)
    merged["popularity_score"] = (
        0.6 * min_max_normalize(merged["interaction_count"].to_numpy())
        + 0.4 * min_max_normalize(merged["avg_rating"].to_numpy())
    )
    if "image_url" not in merged.columns:
        merged["image_url"] = None
    cols = ["product_id", "name", "category", "price_npr", "image_url", "popularity_score"]
    return merged.sort_values("popularity_score", ascending=False).head(top_k)[cols].to_dict("records")
