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
        user_counts = self.interactions.groupby("user_id").size()
        power_user = user_counts.sort_values(ascending=False).index[0]
        cold_user = user_counts.sort_values(ascending=True).index[0]
        
        rec_power = self.model.recommend(power_user, 1)[0]
        rec_cold = self.model.recommend(cold_user, 1)[0]
        
        if not rec_power["is_new_arrival"] and not rec_cold["is_new_arrival"]:
            assert rec_power["alpha_used"] > rec_cold["alpha_used"]

    def test_festival_month_boosts_score_for_festival_categories(self):
        pid = self.products.loc[self.products["category"].eq("Traditional Attire"), "product_id"].iloc[0]
        recs_fest = self.model.recommend("U0042", top_k=500, context={"month": 10, "exclude_interacted": False})
        recs_norm = self.model.recommend("U0042", top_k=500, context={"month": 7, "exclude_interacted": False})
        
        fest_score = next(r["hybrid_score"] for r in recs_fest if r["product_id"] == pid)
        norm_score = next(r["hybrid_score"] for r in recs_norm if r["product_id"] == pid)
        
        assert fest_score > norm_score

    def test_cold_start_product_gets_low_alpha(self):
        # Uc / (Uc + gamma) * 0.5 (for new arrival)
        pid = self.products.loc[self.products["is_new_arrival"], "product_id"].iloc[0]
        u_c = self.model.cf.user_interaction_counts.get("U0042", 0)
        expected_alpha = (u_c / (u_c + self.model.COLD_START_THRESHOLD)) * 0.5
        assert self.model._compute_alpha("U0042", pid, None) == pytest.approx(expected_alpha)

    def test_new_arrival_gets_freshness_boost(self):
        recs = [r for u in self.users["user_id"].head(20) for r in self.model.recommend(u, 20)]
        assert any(r["freshness_boost_applied"] for r in recs)

    def test_hybrid_score_is_weighted_combination(self):
        rec = next(r for r in self.model.recommend("U0042", 20) if not r["is_new_arrival"])
        expected = rec["alpha_used"] * rec["cf_score"] + (1 - rec["alpha_used"]) * rec["cb_score"]
        assert rec["hybrid_score"] == pytest.approx(expected)
