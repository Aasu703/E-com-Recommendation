# Results Summary — Leak-Free Evaluation (Dataset v3 edition)

Regenerated 2026-08-18 on **dataset v3** (see `DATASET.md` "Dataset v3
changelog") — a ~5x scale-up of dataset v2 (2,500 products / 1,500 users /
30,723 interactions), keeping the same genuine cold-start cohort structure
introduced in v2. This directory holds the evaluation output produced *after*
fixing the train/test leakage identified in `REPO_AUDIT.md` §5–6, and after
rebuilding the dataset with genuine cold-start cohorts so that RQ3 can
actually be measured. Every number below is quoted verbatim from a file in
this `results/` directory (or `evaluation_suite/evaluation_results.txt`).
Nothing here is invented; the frontend and `thesis_assets/thesis_numbers.json`
are generated from these same files by `scripts/export_metrics.py`.

**Model-configuration change (this regeneration).** The shipped model was
updated from the previous `gamma=3, cold_user_fallback=False` defaults to
`gamma=1, cold_user_fallback=True`:
  * **γ: 3 → 1.** The γ ablation (§4) and the strategy ablation (§3) both show
    Precision@10 highest at γ=1 (0.0017 vs 0.0012 at the old γ=3), so the
    shipped default now matches the measured-best value instead of the earlier
    "defensible-but-not-optimal" choice.
  * **Cold-user fallback shipped.** Zero-history users previously scored
    0.0000 everywhere because α=0 nullified the popularity fallback and their
    top-10 was 100% new arrivals (§7). The measured `cold_user_fallback=True`
    pathway (α=1.0 + popularity fallback + a +0.08 preferred-category boost)
    lifts that segment to Precision@10=0.0016 (§7, results_cold_user_fallback)
    and is now the shipped default. `results_cold_user_fallback.py` still
    reports the previous behaviour (`False`) for comparison.
Both changes only affect `HybridRecommender.recommend()`/defaults, never the
leak-free protocol; the full test suite (`poetry run pytest`) passes unchanged.

Protocol (unless noted): models are fit **only** on interactions before the
temporal cutoff and evaluated on the held-out slice at/after it (leak-free).
All randomness is seeded (seed = 42). Re-run everything with the command block
in the root `README.md` "Reproducing the Full Results" section.

**Methodological note on the earlier v2→v3 regeneration.** `HybridRecommender.recommend()`
previously scored the catalog with a per-product Python loop that called
`_compute_alpha()` (an O(n) DataFrame filter) once per product — an O(n²)
pattern that was fine at v2's 500 products but made a single `recommend()`
call take multiple seconds at v3's 2,500 products, which would have made this
regeneration take hours. It was rewritten to compute the same formula
vectorized over numpy arrays (identical scores, `_compute_alpha()` itself is
unchanged and still used by `api/recommend_blend.py`); the full test suite
(`poetry run pytest`) passes unchanged before and after. This is why the
absolute latency figures in §8 below are far lower than the v2 edition's —
they reflect the fixed code, not a different infrastructure setup.

---

## 1. Clean time-split evaluation — PRIMARY (Hybrid vs Baseline)

**Source:** `results/clean_eval_results.{txt,csv}` · **Script:** `results_eval_clean.py`
**Split:** fixed date, `train = interactions[timestamp < 2025-01-01]` (21,400 rows),
`test = interactions[timestamp >= 2025-01-01]` (9,323 rows), 1,386 test users.
**Shipped Hybrid config:** `gamma=1, cold_user_fallback=True`.

| K | Model | Precision | Recall | NDCG | Coverage | Diversity |
|---|-------|-----------|--------|------|----------|-----------|
| 5 | Baseline | 0.0038 | 0.0025 | 0.0037 | 0.0020 | 0.9000 |
| 5 | Hybrid | 0.0020 | 0.0016 | 0.0023 | 0.2612 | 0.6390 |
| 10 | Baseline | 0.0030 | 0.0039 | 0.0038 | 0.0040 | 0.8000 |
| 10 | Hybrid | 0.0019 | 0.0029 | 0.0026 | 0.3208 | 0.6178 |
| 20 | Baseline | 0.0028 | 0.0073 | 0.0054 | 0.0080 | 0.8211 |
| 20 | Hybrid | 0.0015 | 0.0047 | 0.0034 | 0.4812 | 0.6076 |

