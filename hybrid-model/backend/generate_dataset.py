"""Generate the deterministic Nepali e-commerce CSVs (dataset v3).

Dataset v3 scales dataset v2 up ~5x (more products/users/interactions per
cohort) for a stronger accuracy signal, while keeping the same genuine
cold-start structure introduced in v2 so RQ3 (cold-start handling) remains
measurable. See DATASET.md "Dataset v3 changelog" and
results/RESULTS_SUMMARY.md section 3 for the v1->v2 motivating finding (the v1
RQ3 cold-start segment was empty because every user had >= 6 train interactions).

Cohorts (all deterministic under RANDOM_STATE = 42):
  * ACTIVE  U0001-U1200 (1,200 users): ~25 interactions each (v1/v2-like
    density), contributing ~30,000 rows.
  * LOW-ACTIVITY  U1201-U1350 (150 users): 1-3 interactions each, spread across
    the whole time range -> <= 3 TRAIN interactions at the split (below gamma=3).
  * COLD-START  U1351-U1500 (150 users): 0-3 interactions each, joined 2025-01-01
    or later, all interaction timestamps >= 2025-01-15 -> ZERO train history at
    the 2025-01-01 split; >= 40 of these users have exactly 0 interactions.

Item cold-start: 200 products drawn from the is_new_arrival pool are flagged
with a new boolean column ``is_cold_item`` in products.csv. They receive ZERO
interactions before 2025-01-01 and only sparse interactions afterwards.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
import random

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "nepali_ecommerce_data"
RANDOM_STATE = 42

# Cohort boundaries (inclusive user index ranges).
N_USERS = 1500
ACTIVE_MAX = 1200          # U0001-U1200
LOW_ACTIVITY_MAX = 1350    # U1201-U1350
# COLD_START: U1351-U1500

ACTIVE_INTERACTIONS = 30000  # total rows contributed by the active cohort
N_COLD_ITEMS = 200
N_PRODUCTS = 2500
N_NEW_ARRIVALS = 375
N_ZERO_HISTORY_COLD_USERS = 40

# Time geometry. Interaction timestamps span a 520-day window from 2024-01-01
# (matching v1), i.e. up to 2025-06-04. The fixed-date evaluation split is
# 2025-01-01 (day 366 of the window).
DATA_START = datetime(2024, 1, 1)
WINDOW_DAYS = 520
SPLIT_DATE = datetime(2025, 1, 1)
SPLIT_OFFSET = (SPLIT_DATE - DATA_START).days               # 366
COLD_USER_START = datetime(2025, 1, 15)
COLD_USER_OFFSET = (COLD_USER_START - DATA_START).days      # 380

EVENT_TYPES = [("view", 1.0), ("cart", 2.0), ("purchase", 4.0), ("rating", None)]
EVENT_WEIGHTS = [0.56, 0.2, 0.16, 0.08]


def _make_interaction(user_id: str, product_id: str, ts: datetime) -> dict:
    """Build a single interaction row (interaction_id assigned later)."""
    interaction_type, score = random.choices(EVENT_TYPES, weights=EVENT_WEIGHTS, k=1)[0]
    rating = None
    if interaction_type == "rating":
        rating = round(float(np.clip(np.random.normal(4.0, 0.7), 1.0, 5.0)), 1)
        score = rating
    return {
        "user_id": user_id,
        "product_id": product_id,
        "interaction_type": interaction_type,
        "rating": rating,
        "implicit_score": float(score),
        "timestamp": ts.isoformat(),
        "month": ts.month,
        "is_festival_period": ts.month in {10, 11},
    }


def _ts(offset_days: int) -> datetime:
    return DATA_START + timedelta(days=int(offset_days))


def generate_dataset(force: bool = False) -> None:
    """Create products, users, and interactions CSVs (dataset v3)."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    paths = [DATA_DIR / "products.csv", DATA_DIR / "users.csv", DATA_DIR / "interactions.csv"]
    if not force and all(path.exists() for path in paths):
        return
    random.seed(RANDOM_STATE)
    np.random.seed(RANDOM_STATE)

    categories = {
        "Traditional Attire": ["Daura Suruwal", "Saree", "Kurta", "Dhaka Topi"],
        "Handicrafts & Art": ["Thangka", "Woodcraft", "Metal Craft", "Lokta Paper"],
        "Electronics": ["Mobile", "Headphones", "Accessories", "Smart Watch"],
        "Kitchen & Home": ["Cookware", "Decor", "Bedding", "Appliances"],
        "Daily Groceries": ["Rice", "Tea", "Spices", "Snacks"],
        "Fashion & Accessories": ["Bags", "Shoes", "Jewellery", "Sunglasses"],
        "Books & Education": ["Exam Prep", "Children Books", "Literature", "Stationery"],
    }
    brands = ["Himalaya", "Kathmandu Craft", "Sagarmatha", "Lalitpur Looms", "NepTech", "Janakpur Mart"]
    all_ids = [f"P{i:04d}" for i in range(1, N_PRODUCTS + 1)]

    # New arrivals (5x the v1/v2 count). A subset are the item-cold-start test set.
    new_arrival_ids = set(np.random.choice(all_ids, N_NEW_ARRIVALS, replace=False))
    cold_item_ids = set(np.random.choice(sorted(new_arrival_ids), N_COLD_ITEMS, replace=False))

    products = []
    for i, product_id in enumerate(all_ids, start=1):
        category = random.choice(list(categories))
        subcategory = random.choice(categories[category])
        brand = random.choice(brands)
        products.append({
            "product_id": product_id,
            "name": f"{brand} {subcategory} {i}",
            "category": category,
            "subcategory": subcategory,
            "brand": brand,
            "description": f"{subcategory} made for Nepali shoppers with reliable quality and local style.",
            "price_npr": int(np.random.choice([350, 550, 899, 1250, 1800, 2500, 4200, 6500, 9800, 14500])),
            "avg_rating": round(float(np.clip(np.random.normal(4.0, 0.55), 2.2, 5.0)), 1),
            "rating_count": int(np.random.randint(0, 420)),
            "tags": f"{category.lower()}, {subcategory.lower()}, nepal, {brand.lower()}, gift",
            "is_new_arrival": product_id in new_arrival_ids,
            "in_stock": bool(np.random.rand() > 0.08),
            "is_cold_item": product_id in cold_item_ids,
        })
    products_df = pd.DataFrame(products)

    cities = ["Kathmandu", "Pokhara", "Lalitpur", "Biratnagar", "Butwal", "Dharan", "Bhaktapur"]
    users = []
    for i in range(1, N_USERS + 1):
        preferred = random.sample(list(categories), k=2)
        if i <= LOW_ACTIVITY_MAX:
            # Active + low-activity cohorts keep the v1 joined-date window.
            joined = (datetime(2023, 1, 1) + timedelta(days=int(np.random.randint(0, 720)))).date()
        else:
            # Cold-start cohort: brand-new accounts created on/after 2025-01-01.
            joined = (SPLIT_DATE + timedelta(days=int(np.random.randint(0, 150)))).date()
        users.append({
            "user_id": f"U{i:04d}",
            "name": f"Customer {i}",
            "city": random.choice(cities),
            "age": int(np.random.randint(18, 58)),
            "gender": random.choice(["female", "male", "other"]),
            "user_type": random.choice(["new", "regular", "power"]),
            "preferred_categories": "|".join(preferred),
            "joined_date": joined.isoformat(),
            "is_verified": bool(np.random.rand() > 0.18),
        })
    users_df = pd.DataFrame(users)

    # Regular interactions are drawn only from non-new-arrival products, so the
    # new-arrival pool (and therefore every cold item) has zero pre-cutoff history.
    eligible_products = products_df.loc[~products_df["is_new_arrival"], "product_id"].tolist()
    active_ids = [f"U{i:04d}" for i in range(1, ACTIVE_MAX + 1)]

    interactions: list[dict] = []

    # --- Active cohort: ~6,000 rows across U0001-U0240 (v1-like random assignment).
    for _ in range(ACTIVE_INTERACTIONS):
        user_id = f"U{np.random.randint(1, ACTIVE_MAX + 1):04d}"
        product_id = random.choice(eligible_products)
        ts = _ts(np.random.randint(0, WINDOW_DAYS))
        interactions.append(_make_interaction(user_id, product_id, ts))

    # --- Low-activity cohort: U0241-U0270, 1-3 interactions each, whole range.
    for i in range(ACTIVE_MAX + 1, LOW_ACTIVITY_MAX + 1):
        user_id = f"U{i:04d}"
        n = int(np.random.randint(1, 4))  # 1..3
        for _ in range(n):
            product_id = random.choice(eligible_products)
            ts = _ts(np.random.randint(0, WINDOW_DAYS))
            interactions.append(_make_interaction(user_id, product_id, ts))

    # --- Cold-start cohort: U1351-U1500, 0-3 interactions each, timestamps
    #     >= 2025-01-15 (all in the test period). Guarantee >= 40 zero-history users.
    cold_user_indices = list(range(LOW_ACTIVITY_MAX + 1, N_USERS + 1))  # 1351..1500
    cold_counts = [int(np.random.randint(1, 4)) for _ in cold_user_indices]  # 1..3
    zero_positions = np.random.choice(len(cold_user_indices), N_ZERO_HISTORY_COLD_USERS, replace=False)
    for pos in zero_positions:
        cold_counts[pos] = 0
    for idx, n in zip(cold_user_indices, cold_counts):
        user_id = f"U{idx:04d}"
        for _ in range(n):
            product_id = random.choice(eligible_products)
            ts = _ts(np.random.randint(COLD_USER_OFFSET, WINDOW_DAYS))
            interactions.append(_make_interaction(user_id, product_id, ts))

    # --- Item cold-start: sparse (0-2) post-cutoff interactions on the 40 cold
    #     items, attributed to active users so there is some CF signal in the
    #     TEST period but none in TRAIN.
    for product_id in sorted(cold_item_ids):
        n = int(np.random.randint(0, 3))  # 0..2
        for _ in range(n):
            user_id = random.choice(active_ids)
            ts = _ts(np.random.randint(SPLIT_OFFSET + 1, WINDOW_DAYS))
            interactions.append(_make_interaction(user_id, product_id, ts))

    for i, row in enumerate(interactions, start=1):
        row["interaction_id"] = f"I{i:05d}"

    column_order = [
        "interaction_id", "user_id", "product_id", "interaction_type", "rating",
        "implicit_score", "timestamp", "month", "is_festival_period",
    ]
    interactions_df = pd.DataFrame(interactions)[column_order]

    products_df.to_csv(DATA_DIR / "products.csv", index=False)
    users_df.to_csv(DATA_DIR / "users.csv", index=False)
    interactions_df.to_csv(DATA_DIR / "interactions.csv", index=False)


if __name__ == "__main__":
    generate_dataset(force=True)
