"""
Advanced Academic Evaluation Suite for Nepali Recommendation System.
Addresses RQ1 (Accuracy), RQ2 (Latency), and RQ3 (Cold-Start).
"""

import time
import logging
import numpy as np
import pandas as pd
from scipy import stats
from pathlib import Path
from recommender.hybrid import HybridRecommender
from recommender.baseline import BaselineRecommender
from recommender.evaluator import Evaluator

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

DATA_DIR = Path("nepali_ecommerce_data")
K = 10
COLD_START_THRESHOLD = 3

def load_data():
    products_df = pd.read_csv(DATA_DIR / "products.csv")
    users_df = pd.read_csv(DATA_DIR / "users.csv")
    interactions_df = pd.read_csv(DATA_DIR / "interactions.csv")
    interactions_df["timestamp"] = pd.to_datetime(interactions_df["timestamp"])
    return products_df, users_df, interactions_df

def run_rq1_significance(hybrid, baseline, test_interactions, products_df):
    """RQ1: Statistical Significance (Hybrid vs Baseline)"""
    logger.info("Running RQ1: Statistical Significance Test...")
    
    users = test_interactions["user_id"].unique()[:100] # Sample for speed
    hybrid_scores = []
    baseline_scores = []
    
    for user_id in users:
        actual = set(test_interactions[test_interactions["user_id"] == user_id]["product_id"])
        if not actual: continue
        
        # Hybrid NDCG
        h_recs = [r["product_id"] for r in hybrid.recommend(user_id, top_k=K)]
        h_hits = [1 if pid in actual else 0 for pid in h_recs]
        h_dcg = sum(hit / np.log2(idx + 2) for idx, hit in enumerate(h_hits))
        h_idcg = sum(1 / np.log2(idx + 2) for idx in range(min(len(actual), K)))
        hybrid_scores.append(h_dcg / h_idcg if h_idcg > 0 else 0)
        
        # Baseline NDCG
        b_recs = [r["product_id"] for r in baseline.recommend(user_id, top_k=K)]
        b_hits = [1 if pid in actual else 0 for pid in b_recs]
        b_dcg = sum(hit / np.log2(idx + 2) for idx, hit in enumerate(b_hits))
        b_idcg = sum(1 / np.log2(idx + 2) for idx in range(min(len(actual), K)))
        baseline_scores.append(b_dcg / b_idcg if b_idcg > 0 else 0)

    t_stat, p_val = stats.ttest_rel(hybrid_scores, baseline_scores)
    
    print("\n### RQ1: Statistical Significance (NDCG@10)")
    print(f"| Model | Mean NDCG@{K} | Std Dev |")
    print(f"|-------|--------------|---------|")
    print(f"| Hybrid | {np.mean(hybrid_scores):.4f} | {np.std(hybrid_scores):.4f} |")
    print(f"| Baseline | {np.mean(baseline_scores):.4f} | {np.std(baseline_scores):.4f} |")
    print(f"\nPaired T-Test: t={t_stat:.4f}, p={p_val:.4f}")
    if p_val < 0.05:
        print("Result: Statistically Significant improvement (p < 0.05)")
    else:
        print("Result: Not Statistically Significant")

def run_rq2_latency(hybrid, user_id):
    """RQ2: Infrastructure & Latency Profiling"""
    logger.info("Running RQ2: Latency Profiling...")
    
    # Cache Miss (Full Inference)
    miss_times = []
    for _ in range(50):
        start = time.perf_counter()
        hybrid.recommend(user_id, top_k=K)
        miss_times.append((time.perf_counter() - start) * 1000)
    
    # Simulated Cache Hit (Redis-like lookup)
    # We simulate a Redis GET which typically takes < 1ms
    hit_times = []
    dummy_data = hybrid.recommend(user_id, top_k=K)
    for _ in range(50):
        start = time.perf_counter()
        _ = dummy_data # Simulated lookup
        hit_times.append((time.perf_counter() - start) * 1000 + 0.5) # Adding 0.5ms network overhead
        
    mean_miss = np.mean(miss_times)
    mean_hit = np.mean(hit_times)
    reduction = ((mean_miss - mean_hit) / mean_miss) * 100
    
    print("\n### RQ2: Infrastructure Latency Profiling")
    print(f"| Scenario | Average Latency (ms) | P95 Latency (ms) |")
    print(f"|----------|----------------------|------------------|")
    print(f"| Cache Miss (Inference) | {mean_miss:.2f} | {np.percentile(miss_times, 95):.2f} |")
    print(f"| Cache Hit (SIMULATED +0.5ms) | {mean_hit:.2f} | {np.percentile(hit_times, 95):.2f} |")
    print(f"\nLatency Reduction: {reduction:.2f}% (using the SIMULATED cache-hit figure).")
    print("NOTE: the cache-hit row above is a SIMULATED upper-bound (a fixed +0.5 ms")
    print("constant), NOT a live Redis measurement. The authoritative LIVE measurement")
    print("against a running Redis instance is in results/latency_live.txt, produced by")
    print("results_latency.py (200 cold + 200 warm requests to the live API).")

