from recommender.content_based import ContentBasedRecommender
from recommender.utils import load_data


class TestContentBasedRecommender:
    def setup_method(self):
        self.products, _, _ = load_data()
        self.model = ContentBasedRecommender().fit(self.products)

    def test_fit_returns_self(self):
        assert isinstance(self.model.fit(self.products), ContentBasedRecommender)

    def test_recommend_returns_correct_count(self):
        assert len(self.model.recommend("P0001", 5)) == 5

    def test_unknown_product_returns_empty_list(self):
        assert self.model.recommend("UNKNOWN", 5) == []

    def test_similarity_scores_between_0_and_1(self):
        assert all(0 <= r["similarity_score"] <= 1 for r in self.model.recommend("P0001", 5))

    def test_cold_start_product_can_be_recommended(self):
        pid = self.products.loc[self.products["is_new_arrival"], "product_id"].iloc[0]
        assert len(self.model.recommend(pid, 5)) == 5

    def test_excludes_out_of_stock_when_flag_set(self):
        assert all(r["in_stock"] for r in self.model.recommend("P0001", 20, exclude_out_of_stock=True))
