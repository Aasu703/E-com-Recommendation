import logging
from pathlib import Path
import joblib
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

class ContentBasedRecommender:
    """
    TF-IDF content-based filtering on Nepali product catalog.
    """
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=3000, ngram_range=(1,2), stop_words='english', min_df=2)
        self.products_df = None
        self.similarity_matrix = None
        self.product_index = {}

    def fit(self, products_df: pd.DataFrame) -> "ContentBasedRecommender":
        self.products_df = products_df.copy()
        
        # AGENT DECISION: Fill missing tags with empty string to avoid errors
        self.products_df['tags'] = self.products_df['tags'].fillna('')
        self.products_df['description'] = self.products_df['description'].fillna('')
        
        content_strings = (
            self.products_df['description'] + " " + 
            (self.products_df['tags'] + " ") * 3 + 
            self.products_df['category'] + " " + 
            self.products_df['subcategory'] + " " + 
            self.products_df['brand']
        )
        
        tfidf_matrix = self.vectorizer.fit_transform(content_strings)
        self.similarity_matrix = cosine_similarity(tfidf_matrix)
        self.product_index = {pid: idx for idx, pid in enumerate(self.products_df['product_id'])}
        
        return self

    def recommend(
        self,
        product_id: str,
        top_k: int = 10,
        exclude_cold_start: bool = False,
        exclude_out_of_stock: bool = True,
    ) -> list[dict]:
        if product_id not in self.product_index:
            logger.warning(f"Unknown product {product_id}, returning empty list")
            return []
            
        idx = self.product_index[product_id]
        sim_scores = list(enumerate(self.similarity_matrix[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        
        recs = []
        for i, score in sim_scores:
            if i == idx:
                continue
                
            row = self.products_df.iloc[i]
            if exclude_out_of_stock and not row['in_stock']:
                continue
                
            if exclude_cold_start and row.get('is_new_arrival', False):
                continue
                
            recs.append({
                'product_id': row['product_id'],
                'name': row['name'],
                'category': row['category'],
                'subcategory': row['subcategory'],
                'brand': row['brand'],
                'price_npr': row['price_npr'],
                'avg_rating': row['avg_rating'],
                'similarity_score': score,
                'is_new_arrival': row.get('is_new_arrival', False),
                'in_stock': row['in_stock']
            })
            if len(recs) >= top_k:
                break
                
        return recs

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: Path) -> "ContentBasedRecommender":
        return joblib.load(path)