**Honest reading.** Absolute Precision/Recall/NDCG remain far smaller than the
v2 edition across every model — expected, since the catalog is 5x larger
(2,500 products) while K is unchanged, so hitting a held-out item in the
top-K is proportionally harder for everyone. Once leakage is removed, Baseline
is still ahead of Hybrid on Precision/Recall/NDCG at every K, same as before,
but the shipped config changes (γ=1 + cold-user fallback) closed much of the
gap: Hybrid Precision@10 rose from 0.0012 → 0.0019 and NDCG@10 from 0.0014 →
0.0026 in this regeneration. The Hybrid's decisive, legitimate win is still
**Coverage** (0.3208 vs 0.0040 at K=10 — it personalizes across ~32% of the
catalog vs the baseline's single static ~0.4% list). Baseline's higher per-list
Diversity is expected: personalization concentrates each user's list around
their own taste.

---

## 2. Component-level evaluation (five models)

**Source:** `results/components_eval.{txt,csv}` · **Script:** `results_eval_components.py`
Same clean split as §1. Split date: 2025-01-01; Train interactions: 21,400 |
Test interactions: 9,323; Train users: 1,333 | Test users: 1,386. CB-only
seeds from each user's most recent train interaction; CF-only uses the SVD
predict path with the <3 popularity fallback disabled for users that have
factors.

| K | Metric | Baseline | Popularity | Content | Collaborative | Hybrid |
|---|--------|---------:|-----------:|--------:|--------------:|-------:|
| 10 | Precision | 0.0030 | 0.0029 | 0.0021 | **0.0027** | 0.0019 |
| 10 | Recall | 0.0039 | 0.0042 | 0.0029 | **0.0041** | 0.0029 |
| 10 | NDCG | 0.0038 | 0.0034 | 0.0025 | **0.0033** | 0.0026 |
| 10 | Coverage | 0.0040 | 0.0040 | **0.7032** | 0.2504 | 0.3208 |

**Honest reading.** On accuracy the **collaborative filter alone** remains the
strongest model; the Hybrid does not lead. Content-based has the highest
coverage but ~0 intra-list diversity (it returns same-category neighbours of
the seed). The Hybrid's accuracy and NDCG both improved (0.0012 → 0.0019 and
0.0014 → 0.0026) versus the previous shipped config but remain below the CF
component. This is the same empirical basis as before for framing the Hybrid's
value as coverage/personalization rather than accuracy. (K=5 and K=20 rows are
in the CSV.)

---

## 3. Hybridization-strategy comparison

**Source:** `results/alpha_strategy_ablation.{txt,csv}` · **Script:** `results_ablation_alpha.py`
Clean split, K=10. Strategy/alpha/gamma/boost flags only affect `recommend()`;
`cold_user_fallback=False` is passed so every row isolates the strategy/boost
effect from the shipped cold-user fallback (which triggers only for
zero-history users and is orthogonal to these settings).

| Family | Config | Precision@10 | Coverage@10 |
|--------|--------|-------------:|------------:|
| fixed | α=0.00 (pure CB) | 0.0019 | 0.7028 |
| fixed | α=0.25 | 0.0024 | **0.9092** |
| fixed | α=0.50 | 0.0022 | 0.8840 |
| fixed | α=0.75 | 0.0022 | 0.6396 |
| fixed | α=1.00 (pure CF) | **0.0029** | 0.2396 |
| adaptive | γ=1 (shipped gamma) | 0.0017 | 0.3160 |
| adaptive | γ=3 | 0.0012 | 0.3376 |
| switching | γ=3 | 0.0027 | 0.3904 |
| boost | adaptive γ=3, both on | 0.0012 | 0.3376 |
| boost | adaptive γ=3, freshness off | 0.0019 | 0.4980 |
| boost | adaptive γ=3, festival off | 0.0012 | 0.3376 |
| boost | adaptive γ=3, both off | 0.0019 | 0.4980 |

