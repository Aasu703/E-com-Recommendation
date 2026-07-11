# Results Summary — Clean, Leak-Free Evaluation

Generated 2026-07-10. This directory holds evaluation output produced *after*
fixing the train/test leakage identified in `REPO_AUDIT.md` §5–6
(`notebooks/05_evaluation.ipynb` fit both models on the full interactions
frame, including the held-out test period, before evaluating them on that
same period). Every number below is either quoted verbatim from a file in
this `results/` directory or from the pre-existing, already-clean
`evaluation_suite/evaluation_results.txt`. Nothing here is invented.

All scripts live in `hybrid-model/backend/` and are re-runnable with:
```bash
poetry run python results_eval_clean.py
poetry run python tests/run_advanced_evaluation.py
poetry run python results_ablation_gamma.py
poetry run python results_figures.py
```

---

## 1. Clean time-split evaluation (PRIMARY protocol — recommended)

**Source:** `results/clean_eval_results.txt`, `results/clean_eval_results.csv`
**Script:** `results_eval_clean.py`
**Protocol:** Global time cutoff. `train = interactions[timestamp < 2025-01-01]`
(4,383 rows), `test = interactions[timestamp >= 2025-01-01]` (1,811 rows).
`BaselineRecommender` and `HybridRecommender` are each fit **only on train**,
then evaluated with `recommender.evaluator.Evaluator` against the held-out
test interactions for 299 users, at K ∈ {5, 10, 20}.

| K | Model | Precision | Recall | NDCG | Coverage | Diversity |
|---|---|---|---|---|---|---|
| 5 | Baseline | 0.020 | 0.015 | 0.024 | 0.010 | 0.900 |
| 5 | Hybrid | 0.011 | 0.009 | 0.011 | 0.496 | 0.607 |
| 10 | Baseline | 0.017 | 0.029 | 0.027 | 0.020 | 0.889 |
| 10 | Hybrid | 0.012 | 0.020 | 0.016 | 0.736 | 0.655 |
| 20 | Baseline | 0.016 | 0.056 | 0.038 | 0.040 | 0.858 |
| 20 | Hybrid | 0.014 | 0.046 | 0.028 | 0.916 | 0.688 |

**Honest reading — this is the headline finding of this evaluation pass:**
Once leakage is removed, **Baseline is equal to or slightly ahead of Hybrid
on Precision, Recall, and NDCG at every K**. This directly contradicts the
old (leaky) notebook numbers, which showed Hybrid winning by 2–3× on these
same metrics — that gap was mostly an artifact of the model having already
seen the test interactions during fitting, not real personalization skill.

The one metric where Hybrid decisively and legitimately wins is **Coverage**:
0.736 vs 0.020 at K=10 (Hybrid surfaces 74% of the catalog across users vs.
2% for Baseline, which shows the same static list to everyone). Diversity is
the reverse — Baseline's per-list diversity is higher (0.889 vs 0.655 at
K=10) simply because personalization concentrates each individual user's
list around their own taste, which is expected behavior, not a bug.

### Old (leaky) numbers, for explicit contrast

**Source:** `notebooks/05_evaluation.ipynb` (executed cells), quoted in
`REPO_AUDIT.md` §6 and inside `results_eval_clean.py` as `LEAKY_RESULTS`.

| K | Model | Precision (leaky → clean) | NDCG (leaky → clean) | Coverage (leaky → clean) |
|---|---|---|---|---|
| 10 | Baseline | 0.017 → 0.017 (unchanged) | 0.025 → 0.027 (unchanged) | 0.020 → 0.020 (unchanged) |
| 10 | Hybrid | 0.054 → 0.012 (−78%) | 0.065 → 0.016 (−75%) | 0.894 → 0.736 (−18%) |

Baseline's numbers barely move (it was already effectively evaluated
correctly, since a recency-sorted list fit on the full data vs. train-only
data produces nearly the same ranking). **Hybrid's numbers collapse** once it
can no longer see the test period during fitting — this is the leakage
signature.

---

## 2. Leave-one-out Hit Rate@10 (secondary — already clean)

**Source:** `evaluation_suite/evaluation_results.txt` (pre-existing, not
modified by this pass)
**Script:** `evaluation_suite/compare_models.py`
**Protocol:** Per-user leave-one-out — for each user, sort their interactions
by timestamp, hold out the single chronologically-last interaction, train on
the rest. Evaluated on a 100-user subset for speed. This protocol was
**already leak-free** (each user's train interactions all precede their own
held-out interaction), so it was not re-run.

