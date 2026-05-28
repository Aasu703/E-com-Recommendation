from __future__ import annotations

import pandas as pd

from recommender.collaborative import CollaborativeRecommender
from recommender.content_based import ContentBasedRecommender
from recommender.evaluator import Evaluator
from recommender.hybrid import HybridRecommender


def tiny_products() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "product_id": "P001",
                "name": "Dashain Kurta",
                "category": "Traditional Attire",
                "subcategory": "Kurta",
                "brand": "Kathmandu Craft",
                "description": "festival cotton kurta attire for nepali shoppers",
                "price_npr": 2500,
                "avg_rating": 4.6,
                "rating_count": 20,
                "tags": "festival attire kurta nepal",
                "is_new_arrival": False,
                "in_stock": True,
            },
            {
                "product_id": "P002",
                "name": "Tihar Sari",
                "category": "Traditional Attire",
                "subcategory": "Sari",
                "brand": "Himalaya",
                "description": "festival sari attire for nepali shoppers",
                "price_npr": 4200,
                "avg_rating": 4.4,
                "rating_count": 13,
                "tags": "festival attire sari nepal",
                "is_new_arrival": False,
                "in_stock": True,
            },
            {
                "product_id": "P003",
                "name": "Rice Cooker",
                "category": "Kitchen & Home",
                "subcategory": "Appliances",
                "brand": "SmartHome",
                "description": "kitchen rice cooker appliance for family meals",
                "price_npr": 3600,
                "avg_rating": 4.2,
                "rating_count": 31,
                "tags": "kitchen appliance rice nepal",
                "is_new_arrival": False,
                "in_stock": True,
            },
            {
                "product_id": "P004",
                "name": "Organic Tea",
                "category": "Daily Groceries",
                "subcategory": "Tea",
                "brand": "Ilam Gold",
                "description": "daily grocery tea from ilam for nepali homes",
                "price_npr": 550,
                "avg_rating": 4.8,
                "rating_count": 45,
                "tags": "daily grocery tea nepal",
                "is_new_arrival": True,
                "in_stock": True,
            },
            {
                "product_id": "P005",
                "name": "School Notebook",
                "category": "Books & Education",
                "subcategory": "Stationery",
                "brand": "Everest",
                "description": "education notebook stationery for school students",
                "price_npr": 120,
                "avg_rating": 4.1,
                "rating_count": 9,
                "tags": "education notebook school nepal",
                "is_new_arrival": False,
                "in_stock": True,
            },
        ]
    )


def tiny_users() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "user_id": "U_POWER",
                "name": "Power User",
                "city": "Kathmandu",
                "age": 32,
                "gender": "other",
                "user_type": "power",
                "preferred_categories": "Traditional Attire|Kitchen & Home",
                "joined_date": "2024-01-01",
                "is_verified": True,
            },
            {
                "user_id": "U_LIGHT",
                "name": "Light User",
                "city": "Pokhara",
                "age": 27,
                "gender": "female",
                "user_type": "regular",
                "preferred_categories": "Daily Groceries",
                "joined_date": "2024-03-01",
                "is_verified": True,
            },
        ]
    )


def tiny_interactions() -> pd.DataFrame:
    rows = []
    product_cycle = ["P001", "P002", "P003", "P004", "P005"]
    for idx in range(25):
        rows.append(
            {
                "interaction_id": f"I{idx + 1:03d}",
                "user_id": "U_POWER",
                "product_id": product_cycle[idx % len(product_cycle)],
                "interaction_type": "purchase" if idx % 5 == 0 else "view",
                "rating": None,
                "implicit_score": 4.0 if idx % 5 == 0 else 1.0,
                "timestamp": f"2024-12-{(idx % 20) + 1:02d}T00:00:00",
                "month": 12,
                "is_festival_period": False,
            }
        )
    for idx, product_id in enumerate(["P001", "P004", "P005"], start=26):
        rows.append(
            {
                "interaction_id": f"I{idx:03d}",
                "user_id": "U_LIGHT",
                "product_id": product_id,
                "interaction_type": "view",
                "rating": None,
                "implicit_score": 1.0,
                "timestamp": f"2025-01-{idx - 20:02d}T00:00:00",
                "month": 1,
                "is_festival_period": False,
            }
        )
    return pd.DataFrame(rows)


def test_content_based_recommender_returns_top_k_results(monkeypatch):
    monkeypatch.setattr("recommender.content_based.np.save", lambda *args, **kwargs: None)
    model = ContentBasedRecommender().fit(tiny_products())

    results = model.recommend("P001", top_k=3)

    assert len(results) == 3
    assert all({"product_id", "name"} <= set(item) for item in results)


def test_collaborative_recommender_uses_popularity_fallback_for_cold_start_user():
    model = CollaborativeRecommender().fit(tiny_interactions(), tiny_products(), k=2)

    results = model.recommend("U_COLD", top_k=3)

    assert isinstance(results, list)
    assert len(results) == 3
    assert all(item["is_popularity_fallback"] is True for item in results)


def test_hybrid_recommender_scores_and_adaptive_alpha(monkeypatch):
    monkeypatch.setattr("recommender.content_based.np.save", lambda *args, **kwargs: None)
    model = HybridRecommender().fit(tiny_products(), tiny_users(), tiny_interactions())

    results = model.recommend("U_POWER", top_k=5, context={"exclude_interacted": False})

    assert isinstance(results, list)
    assert all({"hybrid_score", "cf_score", "cb_score", "alpha_used"} <= set(item) for item in results)

    cold_alpha = model._compute_alpha("U_COLD", "P001", None)
    warm_alpha = model._compute_alpha("U_POWER", "P001", None)
    normal_month_alpha = model._compute_alpha("U_POWER", "P001", 9)
    festival_month_alpha = model._compute_alpha("U_POWER", "P001", 10)

    assert cold_alpha < warm_alpha
    assert festival_month_alpha < normal_month_alpha


def test_evaluator_returns_metrics_for_requested_k_values(monkeypatch):
    monkeypatch.setattr("recommender.content_based.np.save", lambda *args, **kwargs: None)
    model = HybridRecommender().fit(tiny_products(), tiny_users(), tiny_interactions())

    results = Evaluator().evaluate(model, tiny_interactions(), tiny_products(), [5, 10, 20])

    assert set(results) == {5, 10, 20}
    for metrics in results.values():
        assert {"precision", "recall", "ndcg", "coverage", "diversity"} <= set(metrics)
