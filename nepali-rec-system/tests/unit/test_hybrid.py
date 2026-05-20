import pytest

from recommender.hybrid import HybridRecommender
from recommender.utils import load_data


class TestHybridRecommender:
    def setup_method(self):
        self.products, self.users, self.interactions = load_data()
        self.model = HybridRecommender().fit(self.products, self.users, self.interactions)

    def test_recommend_returns_alpha_per_item(self):
        recs = self.model.recommend("U0042", 5)
        assert len(recs) == 5
        assert {"hybrid_score", "alpha_used", "cf_score", "cb_score"} <= set(recs[0])

    def test_power_user_gets_higher_alpha(self):
        user = self.interactions.groupby("user_id").size().sort_values(ascending=False).index[0]
        rec = self.model.recommend(user, 1)[0]
        assert rec["alpha_used"] >= 0.55 or rec["is_new_arrival"]

    def test_festival_month_reduces_alpha_for_festival_categories(self):
        pid = self.products.loc[self.products["category"].eq("Traditional Attire") & ~self.products["is_new_arrival"], "product_id"].iloc[0]
        assert self.model._compute_alpha("U0042", pid, 10) <= self.model._compute_alpha("U0042", pid, 7)

    def test_cold_start_product_gets_low_alpha(self):
        pid = self.products.loc[self.products["is_new_arrival"], "product_id"].iloc[0]
        assert self.model._compute_alpha("U0042", pid, None) == pytest.approx(0.05)

    def test_new_arrival_gets_freshness_boost(self):
        recs = [r for u in self.users["user_id"].head(20) for r in self.model.recommend(u, 20)]
        assert any(r["freshness_boost_applied"] for r in recs)

    def test_hybrid_score_is_weighted_combination(self):
        rec = next(r for r in self.model.recommend("U0042", 20) if not r["is_new_arrival"])
        expected = rec["alpha_used"] * rec["cf_score"] + (1 - rec["alpha_used"]) * rec["cb_score"]
        assert rec["hybrid_score"] == pytest.approx(expected)
