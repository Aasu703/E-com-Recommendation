"""Item-side cold-start experiment on the clean leak-free split.

The 40 products flagged ``is_cold_item`` in products.csv have zero interactions
before the 2025-01-01 cutoff, so the collaborative filter has no signal for
them: they can only surface through the content-based component and the
freshness boost. Over every test user's top-10 list we measure:

  (a) cold-item coverage -- the fraction of the 40 cold items that appear in at
      least one user's top-10 list;
  (b) mean cold items per list -- the average number of cold items served per
      user.

For the Hybrid model we report both with the freshness boost ON and OFF; the
Baseline (recency) and Popularity models are reported for contrast.

Outputs:
  results/cold_items.csv
  results/cold_items.txt
"""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
import pandas as pd

from recommender.baseline import BaselineRecommender
from recommender.hybrid import HybridRecommender
from recommender.popularity import PopularityRecommender
from recommender.utils import load_data

RESULTS_DIR = Path(__file__).parent / "results"
SPLIT_DATE = pd.Timestamp("2025-01-01")
K = 10


def measure(model, users, cold_ids, uses_context=False):
    """Return (cold_item_coverage, mean_cold_items_per_list)."""
    appeared: set[str] = set()
    per_list_counts = []
    for user_id in users:
        if uses_context:
            recs = model.recommend(user_id, top_k=K, context={"exclude_interacted": False})
        else:
            recs = model.recommend(user_id, top_k=K)
        rec_ids = [r["product_id"] for r in recs]
        cold_in_list = [pid for pid in rec_ids if pid in cold_ids]
        appeared.update(cold_in_list)
        per_list_counts.append(len(cold_in_list))
    coverage = len(appeared) / len(cold_ids) if cold_ids else 0.0
    return coverage, float(np.mean(per_list_counts) if per_list_counts else 0.0)


def main() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    products_df, users_df, interactions_df = load_data()
    interactions_df = interactions_df.copy()
    interactions_df["timestamp"] = pd.to_datetime(interactions_df["timestamp"])
    train_df = interactions_df[interactions_df["timestamp"] < SPLIT_DATE].copy()
    test_df = interactions_df[interactions_df["timestamp"] >= SPLIT_DATE].copy()

    cold_ids = set(products_df.loc[products_df["is_cold_item"].astype(bool), "product_id"])
    test_users = sorted(test_df["user_id"].unique())

    hybrid = HybridRecommender().fit(products_df, users_df, train_df)
    baseline = BaselineRecommender().fit(products_df, train_df)
    popularity = PopularityRecommender().fit(products_df, train_df)

    rows: list[dict] = []

    hybrid.freshness_boost = True
    cov_on, mean_on = measure(hybrid, test_users, cold_ids, uses_context=True)
    hybrid.freshness_boost = False
    cov_off, mean_off = measure(hybrid, test_users, cold_ids, uses_context=True)
    hybrid.freshness_boost = True  # restore

    cov_base, mean_base = measure(baseline, test_users, cold_ids)
    cov_pop, mean_pop = measure(popularity, test_users, cold_ids)

    rows.append({"model": "Hybrid", "freshness_boost": True, "cold_item_coverage": cov_on, "mean_cold_items_per_list": mean_on})
    rows.append({"model": "Hybrid", "freshness_boost": False, "cold_item_coverage": cov_off, "mean_cold_items_per_list": mean_off})
    rows.append({"model": "Baseline", "freshness_boost": "n/a", "cold_item_coverage": cov_base, "mean_cold_items_per_list": mean_base})
    rows.append({"model": "Popularity", "freshness_boost": "n/a", "cold_item_coverage": cov_pop, "mean_cold_items_per_list": mean_pop})

    lines: list[str] = []

    def emit(text: str = "") -> None:
        print(text)
        lines.append(text)

    emit("=" * 74)
    emit("ITEM-SIDE COLD-START experiment (clean split, top-10 lists)")
    emit("=" * 74)
    emit(f"Split date: {SPLIT_DATE.date()} | Cold items (is_cold_item): {len(cold_ids)}")
    emit(f"Test users evaluated: {len(test_users)}")
    emit("Cold items have zero pre-cutoff interactions -> no collaborative signal;")
    emit("they can surface only via content similarity and the freshness boost.")
    emit()
    emit("Model                         | Cold-item coverage | Mean cold items / list")
    emit("------------------------------|--------------------|-----------------------")
    emit(f"Hybrid (freshness ON)         | {cov_on:.3f} ({int(round(cov_on*len(cold_ids)))}/{len(cold_ids)})      | {mean_on:.3f}")
    emit(f"Hybrid (freshness OFF)        | {cov_off:.3f} ({int(round(cov_off*len(cold_ids)))}/{len(cold_ids)})      | {mean_off:.3f}")
    emit(f"Baseline (recency)            | {cov_base:.3f} ({int(round(cov_base*len(cold_ids)))}/{len(cold_ids)})      | {mean_base:.3f}")
    emit(f"Popularity                    | {cov_pop:.3f} ({int(round(cov_pop*len(cold_ids)))}/{len(cold_ids)})      | {mean_pop:.3f}")
    emit()
    emit(f"Freshness boost effect on cold-item coverage: {cov_on - cov_off:+.3f} "
         f"({cov_on:.3f} on vs {cov_off:.3f} off).")

    txt_path = RESULTS_DIR / "cold_items.txt"
    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    csv_path = RESULTS_DIR / "cold_items.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["model", "freshness_boost", "cold_item_coverage", "mean_cold_items_per_list"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {txt_path}")
    print(f"Wrote {csv_path}")


if __name__ == "__main__":
    main()
