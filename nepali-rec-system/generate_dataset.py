"""Generate deterministic Nepali e-commerce CSVs when local data is absent."""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
import random

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "nepali_ecommerce_data"
RANDOM_STATE = 42


def generate_dataset(force: bool = False) -> None:
    """Create products, users, and interactions CSVs."""
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
    all_ids = [f"P{i:04d}" for i in range(1, 501)]
    cold_start_ids = set(np.random.choice(all_ids, 75, replace=False))
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
            "is_new_arrival": product_id in cold_start_ids,
            "in_stock": bool(np.random.rand() > 0.08),
        })
    products_df = pd.DataFrame(products)
    cities = ["Kathmandu", "Pokhara", "Lalitpur", "Biratnagar", "Butwal", "Dharan", "Bhaktapur"]
    users = []
    for i in range(1, 301):
        preferred = random.sample(list(categories), k=2)
        users.append({
            "user_id": f"U{i:04d}",
            "name": f"Customer {i}",
            "city": random.choice(cities),
            "age": int(np.random.randint(18, 58)),
            "gender": random.choice(["female", "male", "other"]),
            "user_type": random.choice(["new", "regular", "power"]),
            "preferred_categories": "|".join(preferred),
            "joined_date": (datetime(2023, 1, 1) + timedelta(days=int(np.random.randint(0, 720)))).date().isoformat(),
            "is_verified": bool(np.random.rand() > 0.18),
        })
    eligible_products = products_df.loc[~products_df["is_new_arrival"], "product_id"].tolist()
    event_types = [("view", 1.0), ("cart", 2.0), ("purchase", 4.0), ("rating", None)]
    interactions = []
    for i in range(1, 6195):
        interaction_type, score = random.choices(event_types, weights=[0.56, 0.2, 0.16, 0.08], k=1)[0]
        rating = None
        if interaction_type == "rating":
            rating = round(float(np.clip(np.random.normal(4.0, 0.7), 1.0, 5.0)), 1)
            score = rating
        ts = datetime(2024, 1, 1) + timedelta(days=int(np.random.randint(0, 520)))
        interactions.append({
            "interaction_id": f"I{i:05d}",
            "user_id": f"U{np.random.randint(1, 301):04d}",
            "product_id": random.choice(eligible_products),
            "interaction_type": interaction_type,
            "rating": rating,
            "implicit_score": float(score),
            "timestamp": ts.isoformat(),
            "month": ts.month,
            "is_festival_period": ts.month in {10, 11},
        })
    products_df.to_csv(DATA_DIR / "products.csv", index=False)
    pd.DataFrame(users).to_csv(DATA_DIR / "users.csv", index=False)
    pd.DataFrame(interactions).to_csv(DATA_DIR / "interactions.csv", index=False)


if __name__ == "__main__":
    generate_dataset()
