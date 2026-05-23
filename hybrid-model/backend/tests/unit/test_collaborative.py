from recommender.collaborative import CollaborativeRecommender
from recommender.utils import load_data


class TestCollaborativeRecommender:
    def setup_method(self):
        self.products, _, self.interactions = load_data()
        self.model = CollaborativeRecommender().fit(self.interactions, self.products)

    def test_fit_creates_predictions_matrix(self):
        assert self.model.predictions_df.shape == (self.interactions["user_id"].nunique(), len(self.products))

    def test_cold_start_user_returns_popularity_fallback(self):
        assert self.model.recommend("U9999", 5)[0]["is_popularity_fallback"]

    def test_excludes_already_interacted_products(self):
        user = self.interactions["user_id"].iloc[0]
        seen = set(self.interactions.loc[self.interactions["user_id"] == user, "product_id"])
        recs = self.model.recommend(user, 10, interactions_df=self.interactions)
        assert not seen.intersection({r["product_id"] for r in recs})

    def test_unknown_user_does_not_crash(self):
        assert len(self.model.recommend("U9999", 5)) == 5

    def test_predicted_scores_clipped_to_0_5(self):
        assert self.model.predictions_df.min().min() >= 0
        assert self.model.predictions_df.max().max() <= 5
