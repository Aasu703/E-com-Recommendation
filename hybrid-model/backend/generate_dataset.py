"""Generate the deterministic Nepali e-commerce CSVs (dataset v4).

Dataset v4 fixes a methodological weakness of v1-v3: those datasets drew every
interaction uniformly at random from the eligible catalog, so the data
contained NO recoverable user-preference signal and every model sat at the
noise floor by construction (see results/RESULTS_SUMMARY.md and REPO_AUDIT.md).
v4 plants a latent preference structure that models can actually recover:

  * Each user has a category-affinity vector driven by their onboarding
    `preferred_categories` (multiplier PREF_CAT_BOOST) plus demographic
    modulators (age / gender) and a per-user preferred brand and price point.
  * Interaction selection is weighted by
        w = (cat_affinity[cat]^AFFINITY_EXP) * brand_affinity[brand]
            * price_fit(user, product) * (1 + POP_WEIGHT * popularity_norm)
    so users interact disproportionately with items matching their tastes --
    a realistic, learnable signal for CF (SVD), CB (category similarity) and
    personalized popularity alike.

v4 also extends the time window from 520 to 720 days (2024-01-01 ->
2025-12-21), so a full 2025 festival season (months 10-11) now falls in the
TEST period (>= 2025-01-01). This makes the festival boost empirically
testable for the first time (in v1-v3 the test window covered months 1-6 only,
so the boost could never fire during evaluation).

The genuine cold-start structure introduced in v2 is preserved unchanged:
  * ACTIVE  U0001-U1200  (1,200 users), ~25 interactions each.
  * LOW-ACTIVITY  U1201-U1350  (150 users), 1-3 interactions each.
  * COLD-START  U1351-U1500  (150 users), joined >= 2025-01-01, all
    interaction timestamps >= 2025-01-15 -> ZERO train history at the
    2025-01-01 split; >= 40 users with exactly 0 interactions.
Item cold-start: 200 `is_cold_item` products (subset of the is_new_arrival
pool) receive ZERO pre-cutoff interactions and only sparse post-cutoff ones.

All randomness is seeded. The seed and output directory are parameters so the
multi-seed robustness check (results_multiseed.py) can generate independent
realisations without overwriting the primary dataset.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote
import random

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "nepali_ecommerce_data"
RANDOM_STATE = 42

# Deterministic per-category placeholder colour, matching the storefront's
# "Dashain dusk" palette. No product photography is scraped (see README "Why
# Synthetic Data?"), so product images are generated offline as inline SVG
# data URIs -- reproducible, no network dependency, no RNG draws (so adding
# this column cannot shift the seeded random/np.random sequence used by every
# other field).
CATEGORY_COLORS = {
    "Traditional Attire": "#6B3119",
    "Handicrafts & Art": "#8B3E1E",
    "Electronics": "#38598C",
    "Kitchen & Home": "#B5750F",
    "Daily Groceries": "#3F7D3A",
    "Fashion & Accessories": "#7E301A",
    "Books & Education": "#5A4E3A",
}

# Category order is fixed so every index arithmetic in the affinity model is
# stable and reproducible across runs and seeds.
CATEGORIES = [
    "Traditional Attire",
    "Handicrafts & Art",
    "Electronics",
    "Kitchen & Home",
    "Daily Groceries",
    "Fashion & Accessories",
    "Books & Education",
]
CATEGORY_SUBCATEGORIES = {
    "Traditional Attire": ["Daura Suruwal", "Saree", "Kurta", "Dhaka Topi"],
    "Handicrafts & Art": ["Thangka", "Woodcraft", "Metal Craft", "Lokta Paper"],
    "Electronics": ["Mobile", "Headphones", "Accessories", "Smart Watch"],
    "Kitchen & Home": ["Cookware", "Decor", "Bedding", "Appliances"],
    "Daily Groceries": ["Rice", "Tea", "Spices", "Snacks"],
    "Fashion & Accessories": ["Bags", "Shoes", "Jewellery", "Sunglasses"],
    "Books & Education": ["Exam Prep", "Children Books", "Literature", "Stationery"],
}
BRANDS = ["Himalaya", "Kathmandu Craft", "Sagarmatha", "Lalitpur Looms", "NepTech", "Janakpur Mart"]
CITIES = ["Kathmandu", "Pokhara", "Lalitpur", "Biratnagar", "Butwal", "Dharan", "Bhaktapur"]
PRICE_CHOICES = [350, 550, 899, 1250, 1800, 2500, 4200, 6500, 9800, 14500]

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

# Time geometry. Interaction timestamps span a 720-day window from 2024-01-01
# up to 2025-12-21. The fixed-date evaluation split is 2025-01-01 (day 366 of
# the window); the test period therefore contains a full 2025 festival season
# (months 10-11), making the festival boost testable.
DATA_START = datetime(2024, 1, 1)
WINDOW_DAYS = 720
SPLIT_DATE = datetime(2025, 1, 1)
SPLIT_OFFSET = (SPLIT_DATE - DATA_START).days               # 366
COLD_USER_START = datetime(2025, 1, 15)
COLD_USER_OFFSET = (COLD_USER_START - DATA_START).days      # 380

EVENT_TYPES = [("view", 1.0), ("cart", 2.0), ("purchase", 4.0), ("rating", None)]
EVENT_WEIGHTS = [0.56, 0.2, 0.16, 0.08]

# v4 latent-preference tuning constants (all seeded; chosen to give a strong
# but not degenerate signal -- see results_multiseed.py for cross-seed spread).
PREF_CAT_BOOST = 4.0   # onboarding `preferred_categories` affinity multiplier
AGE_CAT_MULT = 1.6     # demographic (age/gender) category multiplier
BRAND_BOOST = 2.0      # preferred-brand affinity multiplier
PRICE_SIGMA = 0.7      # log-price tolerance for the price-fit kernel
AFFINITY_EXP = 2.0     # concentration of the category-affinity weighting
POP_WEIGHT = 2.0       # weight of item popularity in the interaction score


def _placeholder_image(category: str, subcategory: str) -> str:
    color = CATEGORY_COLORS.get(category, "#6B3119")
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">'
        f'<rect width="400" height="400" fill="{color}"/>'
        '<text x="200" y="190" font-family="Georgia,serif" font-size="28" '
        f'fill="#F8F3E9" text-anchor="middle">{subcategory}</text>'
        '<text x="200" y="224" font-family="Georgia,serif" font-size="14" '
        f'fill="#F8F3E9" text-anchor="middle" opacity="0.75">{category}</text>'
        '</svg>'
    )
    return "data:image/svg+xml," + quote(svg)


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


def _price_fit(log_price: np.ndarray, pref_price_log: float) -> np.ndarray:
    """Gaussian falloff of a product's log-price around the user's preferred price."""
    return np.exp(-((log_price - pref_price_log) ** 2) / (2 * PRICE_SIGMA ** 2))


def _min_max(x: np.ndarray) -> np.ndarray:
    if x.size == 0 or np.isclose(x.min(), x.max()):
        return np.zeros_like(x, dtype=float)
    return (x - x.min()) / (x.max() - x.min())


def generate_dataset(force: bool = False, seed: int = RANDOM_STATE, data_dir: Path | None = None) -> None:
    """Create products, users, and interactions CSVs (dataset v4).

    ``seed`` is used to reseed both the Python and NumPy RNGs, so different
    seeds yield independent realisations (used by results_multiseed.py).
    ``data_dir`` lets callers emit to a scratch directory without touching the
    primary dataset.
    """
    out_dir = Path(data_dir) if data_dir is not None else DATA_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = [out_dir / "products.csv", out_dir / "users.csv", out_dir / "interactions.csv"]
    if not force and all(path.exists() for path in paths):
        return
    random.seed(seed)
    np.random.seed(seed)

    new_arrival_ids = set(np.random.choice([f"P{i:04d}" for i in range(1, N_PRODUCTS + 1)], N_NEW_ARRIVALS, replace=False))
    cold_item_ids = set(np.random.choice(sorted(new_arrival_ids), N_COLD_ITEMS, replace=False))

    products = []
    for i, product_id in enumerate([f"P{i:04d}" for i in range(1, N_PRODUCTS + 1)], start=1):
        category = random.choice(CATEGORIES)
        subcategory = random.choice(CATEGORY_SUBCATEGORIES[category])
        brand = random.choice(BRANDS)
        products.append({
            "product_id": product_id,
            "name": f"{brand} {subcategory} {i}",
            "category": category,
            "subcategory": subcategory,
            "brand": brand,
            "description": f"{subcategory} made for Nepali shoppers with reliable quality and local style.",
            "price_npr": int(np.random.choice(PRICE_CHOICES)),
            "avg_rating": round(float(np.clip(np.random.normal(4.0, 0.55), 2.2, 5.0)), 1),
            "rating_count": int(np.random.randint(0, 420)),
            "tags": f"{category.lower()}, {subcategory.lower()}, nepal, {brand.lower()}, gift",
            "image_url": _placeholder_image(category, subcategory),
            "is_new_arrival": product_id in new_arrival_ids,
            "in_stock": bool(np.random.rand() > 0.08),
            "is_cold_item": product_id in cold_item_ids,
        })
    products_df = pd.DataFrame(products)

    # Pre-computed per-product latent attributes used by the affinity model.
    cat_idx = np.array([CATEGORIES.index(c) for c in products_df["category"]], dtype=int)
    brand_idx = np.array([BRANDS.index(b) for b in products_df["brand"]], dtype=int)
    log_price = np.log(products_df["price_npr"].to_numpy(dtype=float))
    popularity_norm = _min_max(products_df["rating_count"].to_numpy(dtype=float))

    users = []
    user_cat_aff = np.zeros((N_USERS, len(CATEGORIES)))
    user_brand_aff = np.zeros((N_USERS, len(BRANDS)))
    user_price_log = np.zeros(N_USERS)
    for i in range(1, N_USERS + 1):
        preferred = random.sample(CATEGORIES, k=2)
        city = random.choice(CITIES)
        age = int(np.random.randint(18, 58))
        gender = random.choice(["female", "male", "other"])
        user_type = random.choice(["new", "regular", "power"])
        preferred_brand = random.choice(BRANDS)
        if i <= LOW_ACTIVITY_MAX:
            # Active + low-activity cohorts keep the v1 joined-date window.
            joined = (datetime(2023, 1, 1) + timedelta(days=int(np.random.randint(0, 720)))).date()
        else:
            # Cold-start cohort: brand-new accounts created on/after 2025-01-01.
            joined = (SPLIT_DATE + timedelta(days=int(np.random.randint(0, 150)))).date()

        # --- latent preference profile (v4) ---
        cat_aff = np.ones(len(CATEGORIES))
        for c in preferred:
            cat_aff[CATEGORIES.index(c)] *= PREF_CAT_BOOST
        if age < 25:
            cat_aff[CATEGORIES.index("Electronics")] *= AGE_CAT_MULT
            cat_aff[CATEGORIES.index("Fashion & Accessories")] *= AGE_CAT_MULT
        elif age >= 40:
            cat_aff[CATEGORIES.index("Kitchen & Home")] *= AGE_CAT_MULT
            cat_aff[CATEGORIES.index("Daily Groceries")] *= AGE_CAT_MULT
            cat_aff[CATEGORIES.index("Traditional Attire")] *= AGE_CAT_MULT
        if gender == "female":
            cat_aff[CATEGORIES.index("Fashion & Accessories")] *= AGE_CAT_MULT
            cat_aff[CATEGORIES.index("Handicrafts & Art")] *= AGE_CAT_MULT
        elif gender == "male":
            cat_aff[CATEGORIES.index("Electronics")] *= AGE_CAT_MULT

        brand_aff = np.ones(len(BRANDS))
        brand_aff[BRANDS.index(preferred_brand)] *= BRAND_BOOST
        pref_price_log = float(np.log(np.random.choice([550, 899, 1250, 1800, 2500, 4200])))

        user_cat_aff[i - 1] = cat_aff
        user_brand_aff[i - 1] = brand_aff
        user_price_log[i - 1] = pref_price_log

        users.append({
            "user_id": f"U{i:04d}",
            "name": f"Customer {i}",
            "city": city,
            "age": age,
            "gender": gender,
            "user_type": user_type,
            "preferred_categories": "|".join(preferred),
            "joined_date": joined.isoformat(),
            "is_verified": bool(np.random.rand() > 0.18),
        })
    users_df = pd.DataFrame(users)

    # Regular interactions are drawn only from non-new-arrival products, so the
    # new-arrival pool (and therefore every cold item) has zero pre-cutoff history.
    eligible_mask = ~products_df["is_new_arrival"].to_numpy()
    eligible_pos = np.flatnonzero(eligible_mask)
    eligible_ids = products_df["product_id"].to_numpy()[eligible_pos]
    eligible_cat = cat_idx[eligible_pos]
    eligible_brand = brand_idx[eligible_pos]
    eligible_log_price = log_price[eligible_pos]
    eligible_pop = popularity_norm[eligible_pos]

    # Per-user interaction weight vectors over the eligible catalog (v4).
    user_weights = []
    for u in range(N_USERS):
        w = (
            user_cat_aff[u][eligible_cat] ** AFFINITY_EXP
            * user_brand_aff[u][eligible_brand]
            * _price_fit(eligible_log_price, user_price_log[u])
            * (1.0 + POP_WEIGHT * eligible_pop)
        )
        user_weights.append(w / w.sum())

    def sample_product(user_pos: int) -> str:
        idx = np.random.choice(len(eligible_ids), p=user_weights[user_pos])
        return eligible_ids[idx]

    active_ids = [f"U{i:04d}" for i in range(1, ACTIVE_MAX + 1)]
    interactions: list[dict] = []

    # --- Active cohort: ~30,000 rows across U0001-U1200 (affinity-weighted).
    for _ in range(ACTIVE_INTERACTIONS):
        user_pos = int(np.random.randint(0, ACTIVE_MAX))
        user_id = f"U{user_pos + 1:04d}"
        product_id = sample_product(user_pos)
        ts = _ts(np.random.randint(0, WINDOW_DAYS))
        interactions.append(_make_interaction(user_id, product_id, ts))

    # --- Low-activity cohort: U1201-U1350, 1-3 interactions each, whole range.
    for user_pos in range(ACTIVE_MAX, LOW_ACTIVITY_MAX):
        user_id = f"U{user_pos + 1:04d}"
        n = int(np.random.randint(1, 4))  # 1..3
        for _ in range(n):
            product_id = sample_product(user_pos)
            ts = _ts(np.random.randint(0, WINDOW_DAYS))
            interactions.append(_make_interaction(user_id, product_id, ts))

    # --- Cold-start cohort: U1351-U1500, 0-3 interactions each, timestamps
    #     >= 2025-01-15 (all in the test period). Guarantee >= 40 zero-history users.
    cold_user_positions = list(range(LOW_ACTIVITY_MAX, N_USERS))  # 1351..1500
    cold_counts = [int(np.random.randint(1, 4)) for _ in cold_user_positions]  # 1..3
    zero_positions = np.random.choice(len(cold_user_positions), N_ZERO_HISTORY_COLD_USERS, replace=False)
    for pos in zero_positions:
        cold_counts[pos] = 0
    for pos, n in zip(cold_user_positions, cold_counts):
        user_id = f"U{pos + 1:04d}"
        for _ in range(n):
            product_id = sample_product(pos)
            ts = _ts(np.random.randint(COLD_USER_OFFSET, WINDOW_DAYS))
            interactions.append(_make_interaction(user_id, product_id, ts))

    # --- Item cold-start: sparse (0-2) post-cutoff interactions on the 200 cold
    #     items, attributed to active users (affinity-weighted) so there is some
    #     CF signal in the TEST period but none in TRAIN.
    for product_id in sorted(cold_item_ids):
        n = int(np.random.randint(0, 3))  # 0..2
        for _ in range(n):
            user_pos = int(np.random.randint(0, ACTIVE_MAX))
            user_id = f"U{user_pos + 1:04d}"
            ts = _ts(np.random.randint(SPLIT_OFFSET + 1, WINDOW_DAYS))
            interactions.append(_make_interaction(user_id, product_id, ts))

    for i, row in enumerate(interactions, start=1):
        row["interaction_id"] = f"I{i:05d}"

    column_order = [
        "interaction_id", "user_id", "product_id", "interaction_type", "rating",
        "implicit_score", "timestamp", "month", "is_festival_period",
    ]
    interactions_df = pd.DataFrame(interactions)[column_order]

    products_df.to_csv(out_dir / "products.csv", index=False)
    users_df.to_csv(out_dir / "users.csv", index=False)
    interactions_df.to_csv(out_dir / "interactions.csv", index=False)


if __name__ == "__main__":
    generate_dataset(force=True)