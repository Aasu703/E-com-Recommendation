import sys
from pathlib import Path
import pandas as pd
import numpy as np

# Add backend to path to import recommender modules
sys.path.append(str(Path(__file__).resolve().parent.parent))

from recommender.utils import load_data
from recommender.hybrid import HybridRecommender
from recommender.baseline import BaselineRecommender

def evaluate_hit_rate(recommender, users, held_out_items, top_k=10, is_hybrid=True):
    hits = 0
    total = 0
    
    for user_id in users:
        target_item = held_out_items.get(user_id)
        if not target_item:
            continue
            
        # For hybrid, use Dashain month context
        if is_hybrid:
            recs = recommender.recommend(user_id, top_k=top_k, context={"month": 10, "exclude_interacted": True})
        else:
            recs = recommender.recommend(user_id, top_k=top_k, exclude_out_of_stock=True)
            
        rec_ids = [r["product_id"] for r in recs]
        if target_item in rec_ids:
            hits += 1
        total += 1
        
    return hits / total if total > 0 else 0

def run_evaluation():
    print("Loading data...")
    products_df, users_df, interactions_df = load_data()
    
    # Sort interactions by timestamp to hold out the last interaction for each user
    interactions_df = interactions_df.sort_values(['user_id', 'timestamp'])
    
    print(f"Total interactions: {len(interactions_df)}")
    
    # Hold out last interaction
    held_out = interactions_df.groupby('user_id').tail(1)
    train_interactions = interactions_df.drop(held_out.index)
    
    held_out_dict = dict(zip(held_out['user_id'], held_out['product_id']))
    test_users = list(held_out_dict.keys())[:100] # Test on subset of 100 users for speed
    
    print(f"Training Baseline Model on {len(train_interactions)} interactions...")
    baseline = BaselineRecommender().fit(products_df, train_interactions)
    
    print(f"Training Hybrid Model on {len(train_interactions)} interactions...")
    hybrid = HybridRecommender().fit(products_df, users_df, train_interactions)
    
    print("Evaluating Baseline Hit Rate @ 10...")
    baseline_hr = evaluate_hit_rate(baseline, test_users, held_out_dict, top_k=10, is_hybrid=False)
    
    print("Evaluating Hybrid Hit Rate @ 10...")
    hybrid_hr = evaluate_hit_rate(hybrid, test_users, held_out_dict, top_k=10, is_hybrid=True)
    
    print("-" * 50)
    print("Evaluation Results (Hit Rate @ 10)")
    print("-" * 50)
    print(f"Baseline (Most Recent): {baseline_hr:.4f}")
    print(f"Hybrid AI (Content + Collab + Context): {hybrid_hr:.4f}")
    print("-" * 50)
    
    improvement = ((hybrid_hr - baseline_hr) / max(baseline_hr, 0.0001)) * 100
    print(f"The Hybrid Model did better by: +{improvement:.1f}%")
    
    # Save results to file
    with open('evaluation_results.txt', 'w') as f:
        f.write("Evaluation Results (Hit Rate @ 10)\n")
        f.write(f"Baseline: {baseline_hr:.4f}\n")
        f.write(f"Hybrid AI: {hybrid_hr:.4f}\n")
        f.write(f"Improvement: +{improvement:.1f}%\n")
        
    print("\nResults saved to evaluation_results.txt")

if __name__ == "__main__":
    run_evaluation()