```
Evaluation Results (Hit Rate @ 10)
Baseline: 0.0200
Hybrid AI: 0.0300
Improvement: +50.0%
```

**Caveat:** at these hit-rate magnitudes, 0.02 vs 0.03 on 100 users is a
difference of roughly **2 hits vs 3 hits** — a single-user swing changes the
"improvement" percentage substantially. Treat the +50% figure as a
weak/noisy signal, not strong evidence, and note it is broadly consistent
with §1's finding that Hybrid and Baseline are close on accuracy metrics once
leakage is fixed — it does not contradict §1.

---

## 3. Advanced evaluation — RQ1 significance, RQ2 latency, RQ3 cold-start

**Source:** `results/advanced_evaluation.txt`
**Script:** `tests/run_advanced_evaluation.py`
**Leakage check:** This script already fit both models on
`train = interactions[timestamp < 2025-01-01]` and evaluated on
`test = interactions[timestamp >= 2025-01-01]` in its original form — **no
leakage found, no fix was needed**. It had simply never been run and its
output never saved before this pass.

### RQ1 — Statistical significance (paired t-test on NDCG@10, 100 users)
| Model | Mean NDCG@10 | Std Dev |
|---|---|---|
| Hybrid | 0.0165 | 0.0501 |
| Baseline | 0.0268 | 0.0625 |

Paired T-Test: **t = -1.2456, p = 0.2158 → not statistically significant.**

This is an important, honest result: the difference between Hybrid and
Baseline on NDCG@10 in this run **cannot be distinguished from noise** at any
conventional significance threshold. Combined with §1, the thesis should not
claim the hybrid model has a proven accuracy advantage over the baseline on
this dataset — it should instead report Coverage as the clear, demonstrated
win and treat ranking-accuracy parity/significance as an honest limitation.

### RQ2 — Latency (cache miss vs. simulated cache hit)
| Scenario | Average Latency (ms) | P95 Latency (ms) |
|---|---|---|
| Cache Miss (full inference) | 153.36 | 169.93 |
| Cache Hit (simulated Redis GET) | 0.50 | 0.50 |

Latency reduction: 99.67%. Note the "cache hit" number is a **simulated**
Redis lookup (a fixed +0.5ms constant added in code, not a live Redis
roundtrip — see `run_rq2_latency()` in `tests/run_advanced_evaluation.py`),
so this is an upper-bound estimate of caching benefit, not a measurement
against a real Redis instance.

### RQ3 — Active vs. cold-start user stratification
| Segment | Precision@10 | Recall@10 | NDCG@10 | Catalog Coverage |
|---|---|---|---|---|
| Active Users (>3 train interactions) | 0.0220 | 0.0471 | 0.0310 | 0.4680 |
| Cold-Start (≤3 train interactions) | **MISSING (NaN)** | **MISSING (NaN)** | **MISSING (NaN)** | 0.0000 |

**MISSING and explained:** The cold-start row is `NaN` because the segment
is **empty** — diagnosed directly in this pass: every one of the 300 users
has **at least 6** train-period interactions (minimum, computed from the same
train split), so **zero users** fall at or below the
`COLD_START_THRESHOLD = 3` cutoff, and zero test users have no train history
either. `evaluate_segment()` then computes `np.mean([])`, which is `NaN`
(visible as a `RuntimeWarning: Mean of empty slice` in the raw script
output). **This is a real limitation of the current synthetic dataset for
this specific experiment, not a bug in the evaluation code**: the generator
(`generate_dataset.py`) doesn't produce genuinely low-activity or brand-new
users as of the 2025-01-01 split point, so RQ3's active-vs-cold-start
comparison currently has no cold-start users to measure. This should be
fixed by adjusting either the threshold or the dataset generator (see
Top Priorities in `REPO_AUDIT.md`) before this figure can be cited as
cold-start evidence.

---

## 4. Gamma (cold-start threshold) ablation

