from recommender.standalone import CollaborativeOnlyRecommender, ContentOnlyRecommender
from recommender.utils import load_data


class TestContentOnlyRecommender:
    def setup_method(self):
        self.products, _, self.interactions = load_data()
        self.model = ContentOnlyRecommender().fit(self.products, self.interactions)

    def test_recommends_from_recent_seed(self):
        recs = self.model.recommend("U0001", top_k=5)
        assert len(recs) == 5
        assert {"product_id", "similarity_score"} <= set(recs[0])

    def test_accepts_context_kwarg(self):
        # Evaluator calls recommend(..., context=...) for models exposing `cb`.
        recs = self.model.recommend("U0001", top_k=5, context={"exclude_interacted": False})
        assert len(recs) == 5

    def test_unknown_user_has_no_seed_returns_empty(self):
        assert self.model.recommend("U9999", top_k=5) == []

    def test_unfitted_returns_empty(self):
        assert ContentOnlyRecommender().recommend("U0001", top_k=5) == []


class TestCollaborativeOnlyRecommender:
    def setup_method(self):
        self.products, _, self.interactions = load_data()
        self.model = CollaborativeOnlyRecommender().fit(self.products, self.interactions)

    def test_user_with_factors_gets_svd_scores(self):
        recs = self.model.recommend("U0001", top_k=5)
        assert len(recs) == 5
        assert {"product_id", "predicted_score", "is_popularity_fallback"} <= set(recs[0])
        # A user present in the fitted matrix must NOT be served the fallback.
        assert all(r["is_popularity_fallback"] is False for r in recs)

    def test_unknown_user_gets_popularity_fallback(self):
        recs = self.model.recommend("U9999", top_k=5)
        assert len(recs) == 5
        assert all(r["is_popularity_fallback"] is True for r in recs)

    def test_unfitted_returns_empty(self):
        assert CollaborativeOnlyRecommender().recommend("U0001", top_k=5) == []
