import logging
from pathlib import Path
import joblib
import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import svds
from .utils import get_popular_products

logger = logging.getLogger(__name__)

class CollaborativeRecommender:
    def __init__(self):
        self.predictions_df = None
        self.user_interaction_counts = {}
        self.popularity_fallback = []
        self.products_df = None

    def fit(
        self,
        interactions_df: pd.DataFrame,
        products_df: pd.DataFrame,
        k: int = 20,
    ) -> "CollaborativeRecommender":
        self.products_df = products_df.copy()
        self.user_interaction_counts = interactions_df['user_id'].value_counts().to_dict()
        self.popularity_fallback = get_popular_products(interactions_df, products_df, top_k=50)
        
        user_item_matrix = interactions_df.pivot_table(
            index='user_id', columns='product_id', values='implicit_score', fill_value=0
        )
        
        k = min(k, min(user_item_matrix.shape) - 1)
        if k < 1:
            logger.warning("Not enough data to run SVD, will rely on fallback.")
            self.predictions_df = pd.DataFrame(0, index=user_item_matrix.index, columns=user_item_matrix.columns)
            return self
            
        user_means = user_item_matrix.mean(axis=1).values.reshape(-1, 1)
        matrix_centered = user_item_matrix.values - user_means
        sparse_matrix = csr_matrix(matrix_centered)
        
        U, Sigma, Vt = svds(sparse_matrix, k=k)
        Sigma = np.diag(Sigma)
        
        predicted_ratings = np.dot(np.dot(U, Sigma), Vt) + user_means
        predicted_ratings = np.clip(predicted_ratings, 0, 5)
        
        self.predictions_df = pd.DataFrame(
            predicted_ratings, columns=user_item_matrix.columns, index=user_item_matrix.index
        )
        return self

    def recommend(
        self,
        user_id: str,
        top_k: int = 10,
        exclude_interacted: bool = True,
        interactions_df: pd.DataFrame = None,
    ) -> list[dict]:
        if user_id not in self.predictions_df.index or self.user_interaction_counts.get(user_id, 0) < 3:
            logger.warning(f"Cold start or unknown user {user_id}, using fallback")
            return [
                {**p, 'predicted_score': p['popularity_score'], 'is_popularity_fallback': True}
                for p in self.popularity_fallback[:top_k]
            ]
            
        user_preds = self.predictions_df.loc[user_id].sort_values(ascending=False)
        
        if exclude_interacted and interactions_df is not None:
            interacted = interactions_df[interactions_df['user_id'] == user_id]['product_id'].tolist()
            user_preds = user_preds.drop(index=interacted, errors='ignore')
            
        recs = []
        for pid, score in user_preds.head(top_k).items():
            row = self.products_df[self.products_df['product_id'] == pid].iloc[0]
            recs.append({
                'product_id': pid,
                'name': row['name'],
                'category': row['category'],
                'price_npr': row['price_npr'],
                'predicted_score': score,
                'is_popularity_fallback': False
            })
            
        return recs

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: Path) -> "CollaborativeRecommender":
        return joblib.load(path)
