# Results Summary — Leak-Free Evaluation (Dataset v4 edition)

Regenerated 2026-08-19 on **dataset v4** (see `DATASET.md` "Dataset v4
changelog"). v4 keeps v3's scale (2,500 products / 1,500 users / 30,739
interactions) and cold-start cohort structure unchanged, but replaces v1–v3's
uniform-random interaction sampling with a **planted, recoverable
latent-preference structure** (category/brand affinity, price-fit) and
extends the interaction window so festival months (10–11) now fall inside the
test period. Every number below is quoted verbatim from a file in this
`results/` directory (or `evaluation_suite/evaluation_results.txt`). Nothing
here is invented; the frontend and `thesis_assets/thesis_numbers.json` are
generated from these same files by `scripts/export_metrics.py`.

**Shipped model config is unchanged from the v3 edition:**
`gamma=1, cold_user_fallback=True`. Re-running the gamma ablation (§4) on v4
confirms γ=1 is still the measured-best value, so no config change was needed
— only the numbers moved.

Protocol (unless noted): models are fit **only** on interactions before the
temporal cutoff and evaluated on the held-out slice at/after it (leak-free).
All randomness is seeded (seed = 42). Re-run everything with the command block
in the root `README.md` "Reproducing the Full Results" section.

---

## 1. Clean time-split evaluation — PRIMARY (Hybrid vs Baseline)

**Source:** `results/clean_eval_results.{txt,csv}` · **Script:** `results_eval_clean.py`
**Split:** fixed date, `train = interactions[timestamp < 2025-01-01]` (15,503 rows),
`test = interactions[timestamp >= 2025-01-01]` (15,236 rows), 1,427 test users.
**Shipped Hybrid config:** `gamma=1, cold_user_fallback=True`.

| K | Model | Precision | Recall | NDCG | Coverage | Diversity |
|---|-------|-----------|--------|------|----------|-----------|
| 5 | Baseline | 0.0067 | 0.0035 | 0.0073 | 0.0020 | 1.0000 |
| 5 | Hybrid | 0.0085 | 0.0036 | 0.0110 | 0.2032 | 0.4650 |
| 10 | Baseline | 0.0061 | 0.0060 | 0.0071 | 0.0040 | 0.8667 |
| 10 | Hybrid | 0.0067 | 0.0061 | 0.0092 | 0.2408 | 0.4028 |
| 20 | Baseline | 0.0066 | 0.0130 | 0.0098 | 0.0080 | 0.8684 |
| 20 | Hybrid | 0.0070 | 0.0152 | 0.0119 | 0.4428 | 0.4440 |

**Honest reading.** This is the one headline number that moved direction. Under
v3's uniform-random interactions, Baseline led Hybrid on Precision/Recall/NDCG
at every K. Under v4's planted preference signal, **Hybrid is now nominally
ahead of Baseline at every K** (e.g. Precision@10 0.0067 vs 0.0061). This is
not a new claimed win: §6 shows the gap is still statistically indistinguishable
from noise on the paired significance test. What changed is that a real,
recoverable signal now exists for models to compete over at all — v3's numbers
were both models fighting over the noise floor. The Hybrid's decisive,
legitimate win is still **Coverage** (0.2408 vs 0.0040 at K=10 — it
personalizes across ~24% of the catalog vs the baseline's single static ~0.4%
list). Baseline's higher per-list Diversity is expected: personalization
concentrates each user's list around their own planted taste.

---

## 2. Component-level evaluation (five models)

**Source:** `results/components_eval.{txt,csv}` · **Script:** `results_eval_components.py`
Same clean split as §1. Split date: 2025-01-01; Train interactions: 15,503 |
Test interactions: 15,236; Test users: 1,427. CB-only seeds from each user's
most recent train interaction; CF-only uses the SVD predict path with the
popularity fallback disabled for users that have factors.

| K | Metric | Baseline | Popularity | Content | Collaborative | Hybrid |
|---|--------|---------:|-----------:|--------:|--------------:|-------:|
| 10 | Precision | 0.0061 | 0.0112 | 0.0117 | **0.0142** | 0.0067 |
| 10 | Recall | 0.0060 | 0.0112 | 0.0096 | **0.0112** | 0.0061 |
| 10 | NDCG | 0.0071 | 0.0115 | 0.0121 | **0.0156** | 0.0092 |
| 10 | Coverage | 0.0040 | 0.0040 | **0.6928** | 0.1620 | 0.2408 |