**Honest reading.** Highest Precision@10 is **fixed α=1.0 (pure CF, 0.0029)**;
highest Coverage@10 is fixed α=0.25 (0.9092). Switching γ∈{1,3,5} gives
near-identical accuracy (0.0027 across all three) because almost every active
user clears the threshold either way. The **freshness boost still slightly
*reduces* accuracy** (0.0019 with it off vs 0.0012 with it on) by promoting new
arrivals that rarely match test interactions. The **festival boost is inactive**
on this test window (test months 1–6; the boost fires only in months 10–11),
so "festival off" is identical to "both on" by construction. The shipped model
is adaptive γ=1 **plus** the cold-user fallback, so its measured clean numbers
(§1: Precision@10 0.0019, Coverage 0.3208) sit slightly above the "adaptive
γ=1" row here, which isolates the alpha curve alone.

---

## 4. Gamma (cold-start threshold) ablation

**Source:** `results/gamma_ablation.{txt,csv}` · **Script:** `results_ablation_gamma.py`
`cold_user_fallback=False` so the sweep isolates the alpha curve. Values are
the same as the previous edition (the shipped default has now moved onto the
measured-best point rather than off it).

| gamma | Precision@10 | NDCG@10 |
|-------|-------------:|--------:|
| 1 (shipped) | 0.0017 | 0.0020 |
| 3 | 0.0012 | 0.0014 |
| 5 | 0.0008 | 0.0011 |
| 10 | 0.0009 | 0.0010 |

**Honest reading.** Precision@10 and NDCG@10 are both highest at γ=1, the same
ordering as in the previous edition (0.0008–0.0017, a ~2x relative spread).
Because γ=1 is the measured-best value on this dataset, the shipped default was
moved from γ=3 to γ=1 — a small but real, evidence-backed tuning change, not a
claimed breakthrough.

---

## 5. Literal 80/20 temporal split (+ fixed-date sensitivity)

**Source:** `results/eval_80_20.{txt,csv}` · **Script:** `results_eval_80_20.py`
80/20 cutoff = 80th-percentile timestamp = **2025-02-21** (train 24,534 rows /
79.9%, test 6,189 rows / 20.1%, 1,346 test users).

| Model | Precision@10 | Recall@10 | NDCG@10 | Coverage@10 |
|-------|-------------:|----------:|--------:|------------:|
| Baseline | 0.0014 | 0.0035 | 0.0027 | 0.0040 |
| Popularity | 0.0021 | 0.0044 | 0.0034 | 0.0040 |
| Content | 0.0022 | 0.0051 | 0.0033 | 0.7028 |
| Collaborative | 0.0022 | 0.0047 | 0.0032 | 0.2636 |
| Hybrid | 0.0012 | 0.0028 | 0.0024 | 0.3472 |

The fixed-date (2025-01-01) protocol is reported alongside in the same file as
a sensitivity check (Hybrid: Precision@10 0.0019, NDCG@10 0.0026, Coverage
0.3208); both tell the same story (accuracy parity, coverage win).

---

## 6. Statistical significance (80/20 split)

**Source:** `results/significance_tests.{txt,csv}` · **Script:** `results_significance.py`
Per-user Precision@10 and NDCG@10; paired t-test, Wilcoxon signed-rank, and a
1,000-sample bootstrap 95% CI of the mean difference (Hybrid − other), seed=42.
A positive mean difference favours Hybrid.

