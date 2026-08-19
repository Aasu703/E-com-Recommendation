"""Post-generation verification for dataset v4 (run from hybrid-model/backend).

Checks: determinism, cross-seed difference, shapes, cohort guarantees, and that
the planted latent preference signal is actually present and recoverable.
"""

import hashlib
import tempfile
from pathlib import Path

import pandas as pd

from generate_dataset import generate_dataset

DATA_DIR = Path(__file__).parent / "nepali_ecommerce_data"


def md5(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def verify_shape_and_cohorts(products, users, interactions, out):
    out.append("== shapes ==")
    out.append(f"products {products.shape[0]} x {products.shape[1]}")
    out.append(f"users {users.shape[0]} x {users.shape[1]}")
    out.append(f"interactions {interactions.shape[0]} x {interactions.shape[1]}")
    out.append(f"interactions columns: {list(interactions.columns)}")

    interactions["timestamp"] = pd.to_datetime(interactions["timestamp"])
    cutoff = pd.Timestamp("2025-01-01")
    train = interactions[interactions["timestamp"] < cutoff]
    test = interactions[interactions["timestamp"] >= cutoff]

    out.append("== split ==")
    out.append(f"train rows {len(train)} / test rows {len(test)}")
    out.append(f"test month range: {test['month'].min()}..{test['month'].max()}")
    out.append(f"festival (month 10-11) test rows: {(test['month'].isin([10,11])).sum()}")

    # Cohort guarantees.
    cold_users = [f"U{i:04d}" for i in range(1351, 1501)]
    train_counts = train["user_id"].value_counts().to_dict()
    zero_train_cold = [u for u in cold_users if train_counts.get(u, 0) == 0]
    out.append(f"cold-start cohort users with ZERO train history: {len(zero_train_cold)}/150")

    all_counts = interactions["user_id"].value_counts().to_dict()
    zero_all_cold = [u for u in cold_users if all_counts.get(u, 0) == 0]
    out.append(f"cold-start cohort users with zero interactions at all: {len(zero_all_cold)} (want >= 40)")

    cold_items = set(products.loc[products["is_cold_item"].astype(bool), "product_id"])
    pre = train[train["product_id"].isin(cold_items)]
    post = test[test["product_id"].isin(cold_items)]
    out.append(f"cold-item interactions pre-cutoff: {len(pre)} (want 0), post-cutoff: {len(post)}")

    new_arrivals = set(products.loc[products["is_new_arrival"].astype(bool), "product_id"])
    pre_new = train[train["product_id"].isin(new_arrivals)]
    out.append(f"new-arrival interactions pre-cutoff: {len(pre_new)} (want 0)")


def verify_signal(products, users, interactions, out):
    """Check the planted structure: users should interact disproportionately
    with their preferred categories."""
    interactions["timestamp"] = pd.to_datetime(interactions["timestamp"])
    merged = interactions.merge(
        products[["product_id", "category"]], on="product_id", how="left"
    )
    pref_by_user = {
        r["user_id"]: set(str(r["preferred_categories"]).split("|"))
        for _, r in users.iterrows()
    }
    rows = []
    for u, g in merged.groupby("user_id"):
        pref = pref_by_user.get(u, set())
        if not pref or len(g) < 5:
            continue
        frac = g["category"].isin(pref).mean()
        rows.append(frac)
    out.append("== planted-signal check ==")
    out.append(f"users with >=5 interactions: {len(rows)}")
    out.append(f"mean fraction of a user's interactions in their preferred categories: {pd.Series(rows).mean():.3f}")
    out.append("(random baseline would be ~2/7 = 0.286; affinity model should be well above)")


def main() -> None:
    out = []
    out.append("=== regenerating primary dataset (seed 42) ===")
    generate_dataset(force=True, seed=42, data_dir=DATA_DIR)
    products = pd.read_csv(DATA_DIR / "products.csv")
    users = pd.read_csv(DATA_DIR / "users.csv")
    interactions = pd.read_csv(DATA_DIR / "interactions.csv")
    verify_shape_and_cohorts(products, users, interactions, out)
    verify_signal(products, users, interactions, out)

    out.append("=== determinism / cross-seed ===")
    d1 = Path(tempfile.mkdtemp())
    d2 = Path(tempfile.mkdtemp())
    generate_dataset(force=True, seed=42, data_dir=d1)
    generate_dataset(force=True, seed=42, data_dir=d2)
    for name in ["products.csv", "users.csv", "interactions.csv"]:
        out.append(f"{name} deterministic (same seed): {md5(d1/name) == md5(d2/name)}")
    generate_dataset(force=True, seed=7, data_dir=d2)
    for name in ["products.csv", "users.csv", "interactions.csv"]:
        out.append(f"{name} differs across seeds: {md5(d1/name) != md5(d2/name)}")

    Path("verify_gen.txt").write_text("\n".join(out), encoding="utf-8")
    print("\n".join(out))


if __name__ == "__main__":
    main()