**Honest reading.** On accuracy the **collaborative filter alone** remains the
strongest model by a wide margin (Precision@10 0.0142 vs Hybrid's 0.0067,
more than double) — the planted signal makes CF's advantage sharper, not
smaller, than it was under v3. Content-based has the second-highest coverage
after Hybrid but ~0 intra-list diversity (it returns same-category neighbours
of the seed). This is the same empirical basis as v3 for framing the Hybrid's
value as coverage/personalization rather than accuracy — the gap to the CF
component is now larger, not smaller, under a dataset with real signal to
recover. (K=5 and K=20 rows are in the CSV.)

---

## 3. Hybridization-strategy comparison

**Source:** `results/alpha_strategy_ablation.{txt,csv}` · **Script:** `results_ablation_alpha.py`
Clean split, K=10. Strategy/alpha/gamma/boost flags only affect `recommend()`;
`cold_user_fallback=False` is passed so every row isolates the strategy/boost
effect from the shipped cold-user fallback (which triggers only for
zero-history users and is orthogonal to these settings).

| Family | Config | Precision@10 | Coverage@10 |
|--------|--------|-------------:|------------:|
| fixed | α=0.00 (pure CB) | 0.0105 | 0.6924 |
| fixed | α=0.25 | 0.0100 | **0.8928** |
| fixed | α=0.50 | 0.0095 | 0.8288 |
| fixed | α=0.75 | 0.0097 | 0.4568 |
| fixed | α=1.00 (pure CF) | **0.0142** | 0.1544 |
| adaptive | γ=1 (shipped gamma) | 0.0064 | 0.2376 |
| adaptive | γ=3 | 0.0046 | 0.2872 |
| switching | γ=1 | 0.0142 | 0.1536 |
| switching | γ=3 | 0.0142 | 0.3644 |
| switching | γ=5 | 0.0142 | 0.3680 |
| boost | adaptive γ=3, both on | 0.0046 | 0.2872 |
| boost | adaptive γ=3, freshness off | 0.0088 | 0.5096 |
| boost | adaptive γ=3, festival off | 0.0046 | 0.2872 |
| boost | adaptive γ=3, both off | 0.0088 | 0.5096 |