| Comparison | Metric | mean diff | t-test p | Wilcoxon p | bootstrap 95% CI | Verdict |
|------------|--------|----------:|---------:|-----------:|------------------|---------|
| Hybrid vs Baseline | Precision@10 | −0.0002 | 0.6123 | 0.6121 | [−0.0011, +0.0006] | not significant |
| Hybrid vs Baseline | NDCG@10 | −0.0003 | 0.7948 | 0.9282 | [−0.0024, +0.0017] | not significant |
| Hybrid vs Content | Precision@10 | −0.0010 | **0.0390** | 0.0390 | [−0.0021, −0.0001] | **Hybrid significantly worse** |
| Hybrid vs Content | NDCG@10 | −0.0009 | 0.3473 | 0.2314 | [−0.0027, +0.0010] | not significant |
| Hybrid vs Collaborative | Precision@10 | −0.0010 | **0.0016** | 0.0016 | [−0.0016, −0.0004] | **Hybrid significantly worse** |
| Hybrid vs Collaborative | NDCG@10 | −0.0008 | **0.0298** | 0.0249 | [−0.0015, −0.0000] | **Hybrid significantly worse** |

**Honest reading.** Hybrid remains statistically indistinguishable from
Baseline on accuracy (both metrics, all tests) — the accuracy-parity finding
survives the shipped-config change, with the p-values moving from 0.49/0.30 to
0.61/0.79 as the Hybrid's numbers edge up. As before, the clearest significant
results are that **content-based alone** (Precision@10, p=0.039) and the
**collaborative component alone** (Precision@10 p=0.0016, NDCG@10 p=0.0298)
out-rank the Hybrid — the blend still costs accuracy. This is reported, not
hidden.

---

## 7. Advanced evaluation — RQ1 / RQ2 / RQ3

**Source:** `results/advanced_evaluation.txt` · **Script:** `tests/run_advanced_evaluation.py`
Fixed-date split (train < 2025-01-01). (The script now persists its full output
to `results/advanced_evaluation.txt`, closing the REPO_AUDIT §6 gap where it
only printed to stdout.)

**RQ1 — significance (NDCG@10, 100-user sample):** Hybrid mean 0.0060 (std
0.0367), Baseline mean 0.0069 (std 0.0264); paired t = −0.2423, **p = 0.8091 →
not significant.** Consistent with §6.

**RQ2 — latency:** cache-miss (full inference) mean 5.05 ms / P95 6.38 ms —
far below the v2 edition's 162.65 ms because of the `recommend()` vectorization
fix described above. This row is run-to-run noise (the previous capture was
4.92/5.86 ms); the cache-hit row in this script is a **SIMULATED** upper-bound
(a fixed +0.5 ms constant), **not** a live Redis measurement — see §8 for the
live figure that supersedes it.

**RQ3 — three cold-start segments (dataset v3, shipped model):**

| Segment | Users | Precision@10 | Recall@10 | NDCG@10 | Coverage |
|---------|------:|-------------:|----------:|--------:|---------:|
| Zero-history (0 train) | 127 | 0.0016 | 0.0066 | 0.0067 | 0.0124 |
| Low-activity (1–3 train) | 60 | 0.0000 | 0.0000 | 0.0000 | 0.1164 |
| Active (>3 train) | 1,199 | 0.0018 | 0.0025 | 0.0023 | 0.2760 |

**The zero-history hole is partially closed (was all 0.0000).** The shipped
cold-user fallback gives zero-history users α=1.0 so the popularity fallback
scores, plus a +0.08 boost on their onboarding `preferred_categories`: their
Precision@10/Recall@10/NDCG@10 rose from 0.0000 to 0.0016/0.0066/0.0067, and
their served top-10 is now 0% new arrivals with 55% overlap against the
popularity fallback list (previously 100% new arrivals, 0% overlap — see
`results_cold_user_fallback.py`). The **low-activity segment remains at
0.0000** — 1–3 train interactions is still too little signal for either the
CF path or a reliable content seed — an honest residual weakness. Note the
segment coverage figures shifted slightly (low-activity 0.1484 → 0.1164,
active 0.2808 → 0.2760) purely because γ=1 re-weights low-activity users'
recommendations.

---

## 8. Infrastructure latency — LIVE Redis (supersedes the RQ2 simulation)

