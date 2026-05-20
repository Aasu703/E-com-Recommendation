"""TF-IDF content-based recommendations for the Nepali product catalog."""

from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


class ContentBasedRecommender:
    """TF-IDF content-based filtering on product metadata."""

    def __init__(self) -> None:
        """Initialize an unfitted content recommender."""
        self.products_df: pd.DataFrame | None = None
        self.tfidf_matrix = None
        self.similarity_matrix: np.ndarray | None = None
        self.product_index: dict[str, int] = {}
        self.vectorizer = TfidfVectorizer(
            max_features=3000,
            ngram_range=(1, 2),
            stop_words="english",
            min_df=2,
        )

    def fit(self, products_df: pd.DataFrame) -> "ContentBasedRecommender":
        """Fit TF-IDF features and pairwise cosine similarity."""
        self.products_df = products_df.reset_index(drop=True).copy()
        content = (
            self.products_df["description"].fillna("")
            + " "
            + (self.products_df["tags"].fillna("") + " ") * 3
            + self.products_df["category"].fillna("")
            + " "
            + self.products_df["subcategory"].fillna("")
            + " "
            + self.products_df["brand"].fillna("")
        )
        self.products_df["content_string"] = content
        self.tfidf_matrix = self.vectorizer.fit_transform(content)
        self.similarity_matrix = cosine_similarity(self.tfidf_matrix)
        self.product_index = {pid: idx for idx, pid in enumerate(self.products_df["product_id"])}
        np.save(Path(__file__).parent.parent / "nepali_ecommerce_data" / "content_similarity_matrix.npy", self.similarity_matrix)
        return self

    def recommend(
        self,
        product_id: str,
        top_k: int = 10,
        exclude_cold_start: bool = False,
        exclude_out_of_stock: bool = True,
    ) -> list[dict]:
        """Return the most similar products for a seed product."""
        if self.products_df is None or self.similarity_matrix is None:
            logger.warning("ContentBasedRecommender used before fit")
            return []
        if product_id not in self.product_index:
            logger.warning("Unknown product %s, returning empty recommendations", product_id)
            return []
        idx = self.product_index[product_id]
        scored = list(enumerate(self.similarity_matrix[idx]))
        scored.sort(key=lambda item: item[1], reverse=True)
        results: list[dict] = []
        for row_idx, score in scored:
            if row_idx == idx:
                continue
            row = self.products_df.iloc[row_idx]
            if exclude_cold_start and bool(row["is_new_arrival"]):
                continue
            if exclude_out_of_stock and not bool(row["in_stock"]):
                continue
            results.append({
                "product_id": row["product_id"],
                "name": row["name"],
                "category": row["category"],
                "subcategory": row["subcategory"],
                "brand": row["brand"],
                "price_npr": int(row["price_npr"]),
                "avg_rating": None if pd.isna(row["avg_rating"]) else float(row["avg_rating"]),
                "similarity_score": float(np.clip(score, 0, 1)),
                "is_new_arrival": bool(row["is_new_arrival"]),
                "in_stock": bool(row["in_stock"]),
            })
            if len(results) >= top_k:
                break
        return results

    def save(self, path: Path) -> None:
        """Persist the fitted model with joblib."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: Path) -> "ContentBasedRecommender":
        """Load a persisted model."""
        return joblib.load(Path(path))
