import logging
from pathlib import Path
import joblib
import pandas as pd
from .content_based import ContentBasedRecommender
from .collaborative import CollaborativeRecommender

logger = logging.getLogger(__name__)

class HybridRecommender:
    def __init__(self):
        self.cb = ContentBasedRecommender()
        self.cf = CollaborativeRecommender()
        self.is_fitted = False
        self.products_df = None
        self.users_df = None
        self.interactions_df = None
        self.festival_categories = {'Traditional Attire', 'Kitchen & Home', 'Handicrafts & Art', 'Daily Groceries'}

    def fit(self, products_df: pd.DataFrame, users_df: pd.DataFrame, interactions_df: pd.DataFrame) -> "HybridRecommender":
        self.products_df = products_df.copy()
        self.users_df = users_df.copy()
        self.interactions_df = interactions_df.copy()
        
        self.cb.fit(products_df)
        self.cf.fit(interactions_df, products_df)
        self.is_fitted = True
        return self

    def recommend(self, user_id: str, top_k: int = 10, context: dict | None = None) -> list[dict]:
        context = context or {}
        month = context.get('month')
        
        cf_recs_list = self.cf.recommend(user_id, top_k=50, exclude_interacted=context.get('exclude_interacted', True), interactions_df=self.interactions_df)
        cf_recs = {r['product_id']: r['predicted_score'] for r in cf_recs_list}
        
        user_history = self.interactions_df[self.interactions_df['user_id'] == user_id]
        if not user_history.empty:
            recent_item = user_history.sort_values('timestamp', ascending=False).iloc[0]['product_id']
            cb_recs = {r['product_id']: r['similarity_score'] for r in self.cb.recommend(recent_item, top_k=50)}
        else:
            cb_recs = {}
            
        all_pids = set(cf_recs.keys()) | set(cb_recs.keys())
        
        results = []
        for pid in all_pids:
            row = self.products_df[self.products_df['product_id'] == pid].iloc[0]
            if context.get('exclude_out_of_stock', True) and not row['in_stock']:
                continue
                
            cf_val = cf_recs.get(pid, 0) / 5.0 # pseudo-normalize CF to [0,1]
            cb_val = cb_recs.get(pid, 0)
            
            alpha = self._compute_alpha(user_id, pid, month)
            hybrid_score = alpha * cf_val + (1 - alpha) * cb_val
            
            freshness_boost_applied = False
            if row.get('is_new_arrival', False):
                hybrid_score += 0.08
                freshness_boost_applied = True
                
            is_festival = False
            if month in {10, 11} and row['category'] in self.festival_categories:
                is_festival = True
                
            results.append({
                'product_id': pid,
                'name': row['name'],
                'category': row['category'],
                'subcategory': row['subcategory'],
                'brand': row['brand'],
                'price_npr': row['price_npr'],
                'avg_rating': row['avg_rating'],
                'in_stock': row['in_stock'],
                'is_new_arrival': row.get('is_new_arrival', False),
                'cf_score': cf_val,
                'cb_score': cb_val,
                'hybrid_score': hybrid_score,
                'alpha_used': alpha,
                'freshness_boost_applied': freshness_boost_applied,
                'is_festival_recommendation': is_festival
            })
            
        results.sort(key=lambda x: x['hybrid_score'], reverse=True)
        return results[:top_k]

    def _compute_alpha(self, user_id: str, product_id: str, month: int | None) -> float:
        interaction_count = self.cf.user_interaction_counts.get(user_id, 0)
        
        if interaction_count >= 20: alpha = 0.75
        elif interaction_count >= 5: alpha = 0.55
        elif interaction_count > 0: alpha = 0.30
        else: alpha = 0.15
        
        row = self.products_df[self.products_df['product_id'] == product_id].iloc[0]
        if row.get('is_new_arrival', False):
            alpha = 0.05
            
        if month in {10, 11} and row['category'] in self.festival_categories:
            alpha = max(0.10, alpha - 0.20)
            
        return alpha

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: Path) -> "HybridRecommender":
        return joblib.load(path)
