"""Statistical significance testing on the 80/20 temporal split.

For each of Hybrid vs Baseline, Hybrid vs Content-based-only and Hybrid vs
Collaborative-only, we compute per-user Precision@10 and NDCG@10 on the held-out
test set (80th-percentile timestamp cutoff, models fit on train only) and report:
  * a paired t-test,
  * a Wilcoxon signed-rank test,
  * a 1,000-resample bootstrap 95% CI of the mean difference (Hybrid - other),
    seed=42.

Whatever the data says is reported: non-significant differences are labelled
non-significant. A positive mean difference favours Hybrid.

Outputs:
  results/significance_tests.csv
  results/significance_tests.txt
"""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

from recommender.baseline import BaselineRecommender
from recommender.hybrid import HybridRecommender
from recommender.standalone import CollaborativeOnlyRecommender, ContentOnlyRecommender
from recommender.utils import load_data

RESULTS_DIR = Path(__file__).parent / "results"
K = 10
SEED = 42
N_BOOTSTRAP = 1000


def per_user_metrics(model, users: list[str], test_df: pd.DataFrame, k: int = K):
    """Return (precision_vec, ndcg_vec) aligned to `users`."""
    precision, ndcg = [], []
    uses_context = hasattr(model, "cb")
    actual_by_user = {u: set(g["product_id"]) for u, g in test_df.groupby("user_id")}
    for user_id in users:
        actual = actual_by_user.get(user_id, set())
        if uses_context:
            recs = model.recommend(user_id, top_k=k, context={"exclude_interacted": False})
        else:
            recs = model.recommend(user_id, top_k=k)
        rec_ids = [r["product_id"] for r in recs]
        hits = [1 if pid in actual else 0 for pid in rec_ids]
        precision.append(sum(hits) / k)
        dcg = sum(hit / np.log2(idx + 2) for idx, hit in enumerate(hits))
        ideal = sum(1 / np.log2(idx + 2) for idx in range(min(len(actual), k)))
        ndcg.append(dcg / ideal if ideal else 0.0)
    return np.array(precision), np.array(ndcg)


def bootstrap_ci(diffs: np.ndarray, rng: np.random.Generator, n: int = N_BOOTSTRAP):
    if len(diffs) == 0:
        return float("nan"), float("nan")
    idx = rng.integers(0, len(diffs), size=(n, len(diffs)))
    means = diffs[idx].mean(axis=1)
    return float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))


def compare(hybrid_vec: np.ndarray, other_vec: np.ndarray, rng: np.random.Generator) -> dict:
    diffs = hybrid_vec - other_vec
    mean_diff = float(diffs.mean())
    # Paired t-test.
    if np.allclose(diffs, 0):
        t_stat, p_t = float("nan"), float("nan")
    else:
        t_stat, p_t = stats.ttest_rel(hybrid_vec, other_vec)
    # Wilcoxon signed-rank (undefined when all differences are zero).
    try:
        w_stat, p_w = stats.wilcoxon(hybrid_vec, other_vec)
    except ValueError:
        w_stat, p_w = float("nan"), float("nan")
    ci_low, ci_high = bootstrap_ci(diffs, rng)
    return {
        "mean_hybrid": float(hybrid_vec.mean()),
        "mean_other": float(other_vec.mean()),
        "mean_diff": mean_diff,
        "t_stat": float(t_stat),
        "p_ttest": float(p_t),
        "w_stat": float(w_stat),
        "p_wilcoxon": float(p_w),
        "ci95_low": ci_low,
        "ci95_high": ci_high,
    }


def significant(p: float) -> str:
    if np.isnan(p):
        return "undefined (no differences)"
    return "SIGNIFICANT (p<0.05)" if p < 0.05 else "not significant"


def main() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    products_df, users_df, interactions_df = load_data()
    interactions_df = interactions_df.copy()
    interactions_df["timestamp"] = pd.to_datetime(interactions_df["timestamp"])

    cutoff = interactions_df["timestamp"].quantile(0.8)
    train_df = interactions_df[interactions_df["timestamp"] < cutoff].copy()
    test_df = interactions_df[interactions_df["timestamp"] >= cutoff].copy()
    users = sorted(u for u, g in test_df.groupby("user_id") if len(g) >= 1)

    lines: list[str] = []

    def emit(text: str = "") -> None:
        print(text)
        lines.append(text)

    emit("=" * 78)
    emit("STATISTICAL SIGNIFICANCE — 80/20 split, per-user Precision@10 & NDCG@10")
    emit("=" * 78)
    emit(f"80/20 cutoff: {cutoff} | Train {len(train_df):,} / Test {len(test_df):,} rows")
    emit(f"Test users compared (paired): {len(users)} | Bootstrap resamples: {N_BOOTSTRAP} | seed={SEED}")
    emit("A positive mean difference favours Hybrid.")
    emit()

    hybrid = HybridRecommender().fit(products_df, users_df, train_df)
    baseline = BaselineRecommender().fit(products_df, train_df)
    cb = ContentOnlyRecommender().fit(products_df, train_df)
    cf = CollaborativeOnlyRecommender().fit(products_df, train_df)

    h_prec, h_ndcg = per_user_metrics(hybrid, users, test_df)
    metric_vecs = {
        "Baseline": per_user_metrics(baseline, users, test_df),
        "ContentBased": per_user_metrics(cb, users, test_df),
        "Collaborative": per_user_metrics(cf, users, test_df),
    }

    rng = np.random.default_rng(SEED)
    rows: list[dict] = []
    for other_name, (o_prec, o_ndcg) in metric_vecs.items():
        for metric_name, h_vec, o_vec in [
            ("Precision@10", h_prec, o_prec),
            ("NDCG@10", h_ndcg, o_ndcg),
        ]:
            r = compare(h_vec, o_vec, rng)
            emit(f"Hybrid vs {other_name} — {metric_name}")
            emit(f"  mean Hybrid={r['mean_hybrid']:.4f} | mean {other_name}={r['mean_other']:.4f} | "
                 f"mean diff={r['mean_diff']:+.4f}")
            emit(f"  paired t-test:      t={r['t_stat']:.4f}, p={r['p_ttest']:.4f} -> {significant(r['p_ttest'])}")
            emit(f"  Wilcoxon:           W={r['w_stat']:.4f}, p={r['p_wilcoxon']:.4f} -> {significant(r['p_wilcoxon'])}")
            emit(f"  bootstrap 95% CI of mean diff: [{r['ci95_low']:+.4f}, {r['ci95_high']:+.4f}]")
            emit()
            rows.append({"comparison": f"Hybrid vs {other_name}", "metric": metric_name, **r})

    txt_path = RESULTS_DIR / "significance_tests.txt"
    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    csv_path = RESULTS_DIR / "significance_tests.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "comparison", "metric", "mean_hybrid", "mean_other", "mean_diff",
            "t_stat", "p_ttest", "w_stat", "p_wilcoxon", "ci95_low", "ci95_high",
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {txt_path}")
    print(f"Wrote {csv_path}")


if __name__ == "__main__":
    main()
