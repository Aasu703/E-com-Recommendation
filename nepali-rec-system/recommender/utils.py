import logging
from pathlib import Path
import pandas as pd
import numpy as np
from typing import Tuple

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "nepali_ecommerce_data"

def load_data() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load products, users, interactions CSVs.
    Returns: (products_df, users_df, interactions_df)
    Raises: FileNotFoundError with helpful message if CSVs missing.
    """
    try:
        products_df = pd.read_csv(DATA_DIR / "products.csv")
        users_df = pd.read_csv(DATA_DIR / "users.csv")
        interactions_df = pd.read_csv(DATA_DIR / "interactions.csv")
        return products_df, users_df, interactions_df
    except FileNotFoundError as e:
        logger.error(f"Missing CSV files in {DATA_DIR}: {e}")
        raise FileNotFoundError(f"Ensure dataset exists in {DATA_DIR}") from e

def min_max_normalize(scores: np.ndarray) -> np.ndarray:
    """Normalize array to [0, 1]. Returns zeros if all values identical."""
    if len(scores) == 0:
        return scores
    min_val = np.min(scores)
    max_val = np.max(scores)
    if max_val == min_val:
        return np.zeros_like(scores)
    return (scores - min_val) / (max_val - min_val)

def get_popular_products(interactions_df: pd.DataFrame, products_df: pd.DataFrame, top_k: int = 10) -> list[dict]:
    """
    Popularity fallback for cold-start users.
    Score = 0.6 * interaction_count_normalized + 0.4 * avg_rating_normalized
    Returns list of dicts: {product_id, name, category, price_npr, popularity_score}
    """
    counts = interactions_df['product_id'].value_counts().reset_index()
    counts.columns = ['product_id', 'interaction_count']
    
    merged = pd.merge(counts, products_df[['product_id', 'avg_rating', 'name', 'category', 'price_npr']], on='product_id')
    merged['avg_rating'] = merged['avg_rating'].fillna(0)
    
    norm_counts = min_max_normalize(merged['interaction_count'].values)
    norm_ratings = min_max_normalize(merged['avg_rating'].values)
    
    merged['popularity_score'] = 0.6 * norm_counts + 0.4 * norm_ratings
    merged = merged.sort_values('popularity_score', ascending=False).head(top_k)
    
    return merged.to_dict('records')
