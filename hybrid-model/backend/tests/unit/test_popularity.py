import pandas as pd

from recommender.popularity import PopularityRecommender
from recommender.utils import load_data


class TestPopularityRecommender:
    def setup_method(self):
        self.products, _, self.interactions = load_data()
        self.model = PopularityRecommender().fit(self.products, self.interactions)

    def test_returns_top_k_with_expected_keys(self):
        recs = self.model.recommend("U0001", top_k=5)
        assert len(recs) == 5
        assert {"product_id", "name", "category", "price_npr", "interaction_count"} <= set(recs[0])

    def test_ranked_by_interaction_count_desc(self):
        recs = self.model.recommend("U0001", top_k=10)
        counts = [r["interaction_count"] for r in recs]
        assert counts == sorted(counts, reverse=True)
        # Top product should match the globally most-interacted in-stock product.
        in_stock_ids = set(self.products.loc[self.products["in_stock"].astype(bool), "product_id"])
        vc = self.interactions["product_id"].value_counts()
        top_expected = next(pid for pid in vc.index if pid in in_stock_ids)
        assert recs[0]["product_id"] == top_expected

    def test_same_list_for_every_user(self):
        a = [r["product_id"] for r in self.model.recommend("U0001", top_k=10)]
        b = [r["product_id"] for r in self.model.recommend("U0200", top_k=10)]
        assert a == b

    def test_exclude_out_of_stock(self):
        recs = self.model.recommend("U0001", top_k=20, exclude_out_of_stock=True)
        assert all(rec["in_stock"] for rec in recs)

    def test_unfitted_returns_empty(self):
        assert PopularityRecommender().recommend("U0001", top_k=5) == []
