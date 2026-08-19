# Release Manifest — v2.0-thesis

Dataset v2, leak-free evaluation. Every results artefact below, the script that
produces it, and its headline number. All numbers are traceable to the named
file; the frontend and `thesis_assets/thesis_numbers.json` are generated from
these by `scripts/export_metrics.py`. Full narrative: `results/RESULTS_SUMMARY.md`.

| Results file | Producing script | Headline number(s) |
|---|---|---|
| `clean_eval_results.{csv,txt}` | `results_eval_clean.py` | Primary split (271 users): Hybrid P@10 0.012 / Cov@10 **0.724**; Baseline P@10 0.014 / Cov@10 0.020 |
| `components_eval.{csv,txt}` | `results_eval_components.py` | CF-only leads accuracy (P@10 0.016); CB-only Cov@10 0.842; Hybrid P@10 0.012 / Cov@10 0.724 |
| `gamma_ablation.{csv,txt}` | `results_ablation_gamma.py` | γ=1 best (NDCG@10 0.0156); spread only ~0.003 across γ∈{1,3,5,10} |
| `alpha_strategy_ablation.{csv,txt}` | `results_ablation_alpha.py` | Fixed α=1.0 (pure CF) best P@10 0.0144; freshness-off (0.0129) > both-on (0.0118); festival boost inert on test window |
| `eval_80_20.{csv,txt}` | `results_eval_80_20.py` | 80/20 cutoff 2025-02-23 (79.9/20.1); Hybrid Cov@10 0.722, CF P@10 0.0126, Hybrid P@10 0.0088 |
| `significance_tests.{csv,txt}` | `results_significance.py` | Hybrid vs Baseline P@10 p=0.65 (ns); Hybrid vs CF **significantly worse** (P@10 p=0.025, NDCG p=0.0096) |
| `advanced_evaluation.txt` | `tests/run_advanced_evaluation.py` | RQ1 NDCG@10 p=0.4352 (ns); RQ3 zero-history 24 users (0 accuracy, 100% new-arrival pathway); RQ2 cache-hit SIMULATED (see latency_live) |
| `cold_items.{csv,txt}` | `results_cold_items.py` | Hybrid surfaces **37/40** cold items (0.925); Baseline & Popularity **0/40** |
| `latency_live.{csv,txt}` | `results_latency.py` | Live Redis: cache-miss mean 186.32 ms / cache-hit mean **1.90 ms** (200+200 requests) |
| `figures/*.png` | `results_figures.py` | 6 figures (5 EDA + hybrid-vs-baseline @K=10) |
| `../evaluation_suite/evaluation_results.txt` | `evaluation_suite/compare_models.py` | Leave-one-out HR@10: Baseline 0.040, Hybrid 0.020 (noisy secondary) |
| `../thesis_assets/thesis_numbers.json`, `../../frontend/lib/metrics.generated.ts` | `scripts/export_metrics.py` | Single source of truth for all UI/thesis numbers |

**One-line thesis story:** once train/test leakage is removed, the Hybrid is
statistically on par with the recency baseline on ranking accuracy (and the
collaborative component alone is the accuracy leader); the Hybrid's clear,
reproducible wins are catalog coverage/personalization (0.724 vs 0.020 @K=10)
and cold-start item reach (37/40 vs 0/40). The leakage lesson and the
empty→populated cold-start segment are themselves documented findings.