**Honest reading.** Highest Precision@10 is **fixed α=1.0 (pure CF, 0.0142)**;
highest Coverage@10 is fixed α=0.25 (0.8928). Switching at γ∈{1,3,5} gives
identical accuracy (0.0142) because it collapses to pure-CF for almost every
active user regardless of threshold; only coverage moves as the threshold
changes which users fall to CB instead. The **freshness boost still reduces
accuracy** (0.0088 with it off vs 0.0046 with it on) by promoting new arrivals
that rarely match test interactions — unchanged conclusion from v3.
**Corrected from the v3 write-up:** the festival boost is still inactive in
this ablation, but not because the v4 test window lacks festival months (it
doesn't — months 10–11 are now in-window, see `DATASET.md`). It is inactive
because `Evaluator.evaluate()` never passes a `month` key in the `recommend()`
context, so the boost never fires regardless of dataset version — a harness
limitation, not a dataset one. The shipped model is adaptive γ=1 **plus** the
cold-user fallback, so its measured clean numbers (§1: Precision@10 0.0067,
Coverage 0.2408) sit slightly above the "adaptive γ=1" row here, which isolates
the alpha curve alone.

---

## 4. Gamma (cold-start threshold) ablation

**Source:** `results/gamma_ablation.{txt,csv}` · **Script:** `results_ablation_gamma.py`
`cold_user_fallback=False` so the sweep isolates the alpha curve.

| gamma | Precision@10 | NDCG@10 |
|-------|-------------:|--------:|
| 1 (shipped) | 0.0064 | 0.0087 |
| 3 | 0.0046 | 0.0056 |
| 5 | 0.0038 | 0.0041 |
| 10 | 0.0034 | 0.0033 |

**Honest reading.** Precision@10 and NDCG@10 are both highest at γ=1, the same
ordering as the v3 edition (0.0034–0.0064, a ~1.9x relative spread — similar
magnitude to v3's ~2x). γ=1 remains the measured-best value under v4, so the
shipped default needed no change.

---

## 5. Literal 80/20 temporal split (+ fixed-date sensitivity)

**Source:** `results/eval_80_20.{txt,csv}` · **Script:** `results_eval_80_20.py`
80/20 cutoff = 80th-percentile timestamp = **2025-07-30** (train 24,588 rows /
80.0%, test 6,151 rows / 20.0%, 1,312 test users).

| Model | Precision@10 | Recall@10 | NDCG@10 | Coverage@10 |
|-------|-------------:|----------:|--------:|------------:|
| Baseline | 0.0033 | 0.0071 | 0.0053 | 0.0040 |
| Popularity | 0.0040 | 0.0077 | 0.0068 | 0.0040 |
| Content | 0.0066 | 0.0133 | 0.0105 | 0.6964 |
| Collaborative | 0.0067 | 0.0133 | 0.0110 | 0.1572 |
| Hybrid | 0.0035 | 0.0071 | 0.0069 | 0.2452 |

The fixed-date (2025-01-01) protocol is reported alongside in the same file as
a sensitivity check (Hybrid: Precision@10 0.0067, NDCG@10 0.0092, Coverage
0.2408); both tell the same story (accuracy parity vs Baseline, clear
coverage win, but a clear accuracy loss to the standalone CF/CB components).

---

## 6. Statistical significance (80/20 split)

**Source:** `results/significance_tests.{txt,csv}` · **Script:** `results_significance.py`
Per-user Precision@10 and NDCG@10; paired t-test, Wilcoxon signed-rank, and a
1,000-sample bootstrap 95% CI of the mean difference (Hybrid − other), seed=42.
A positive mean difference favours Hybrid.

| Comparison | Metric | mean diff | t-test p | Wilcoxon p | bootstrap 95% CI | Verdict |
|------------|--------|----------:|---------:|-----------:|------------------|---------|
| Hybrid vs Baseline | Precision@10 | +0.0002 | 0.7479 | 0.7477 | [−0.0011, +0.0015] | not significant |
| Hybrid vs Baseline | NDCG@10 | +0.0016 | 0.2638 | 0.1935 | [−0.0014, +0.0046] | not significant |
| Hybrid vs Content | Precision@10 | −0.0031 | **0.0004** | **0.0005** | [−0.0050, −0.0013] | **Hybrid significantly worse** |
| Hybrid vs Content | NDCG@10 | −0.0035 | **0.0420** | 0.0516 | [−0.0068, −0.0000] | mixed (t-test significant, Wilcoxon not) |
| Hybrid vs Collaborative | Precision@10 | −0.0032 | **<0.0001** | **<0.0001** | [−0.0043, −0.0023] | **Hybrid significantly worse** |
| Hybrid vs Collaborative | NDCG@10 | −0.0041 | **<0.0001** | **<0.0001** | [−0.0057, −0.0025] | **Hybrid significantly worse** |

**Honest reading.** Hybrid remains statistically indistinguishable from
Baseline on accuracy (both metrics, all tests) — the accuracy-parity finding
survives the v3→v4 dataset rewrite intact, even though the raw mean now edges
in Hybrid's favour (+0.0002/+0.0016) rather than Baseline's. As before, the
clearest significant results are that **content-based alone** and the
**collaborative component alone** out-rank the Hybrid, and the gap is *wider*
here than it was under v3 (e.g. Hybrid vs Collaborative Precision@10 p was
0.0016 under v3, now p<0.0001) — a real, recoverable preference signal makes
the cost of blending in the non-personalized/cold-start machinery more
visible, not less. This is reported, not hidden.

---

## 7. Advanced evaluation — RQ1 / RQ2 / RQ3

**Source:** `results/advanced_evaluation.txt` · **Script:** `tests/run_advanced_evaluation.py`
Fixed-date split (train < 2025-01-01).

**RQ1 — significance (NDCG@10, 100-user sample):** Hybrid mean 0.0144 (std
0.0488), Baseline mean 0.0062 (std 0.0234); paired t = 1.4791, **p = 0.1423 →
not significant.** Consistent with §6 (a different, smaller sample than the
80/20 split there, hence a different p-value, same conclusion).

**RQ2 — latency:** cache-miss (full inference) mean 6.47 ms / P95 9.28 ms in
this script's simulated-cache-hit run. **Not re-measured against live Redis
for this v4 regeneration** — Docker was not running in this session, and
latency depends only on catalog size (2,500 products, unchanged v3→v4) and
model compute cost (unchanged), not on which interactions were sampled, so
the existing §8 live figures remain the authoritative, valid measurement.
Re-run `results_latency.py` if the catalog size or model architecture ever
changes.

**RQ3 — three cold-start segments (dataset v4, shipped model):**

| Segment | Users | Precision@10 | Recall@10 | NDCG@10 | Coverage |
|---------|------:|-------------:|----------:|--------:|---------:|
| Zero-history (0 train) | 149 | 0.0027 | 0.0101 | 0.0047 | 0.0112 |
| Low-activity (1–3 train) | 78 | 0.0000 | 0.0000 | 0.0000 | 0.1176 |
| Active (>3 train) | 1,200 | 0.0049 | 0.0039 | 0.0065 | 0.2156 |

**The zero-history hole is more meaningfully closed than under v3.** The
shipped cold-user fallback gives zero-history users α=1.0 so the popularity
fallback scores, plus a +0.08 boost on their onboarding `preferred_categories`:
Precision@10/Recall@10/NDCG@10 rose from 0.0000 (fallback off, see
`results_cold_user_fallback.txt`) to 0.0027/0.0101/0.0047, and — this is new —
their served top-10 is now **0% new arrivals** (was 100% under v3) with **61.5%
overlap** against the popularity fallback list. Under v3 the fallback only
changed *which* items were served (still 100% new-arrival, just via a
different path); under v4, with a real preference signal for the popularity
fallback and category boost to act on, it changes the *composition* of the
list too. The **low-activity segment remains at 0.0000** — 1–3 train
interactions is still too little signal for either the CF path or a reliable
content seed — the same honest residual weakness as v3.

---

## 8. Infrastructure latency — LIVE Redis (supersedes the RQ2 simulation)

**Source:** `results/latency_live.{txt,csv}` · **Script:** `results_latency.py`
**Not re-measured for this v4 regeneration** (Docker/Redis unavailable in this
session — see §7 RQ2 note). These figures are carried forward unchanged from
the v3 regeneration; they remain valid because latency is a function of
catalog size and inference cost, both identical between v3 and v4
(`N_USERS=1500`, `N_PRODUCTS=2500` unchanged). Re-run
`docker compose up -d redis` + `uvicorn` + `results_latency.py` to re-confirm
if this assumption is ever in doubt.

| Scenario | Mean (ms) | P95 (ms) |
|----------|----------:|---------:|
| Cache miss (full inference) | 9.04 | 10.03 |
| Cache hit (live Redis GET) | 1.46 | 1.73 |

Mean latency reduction 83.81%. PostgreSQL and Celery remain
designed-but-not-deployed (see README "Infrastructure scope"); the evaluated
system serves from in-memory DataFrames and `/health` honestly reports
`db_connected: false`.

---

## 9. Item-side cold-start

**Source:** `results/cold_items.{txt,csv}` · **Script:** `results_cold_items.py`
Over all 1,427 test users' top-10 lists; 200 `is_cold_item` products (zero
pre-cutoff interactions).

| Model | Cold-item coverage | Mean cold items / list |
|-------|-------------------:|------------------------:|
| Hybrid (freshness ON) | 0.895 (179/200) | 3.085 |
| Hybrid (freshness OFF) | 0.895 (179/200) | 2.081 |
| Baseline (recency) | 0.000 (0/200) | 0.000 |
| Popularity | 0.000 (0/200) | 0.000 |

**Honest reading.** The Hybrid surfaces 179 of 200 brand-new items (89.5%),
essentially unchanged from v3's 90.0% (180/200); the recency and popularity
baselines surface **none** — they structurally cannot reach items with no
interaction history. As before, the freshness boost roughly doubles the
per-list count (3.085 vs 2.081) without changing which cold items appear
(179/200 vs 179/200 — the freshness toggle changes *how many* cold items make
each list, not *which* ones are reachable at all).

---

## 10. Secondary check — leave-one-out Hit Rate@10

**Source:** `evaluation_suite/evaluation_results.txt` · **Script:** `evaluation_suite/compare_models.py`
Per-user leave-one-out on a 100-user subset, Dashain (month 10) context:

```
Baseline: 0.0000
Hybrid AI: 0.0000
Improvement: +0.0%
```

Both models score exactly zero hits on this 100-user subset. At this sample
size a single hit moves the rate by 1 percentage point, so this is pure noise
floor, not a finding — the v3 edition showed Baseline 0.0100 / Hybrid 0.0000;
this edition shows both at 0.0000. It is broadly consistent with the
accuracy-parity finding and is **not** evidence of a Hybrid accuracy advantage
either way.

---

## Which protocol is PRIMARY?

The clean fixed-date time-split (§1) remains the primary protocol (full test
population, complete metric suite, matches the methodology `DATASET.md` /
`README.md` already describe), with the literal 80/20 split (§5) as the
co-reported result and everything else as corroborating evidence. The v3→v4
dataset rewrite changed the *texture* of the results without changing the
*narrative*: **Hybrid ≈ Baseline on ranking accuracy (still not significant,
though the raw mean flipped in Hybrid's favour), the collaborative component
alone is the accuracy leader by a wider margin than under v3, and Hybrid's
clear reproducible wins remain catalog coverage/personalization and
cold-start item reach.** The zero-history cold-start fix is now more
substantive (0.0000 → 0.0027 P@10, and the served list composition genuinely
changes, not just its provenance) because v4 gives the popularity fallback and
category boost a real signal to act on; the low-activity segment remains the
honest residual weakness, unchanged from v3. The documented leakage lesson and
the empty→populated RQ3 cold-start segment remain findings from the earlier
dataset versions, reported rather than hidden.
