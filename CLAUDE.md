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

## Current honest findings (as of results/RESULTS_SUMMARY.md)
- After removing leakage, Hybrid ≈ Baseline on Precision/Recall/NDCG (paired t-test p=0.2158, not significant).
- Hybrid's clear, legitimate win is CATALOG COVERAGE (0.736 vs 0.020 @K=10) and per-user personalization; Baseline shows one static list to everyone.
- γ ablation (1/3/5/10): small monotonic effect, γ=1 best, spread only ~0.003 Precision@10.
- RQ3 cold-start segment was EMPTY on dataset v1 (every user has ≥6 train interactions) — this is why dataset v2 with genuine cold users exists / is being built.
- RQ2 latency: cache-hit number was SIMULATED (+0.5ms constant), not a live Redis measurement, unless/until replaced by a real measurement.

## Key file map
- Models: hybrid-model/backend/recommender/{baseline,content_based,collaborative,hybrid}.py
- Hybrid formula: score = α·CF + (1−α)·CB, α = U_c/(U_c+γ), γ default 3; +0.08 freshness boost (is_new_arrival), +0.25 festival boost (months 10–11, fixed category set)
- Evaluator: recommender/evaluator.py (Precision/Recall/NDCG/Coverage/Diversity @K)
- Clean primary eval: results_eval_clean.py → results/clean_eval_results.{csv,txt}
- Significance/latency/cold-start script: tests/run_advanced_evaluation.py → results/advanced_evaluation.txt
- γ ablation: results_ablation_gamma.py → results/gamma_ablation.{csv,txt}
- Figures: results_figures.py → results/figures/*.png
- Dataset generator (seeded): generate_dataset.py → nepali_ecommerce_data/{products,users,interactions}.csv
- Frontend numbers: frontend/components/dashboard/MetricsPanel.tsx and frontend/components/storefront/WhyAIWins.tsx (must never drift from results/)

## Thesis narrative to protect
"A rigorously evaluated hybrid recommender for a data-sparse market: accuracy parity with a strong recency baseline once leakage is removed, a decisive and business-relevant coverage/personalization win, an honest cold-start investigation, and a documented methodological lesson about evaluation leakage." Do not manufacture an accuracy win that the data does not support.