def run_rq3_stratification(hybrid, train_df, test_df, products_df):
    """RQ3: User stratification across three activity segments.

    Segments are defined by each user's TRAIN-period interaction count:
      * Zero-history (0 train interactions) -- the true cold-start segment;
      * Low-activity (1-3 train interactions);
      * Active (>3 train interactions).
    Only test users (>=1 held-out interaction) are evaluable. Dataset v2
    guarantees a non-empty zero-history segment (see DATASET.md v2 changelog).
    """
    logger.info("Running RQ3: User Stratification (three segments)...")

    train_counts = train_df["user_id"].value_counts().to_dict()
    test_users = list(test_df["user_id"].unique())

    def train_count(u):
        return train_counts.get(u, 0)

    zero_users = [u for u in test_users if train_count(u) == 0]
    low_users = [u for u in test_users if 1 <= train_count(u) <= COLD_START_THRESHOLD]
    active_users = [u for u in test_users if train_count(u) > COLD_START_THRESHOLD]

    # Popularity fallback list and new-arrival set, to characterise what the
    # system actually serves to zero-history users.
    fallback_ids = [item["product_id"] for item in hybrid.cf.popularity_fallback[:K]]
    new_arrival_ids = set(products_df.loc[products_df["is_new_arrival"].astype(bool), "product_id"])

    def evaluate_segment(user_list):
        precision, recall, ndcg = [], [], []
        covered = set()
        for user_id in user_list:
            actual = set(test_df[test_df["user_id"] == user_id]["product_id"])
            recs = hybrid.recommend(user_id, top_k=K)
            rec_ids = [r["product_id"] for r in recs]
            covered.update(rec_ids)
            hits = [1 if pid in actual else 0 for pid in rec_ids]
            precision.append(sum(hits) / K)
            recall.append(sum(hits) / max(len(actual), 1))
            dcg = sum(hit / np.log2(idx + 2) for idx, hit in enumerate(hits))
            idcg = sum(1 / np.log2(idx + 2) for idx in range(min(len(actual), K)))
            ndcg.append(dcg / idcg if idcg > 0 else 0)
        if not user_list:
            return None
        return {
            "precision": np.mean(precision),
            "recall": np.mean(recall),
            "ndcg": np.mean(ndcg),
            "coverage": len(covered) / len(products_df),
            "n": len(user_list),
        }

    segments = [
        ("Zero-history (0 train)", zero_users),
        ("Low-activity (1-3 train)", low_users),
        ("Active (>3 train)", active_users),
    ]

    print("\n### RQ3: User Stratification Performance (three segments)")
    print(f"| Segment | Users | Precision@{K} | Recall@{K} | NDCG@{K} | Catalog Coverage |")
    print(f"|---------|-------|--------------|-----------|----------|------------------|")
    for name, users in segments:
        m = evaluate_segment(users)
        if m is None:
            print(f"| {name} | 0 | N/A | N/A | N/A | N/A |")
        else:
            print(f"| {name} | {m['n']} | {m['precision']:.4f} | {m['recall']:.4f} | {m['ndcg']:.4f} | {m['coverage']:.4f} |")

    # Cold-start pathway: what does the system ACTUALLY serve to zero-history users?
    if zero_users:
        new_arrival_frac, pop_overlap = [], []
        for user_id in zero_users:
            rec_ids = [r["product_id"] for r in hybrid.recommend(user_id, top_k=K)]
            if rec_ids:
                new_arrival_frac.append(len([p for p in rec_ids if p in new_arrival_ids]) / len(rec_ids))
                pop_overlap.append(len(set(rec_ids) & set(fallback_ids)) / K)
        print(f"\nCold-start pathway (zero-history segment, {len(zero_users)} users):")
        print("A zero-history user has no CF factors and no content seed, so alpha = 0")
        print("(fully content-based weighting) but content similarity is uniformly zero.")
        print("The served ranking is therefore driven by the +0.08 freshness boost, i.e.")
        print("these users are shown NEW-ARRIVAL products (a discovery-oriented cold-start")
        print("pathway). The popularity fallback populates the CF vector but is nullified")
        print("because alpha = 0 for a user with no interactions.")
        print(f"  Mean fraction of served top-{K} that are new arrivals: {np.mean(new_arrival_frac):.1%}")
        print(f"  Mean overlap of served top-{K} with the popularity fallback list: {np.mean(pop_overlap):.1%}")

def main():
    products_df, users_df, interactions_df = load_data()
    
    # Time-based split for evaluation
    split_date = pd.Timestamp("2025-01-01")
    train_df = interactions_df[interactions_df["timestamp"] < split_date]
    test_df = interactions_df[interactions_df["timestamp"] >= split_date]
    
    logger.info("Fitting models...")
    hybrid = HybridRecommender().fit(products_df, users_df, train_df)
    baseline = BaselineRecommender().fit(products_df, train_df)
    
    print("\n" + "="*50)
    print("ADVANCED EVALUATION REPORT")
    print("="*50)
    
    run_rq1_significance(hybrid, baseline, test_df, products_df)
    run_rq2_latency(hybrid, users_df.iloc[0]["user_id"])
    run_rq3_stratification(hybrid, train_df, test_df, products_df)

if __name__ == "__main__":
    main()