**Source:** `results/gamma_ablation.txt`, `results/gamma_ablation.csv`
**Script:** `results_ablation_gamma.py`
**Change made to support this:** `recommender/hybrid.py`'s
`HybridRecommender.__init__` gained an optional `gamma: int = 3` parameter
that sets `self.COLD_START_THRESHOLD` per-instance; the class-level default
(`COLD_START_THRESHOLD = 3`) is unchanged and `HybridRecommender()` called
with no arguments behaves exactly as before (verified: `tests/unit/test_hybrid.py`
and `tests/test_recommenders.py`, 10/10 tests, still pass unmodified).
**Protocol:** same train-only fit as §1 (train < 2025-01-01); gamma only
affects the α formula inside `recommend()`, not model fitting, so CB/CF are
fit once and `COLD_START_THRESHOLD` is swapped between evaluation passes.

| gamma | Precision@10 | NDCG@10 |
|---|---|---|
| 1 | 0.0137 | 0.0187 |
| 3 (current default) | 0.0124 | 0.0161 |
| 5 | 0.0117 | 0.0133 |
| 10 | 0.0110 | 0.0119 |

**Honest reading:** Precision@10 and NDCG@10 both **decrease monotonically**
as gamma increases — γ=1 is best, γ=3 (the shipped default) is not the
best value found, γ=10 is worst. The effect is real but **small in absolute
terms** (Precision@10 ranges only from 0.0110 to 0.0137 across the whole
sweep — a 0.0027 spread). This does not mean "lower gamma is proven better";
it means that within this dataset and split, the alpha formula's cold-start
constant has at most a marginal effect on ranking accuracy, and γ=3 is a
defensible-but-not-optimal choice. Do not present γ=1 as a tuned/selected
value — it was not selected to win, it is reported alongside the other three
exactly as measured.

---

## 5. Figures

**Source:** `results/figures/*.png`, generated by `results_figures.py` from
`nepali_ecommerce_data/*.csv` (EDA plots) and `results/clean_eval_results.csv`
(comparison plot). These replace the notebook-embedded-only versions in
`notebooks/01_EDA.ipynb` (same underlying aggregations) with standalone PNG
exports, plus one new chart not present anywhere else in the repo:

| File | Content |
|---|---|
| `01_top_products_by_interactions.png` | Top 10 products by interaction count, colored by category |
| `02_interactions_per_user_distribution.png` | Histogram of interactions per user (mean marked) |
| `03_products_by_category.png` | Product count per category (7 categories) |
| `04_festival_vs_nonfestival_interactions.png` | Festival-period vs. non-festival interaction counts |
| `05_new_arrival_vs_established.png` | New-arrival vs. established product counts |
| `hybrid_vs_baseline.png` | **New.** Grouped bar chart, Hybrid vs Baseline, Precision/Recall/NDCG/Coverage @ K=10, using the §1 clean numbers |

---

## Which protocol should the thesis treat as PRIMARY?

**Recommendation: §1, the clean global time-split evaluation
(`results_eval_clean.py` / `clean_eval_results.csv`).**

Reasons:
1. It evaluates the full available test population (299 users), not a
   100-user speed sample.
2. It reports a complete metric suite (Precision/Recall/NDCG/Coverage/
   Diversity at three K values) rather than a single hit/no-hit signal.
3. It matches the time-based train/test split methodology the project's own
   `DATASET.md` and root `README.md` already describe, so adopting it as
   primary keeps the thesis's existing methodology narrative intact — only
   the *numbers* need correcting, not the *description* of the method.
4. It is now leak-free, which the two most detailed alternative results
   (RQ1/RQ3 from `run_advanced_evaluation.py`) already were, so all three are
   mutually consistent in showing the same picture: **Hybrid and Baseline are
   statistically indistinguishable on ranking accuracy on this dataset, and
   Hybrid's one clear, reproducible advantage is catalog coverage.**

Use §2 (leave-one-out Hit Rate) and §3 (RQ1 significance test) as
**secondary/corroborating** evidence — both are clean and both point the same
direction as §1 (small or non-significant accuracy gap). Use §4 (gamma
ablation) to support the methodology section honestly: the adaptive-α formula
is a reasonable design choice, its cold-start constant was not previously
tuned, and a coarse sweep shows the effect is real but small. Report §3's
RQ3 cold-start-segment result as **missing/uninformative** on the current
dataset and flag the dataset-generator limitation explicitly rather than
omitting the RQ3 experiment from the thesis — the empty segment is itself a
finding about the synthetic data, not a result to hide.
