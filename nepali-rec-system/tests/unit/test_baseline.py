import pytest

from recommender.baseline import BaselineRecommender
from recommender.utils import load_data


class TestBaselineRecommender:
    def setup_method(self):
        self.products, _, self.interactions = load_data()
        self.model = BaselineRecommender().fit(self.products, self.interactions)

    def test_returns_recent_products(self):
        recs = self.model.recommend("U0001", top_k=5)
        assert len(recs) == 5
        assert {"product_id", "name", "category", "price_npr"} <= set(recs[0])

    def test_exclude_out_of_stock(self):
        recs = self.model.recommend("U0001", top_k=20, exclude_out_of_stock=True)
        assert all(rec["in_stock"] for rec in recs)

    def test_unfitted_returns_empty(self):
        model = BaselineRecommender()
        assert model.recommend("U0001", top_k=5) == []
