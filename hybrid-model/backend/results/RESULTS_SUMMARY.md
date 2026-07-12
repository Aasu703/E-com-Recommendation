# Results Summary — Leak-Free Evaluation (Dataset v2 edition)

Regenerated 2026-07-12 on **dataset v2** (see `DATASET.md` "Dataset v2
changelog"). This directory holds the evaluation output produced *after* fixing
the train/test leakage identified in `REPO_AUDIT.md` §5–6, and after rebuilding
the dataset with genuine cold-start cohorts so that RQ3 can actually be measured.
Every number below is quoted verbatim from a file in this `results/` directory
(or `evaluation_suite/evaluation_results.txt`). Nothing here is invented; the
frontend and `thesis_assets/thesis_numbers.json` are generated from these same
files by `scripts/export_metrics.py`.

Protocol (unless noted): models are fit **only** on interactions before the
temporal cutoff and evaluated on the held-out slice at/after it (leak-free).
All randomness is seeded (seed = 42). Re-run everything with the command block
in the root `README.md` "Reproducing the Full Results" section.

---

## 1. Clean time-split evaluation — PRIMARY (Hybrid vs Baseline)

**Source:** `results/clean_eval_results.{txt,csv}` · **Script:** `results_eval_clean.py`
**Split:** fixed date, `train = interactions[timestamp < 2025-01-01]` (4,294 rows),
`test = interactions[timestamp >= 2025-01-01]` (1,860 rows), 271 test users.

| K | Model | Precision | Recall | NDCG | Coverage | Diversity |
|---|-------|-----------|--------|------|----------|-----------|
| 5 | Baseline | 0.013 | 0.009 | 0.012 | 0.010 | 0.900 |
| 5 | Hybrid | 0.010 | 0.008 | 0.010 | 0.526 | 0.654 |
| 10 | Baseline | 0.014 | 0.023 | 0.017 | 0.020 | 0.889 |
| 10 | Hybrid | 0.012 | 0.018 | 0.014 | 0.724 | 0.696 |
| 20 | Baseline | 0.015 | 0.045 | 0.027 | 0.040 | 0.879 |
| 20 | Hybrid | 0.012 | 0.035 | 0.022 | 0.872 | 0.720 |

**Honest reading.** Once leakage is removed, Baseline is equal to or slightly
ahead of Hybrid on Precision/Recall/NDCG at every K. The Hybrid's decisive,
legitimate win is **Coverage** (0.724 vs 0.020 at K=10 — it personalizes across
~72% of the catalog vs the baseline's single static ~2% list). Baseline's
higher per-list Diversity is expected: personalization concentrates each user's
list around their own taste.

---

## 2. Component-level evaluation (five models)

**Source:** `results/components_eval.{txt,csv}` · **Script:** `results_eval_components.py`
Same clean split as §1. CB-only seeds from each user's most recent train
interaction; CF-only uses the SVD predict path with the <3 popularity fallback
disabled for users that have factors.

| K | Metric | Baseline | Popularity | Content | Collaborative | Hybrid |
|---|--------|---------:|-----------:|--------:|--------------:|-------:|
| 10 | Precision | 0.014 | 0.015 | 0.014 | **0.016** | 0.012 |
| 10 | Recall | 0.023 | 0.027 | 0.017 | **0.028** | 0.018 |
| 10 | NDCG | 0.017 | 0.021 | 0.016 | **0.021** | 0.014 |
| 10 | Coverage | 0.020 | 0.020 | **0.842** | 0.574 | 0.724 |

**Honest reading.** On accuracy the **collaborative filter alone** is the
strongest model; the Hybrid does not lead. Content-based has the highest
coverage but ~0 intra-list diversity (it returns same-category neighbours of the
seed). This is the empirical basis for framing the Hybrid's value as
coverage/personalization rather than accuracy. (K=5 and K=20 rows are in the CSV.)

---

## 3. Hybridization-strategy comparison

**Source:** `results/alpha_strategy_ablation.{txt,csv}` · **Script:** `results_ablation_alpha.py`
Clean split, K=10. Strategy/alpha/gamma/boosts affect only `recommend()`.

| Family | Config | Precision@10 | Coverage@10 |
|--------|--------|-------------:|------------:|
| fixed | α=0.00 (pure CB) | 0.0133 | 0.832 |
| fixed | α=0.50 | 0.0140 | **0.912** |
| fixed | α=1.00 (pure CF) | **0.0144** | 0.554 |
| adaptive | γ=1 | 0.0118 | 0.672 |
| adaptive | γ=3 (shipped) | 0.0118 | 0.724 |
| switching | γ=3 | 0.0137 | 0.608 |
| boost | adaptive γ=3, both on | 0.0118 | 0.724 |
| boost | adaptive γ=3, freshness off | 0.0129 | 0.732 |
| boost | adaptive γ=3, festival off | 0.0118 | 0.724 |
| boost | adaptive γ=3, both off | 0.0129 | 0.732 |

**Honest reading.** Highest Precision@10 is **fixed α=1.0 (pure CF, 0.0144)**;
highest Coverage@10 is fixed α=0.5 (0.912). Switching γ∈{1,3,5} gives identical
accuracy because every active user has ≥9 train interactions (always ≥γ → pure
CF). The **freshness boost slightly *reduces* accuracy** (0.0129 → 0.0118) by
promoting new arrivals that rarely match test interactions. The **festival boost
is inactive** on this test window (test months 1–6; the boost fires only in
months 10–11), so "festival off" is identical to "both on" by construction.

---

## 4. Gamma (cold-start threshold) ablation

**Source:** `results/gamma_ablation.{txt,csv}` · **Script:** `results_ablation_gamma.py`

| gamma | Precision@10 | NDCG@10 |
|-------|-------------:|--------:|
| 1 | 0.0118 | 0.0156 |
| 3 (default) | 0.0118 | 0.0139 |
| 5 | 0.0103 | 0.0128 |
| 10 | 0.0114 | 0.0126 |

**Honest reading.** NDCG@10 is highest at γ=1; the effect is small (Precision@10
spans only 0.0103–0.0118). γ=3 is a defensible-but-not-optimal shipped default,
reported alongside the others exactly as measured (not tuned to win).

---

## 5. Literal 80/20 temporal split (+ fixed-date sensitivity)

**Source:** `results/eval_80_20.{txt,csv}` · **Script:** `results_eval_80_20.py`
80/20 cutoff = 80th-percentile timestamp = **2025-02-23** (train 4,919 rows /
79.9%, test 1,235 rows / 20.1%, 262 test users).

| Model | Precision@10 | Recall@10 | NDCG@10 | Coverage@10 |
|-------|-------------:|----------:|--------:|------------:|
| Baseline | 0.0099 | 0.0267 | 0.0170 | 0.0200 |
| Popularity | 0.0118 | 0.0321 | 0.0215 | 0.0200 |
| Content | 0.0088 | 0.0149 | 0.0124 | 0.8460 |
| Collaborative | 0.0126 | 0.0322 | 0.0200 | 0.5800 |
| Hybrid | 0.0088 | 0.0202 | 0.0136 | 0.7220 |

The fixed-date (2025-01-01) protocol is reported alongside in the same file as a
sensitivity check; both tell the same story (accuracy parity, coverage win).

---

## 6. Statistical significance (80/20 split)

**Source:** `results/significance_tests.{txt,csv}` · **Script:** `results_significance.py`
Per-user Precision@10 and NDCG@10; paired t-test, Wilcoxon signed-rank, and a
1,000-sample bootstrap 95% CI of the mean difference (Hybrid − other), seed=42.
A positive mean difference favours Hybrid.

| Comparison | Metric | mean diff | t-test p | Wilcoxon p | bootstrap 95% CI | Verdict |
|------------|--------|----------:|---------:|-----------:|------------------|---------|
| Hybrid vs Baseline | Precision@10 | −0.0011 | 0.6482 | 0.6473 | [−0.0057, +0.0034] | not significant |
| Hybrid vs Baseline | NDCG@10 | −0.0034 | 0.4790 | 0.4540 | [−0.0123, +0.0059] | not significant |
| Hybrid vs Content | Precision@10 | +0.0000 | 1.0000 | 1.0000 | [−0.0046, +0.0046] | not significant |
| Hybrid vs Content | NDCG@10 | +0.0013 | 0.7636 | 0.6408 | [−0.0069, +0.0094] | not significant |
| Hybrid vs Collaborative | Precision@10 | −0.0038 | **0.0251** | 0.0253 | [−0.0073, −0.0008] | **Hybrid significantly worse** |
| Hybrid vs Collaborative | NDCG@10 | −0.0064 | **0.0096** | 0.0112 | [−0.0115, −0.0018] | **Hybrid significantly worse** |

**Honest reading.** Hybrid is statistically indistinguishable from Baseline and
from Content-based on accuracy. The only significant accuracy difference is that
the **collaborative component alone out-ranks the Hybrid** — the blend costs a
little accuracy. This is reported, not hidden.

---

## 7. Advanced evaluation — RQ1 / RQ2 / RQ3

**Source:** `results/advanced_evaluation.txt` · **Script:** `tests/run_advanced_evaluation.py`
Fixed-date split (train < 2025-01-01).

**RQ1 — significance (NDCG@10, 100-user sample):** Hybrid mean 0.0143 (std
0.0364), Baseline mean 0.0192 (std 0.0504); paired t = −0.7835, **p = 0.4352 →
not significant.** Consistent with §6.

**RQ2 — latency:** cache-miss (full inference) mean 162.65 ms / P95 208.11 ms.
The cache-hit row in this script is a **SIMULATED** upper-bound (a fixed +0.5 ms
constant), **not** a live Redis measurement — see §8 for the live figure that
supersedes it.

**RQ3 — three cold-start segments (dataset v2):**

| Segment | Users | Precision@10 | Recall@10 | NDCG@10 | Coverage |
|---------|------:|-------------:|----------:|--------:|---------:|
| Zero-history (0 train) | 24 | 0.0000 | 0.0000 | 0.0000 | 0.0200 |
| Low-activity (1–3 train) | 7 | 0.0000 | 0.0000 | 0.0000 | 0.1340 |
| Active (>3 train) | 240 | 0.0129 | 0.0206 | 0.0154 | 0.7160 |

The segment is now **non-empty** (it was `NaN`/empty on dataset v1). **Cold-start
pathway:** zero-history users have α=0 and no content seed, so their served
top-10 is **100% new-arrival items** driven by the +0.08 freshness boost (0%
overlap with the popularity fallback, which is nullified by α=0). This surfaces
fresh content but scores 0 accuracy on their held-out interactions — an honest
limitation of the current cold-start handling.

---

## 8. Infrastructure latency — LIVE Redis (supersedes the RQ2 simulation)

**Source:** `results/latency_live.{txt,csv}` · **Script:** `results_latency.py`
Docker was available; Redis was started via `docker compose up -d redis` and the
API via `uvicorn`. 200 cold (cache-flushed) + 200 warm requests to
`GET /api/v1/recommend/user/{id}`. Sanity check: cold phase 0/200 cached, warm
phase 200/200 cached.

| Scenario | Mean (ms) | P95 (ms) |
|----------|----------:|---------:|
| Cache miss (full inference) | 186.32 | 237.89 |
| Cache hit (live Redis GET) | 1.90 | 2.68 |

Mean latency reduction 98.98%. This cache-hit figure is a real HTTP round-trip
to the API served from a live Redis instance, replacing the earlier simulated
+0.5 ms constant. PostgreSQL and Celery remain designed-but-not-deployed (see
README "Infrastructure scope"); the evaluated system serves from in-memory
DataFrames and `/health` honestly reports `db_connected: false`.

---

## 9. Item-side cold-start

**Source:** `results/cold_items.{txt,csv}` · **Script:** `results_cold_items.py`
Over all 271 test users' top-10 lists; 40 `is_cold_item` products (zero
pre-cutoff interactions).

| Model | Cold-item coverage | Mean cold items / list |
|-------|-------------------:|-----------------------:|
| Hybrid (freshness ON) | 0.925 (37/40) | 1.664 |
| Hybrid (freshness OFF) | 0.925 (37/40) | 1.000 |
| Baseline (recency) | 0.000 (0/40) | 0.000 |
| Popularity | 0.000 (0/40) | 0.000 |

**Honest reading.** The Hybrid surfaces 37 of 40 brand-new items; the recency and
popularity baselines surface **none** — they structurally cannot reach items
with no interaction history. The freshness boost does not change *which* cold
items appear (coverage saturates at 37/40) but raises the mean per-list count
(1.664 vs 1.000).

---

## 10. Secondary check — leave-one-out Hit Rate@10

**Source:** `evaluation_suite/evaluation_results.txt` · **Script:** `evaluation_suite/compare_models.py`
Per-user leave-one-out on a 100-user subset:

```
Baseline: 0.0400
Hybrid AI: 0.0200
```

At these magnitudes this is a handful of hits and is a noisy signal; it is
broadly consistent with the accuracy-parity finding and is **not** evidence of a
Hybrid accuracy advantage.

---

## Which protocol is PRIMARY?

The clean fixed-date time-split (§1) remains the primary protocol (full test
population, complete metric suite, matches the methodology `DATASET.md` /
`README.md` already describe), with the literal 80/20 split (§5) as the
co-reported result and everything else as corroborating evidence. Across every
protocol the picture is consistent: **Hybrid ≈ Baseline on ranking accuracy
(not significant), the collaborative component alone is the accuracy leader, and
Hybrid's clear reproducible wins are catalog coverage/personalization and
cold-start item reach.** The documented leakage lesson and the empty→populated
RQ3 cold-start segment are themselves findings, reported rather than hidden.