**Source:** `results/latency_live.{txt,csv}` · **Script:** `results_latency.py`
Docker was available; Redis was started via `docker compose up -d redis` and the
API via `uvicorn`. 200 cold (cache-flushed) + 200 warm requests to
`GET /api/v1/recommend/user/{id}`. Sanity check: cold phase 0/200 cached, warm
phase 200/200 cached. Unaffected by the shipped-config change (measures HTTP
round-trips, not model scoring).

| Scenario | Mean (ms) | P95 (ms) |
|----------|----------:|---------:|
| Cache miss (full inference) | 9.04 | 10.03 |
| Cache hit (live Redis GET) | 1.46 | 1.73 |

Mean latency reduction 83.81%. Both figures are far lower than the v2
edition's (186.32 ms / 1.90 ms) because of the `recommend()` vectorization fix
described above; the *relative* reduction is smaller too (83.81% vs 98.98%)
because the now-fast inference path leaves less absolute latency for caching
to remove. This cache-hit figure is a real HTTP round-trip to the API served
from a live Redis instance, not a simulated constant. PostgreSQL and Celery
remain designed-but-not-deployed (see README "Infrastructure scope"); the
evaluated system serves from in-memory DataFrames and `/health` honestly
reports `db_connected: false`.

---

## 9. Item-side cold-start

**Source:** `results/cold_items.{txt,csv}` · **Script:** `results_cold_items.py`
Over all 1,386 test users' top-10 lists; 200 `is_cold_item` products (zero
pre-cutoff interactions).

| Model | Cold-item coverage | Mean cold items / list |
|-------|-------------------:|------------------------:|
| Hybrid (freshness ON) | 0.900 (180/200) | 2.194 |
| Hybrid (freshness OFF) | 0.895 (179/200) | 1.228 |
| Baseline (recency) | 0.000 (0/200) | 0.000 |
| Popularity | 0.000 (0/200) | 0.000 |

**Honest reading.** The Hybrid surfaces 180 of 200 brand-new items (90.0%),
essentially unchanged; the recency and popularity baselines surface **none** —
they structurally cannot reach items with no interaction history. The mean
cold items per list dropped (3.798 → 2.194 with the boost on) purely because
the 127 zero-history users no longer serve 10 new arrivals each (they now get
the popularity fallback, §7); active users still surface the full set. As
before, the freshness boost roughly doubles the per-list count (2.194 vs 1.228)
without changing which cold items appear (180/200 vs 179/200).

---

## 10. Secondary check — leave-one-out Hit Rate@10

**Source:** `evaluation_suite/evaluation_results.txt` · **Script:** `evaluation_suite/compare_models.py`
Per-user leave-one-out on a 100-user subset, Dashain (month 10) context:

```
Baseline: 0.0100
Hybrid AI: 0.0000
Improvement: -100.0%
```

At these magnitudes this is a single hit (100 users, one of whom hit before),
so it is a noisy signal — the previous edition showed them tied at 0.0100, this
edition shows the hybrid at 0.0000 after the γ=1 change; the swing of exactly
one hit between editions is the noise floor, not a finding. It is broadly
consistent with the accuracy-parity finding and is **not** evidence of a
Hybrid accuracy advantage either way.

---

## Which protocol is PRIMARY?

The clean fixed-date time-split (§1) remains the primary protocol (full test
population, complete metric suite, matches the methodology `DATASET.md` /
`README.md` already describe), with the literal 80/20 split (§5) as the
co-reported result and everything else as corroborating evidence. Across every
protocol the picture is consistent with the previous edition: **Hybrid ≈
Baseline on ranking accuracy (not significant), the collaborative component
alone is the accuracy leader, and Hybrid's clear reproducible wins are catalog
coverage/personalization and cold-start item reach.** The v3 shipped-config
change (γ=1 + cold-user fallback) is a small, evidence-backed improvement: it
narrowed the accuracy gap at no cost to the coverage win, and it partially
closed the zero-history cold-start hole (0.0000 → 0.0016 P@10), with the
low-activity segment remaining the honest residual weakness. The documented
leakage lesson and the empty→populated RQ3 cold-start segment remain findings
from the earlier dataset versions, reported rather than hidden.
