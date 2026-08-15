# CLAUDE.md — Project ground truth (read before doing anything)

## What this repo is
Final-year BSc thesis project (Softwarica College / Coventry University): "Design and Experimental Evaluation of a Hybrid AI-Based Personalized Recommendation System for Nepali E-Commerce Platforms." The active project is `hybrid-model/` (backend: FastAPI + Python 3.11 + Poetry; frontend: Next.js "NepKart"). `baseline-model/` is a superseded earlier iteration — do not develop in it.

## Non-negotiable rules
1. NEVER invent, round differently, or "improve" an experimental number. Every metric cited anywhere (code comments, README, frontend, thesis) must be traceable to a file under `hybrid-model/backend/results/` or `evaluation_suite/`.
2. The evaluation protocol is a leak-free temporal split: models are fit ONLY on interactions before the cutoff and evaluated on interactions at/after it. Never fit on the full dataset before evaluating (this bug was found and fixed — see REPO_AUDIT.md §5–6 and results/RESULTS_SUMMARY.md).
3. All randomness must be seeded (seed=42 everywhere: python random, numpy, and svds).
4. After ANY change to `generate_dataset.py`, the dataset version must be bumped in DATASET.md, ALL result scripts re-run, and ALL downstream consumers of numbers updated (results/, README.md, frontend/lib metrics, thesis_assets/).
5. Run `poetry run pytest` (from hybrid-model/backend) before declaring any work package done; all tests must pass.
6. UK English in all documentation.

## Current honest findings (as of results/RESULTS_SUMMARY.md, dataset v3)
- After removing leakage, Hybrid ≈ Baseline on Precision/Recall/NDCG (paired t-test p=0.4929 on Precision@10, p=0.2967 on NDCG@10 — both not significant; §6).
- Hybrid's clear, legitimate win is CATALOG COVERAGE (0.3376 vs 0.0040 @K=10) and per-user personalization; Baseline shows one static list to everyone (§1).
- γ ablation (1/3/5/10): Precision@10 highest at γ=1 (0.0017), γ=3 shipped default is 0.0012 — a ~2x relative spread at v3 scale (0.0008–0.0017), γ=3 is defensible but not optimal (§4).
- RQ3 cold-start segment is now POPULATED (dataset v3: 127 zero-history / 60 low-activity / 1,199 active users). Zero-history and low-activity users score Precision@10 = 0.0000 — their top-10 is 100% new-arrival items from the freshness boost, an honest unresolved cold-start weakness (§7).
- RQ2 latency: cache-hit is now a LIVE Redis measurement (mean 1.46ms, P95 1.73ms vs cache-miss mean 9.04ms, P95 10.03ms — 83.81% reduction), superseding the earlier simulated constant (§8).

## Key file map
- Models: hybrid-model/backend/recommender/{baseline,content_based,collaborative,hybrid}.py
- Hybrid formula: score = α·CF + (1−α)·CB, α = U_c/(U_c+γ), γ default 3; +0.08 freshness boost (is_new_arrival), +0.25 festival boost (months 10–11, fixed category set)
- Evaluator: recommender/evaluator.py (Precision/Recall/NDCG/Coverage/Diversity @K)
- Clean primary eval: results_eval_clean.py → results/clean_eval_results.{csv,txt}
- Significance/latency/cold-start script: tests/run_advanced_evaluation.py → results/advanced_evaluation.txt
- γ ablation: results_ablation_gamma.py → results/gamma_ablation.{csv,txt}
- Cold-user fallback experiment (opt-in via `HybridRecommender(cold_user_fallback=True)`, shipped default is off): results_cold_user_fallback.py → results/cold_user_fallback.{csv,txt}
- Figures: results_figures.py → results/figures/*.png
- Dataset generator (seeded): generate_dataset.py → nepali_ecommerce_data/{products,users,interactions}.csv
- Frontend numbers: frontend/components/dashboard/MetricsPanel.tsx and frontend/components/storefront/WhyAIWins.tsx (must never drift from results/)

## Thesis narrative to protect
"A rigorously evaluated hybrid recommender for a data-sparse market: accuracy parity with a strong recency baseline once leakage is removed, a decisive and business-relevant coverage/personalization win, an honest cold-start investigation, and a documented methodological lesson about evaluation leakage." Do not manufacture an accuracy win that the data does not support.
