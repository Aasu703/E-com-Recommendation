# Repository Audit — Nepali E-Commerce Hybrid Recommendation System

Audit date: 2026-07-10. Read-only audit — no code was modified. All numbers below are quoted verbatim from files in the repository or from a local, read-only execution of the existing pretrained model / test suite. Nothing was invented.

The repo contains **two parallel projects**:
- `baseline-model/` — an earlier, simpler backend (baseline recommender only, plus a copy of the same `recommender/` package).
- `hybrid-model/` — the active thesis project (hybrid recommender, evaluation suite, "NepKart" storefront, thesis dashboard). This is where almost all real work and results live.

Unless stated otherwise, sections below describe `hybrid-model/`.

---

## 1. FILE TREE

```
.
├── README.md                                    — root thesis README (abstract, methodology, results table, run instructions)
├── .ipynb_checkpoints/README-checkpoint.md       — stale Jupyter autosave of an older README (UNCLEAR relevance, likely safe to ignore/delete)
│
├── baseline-model/
│   ├── backend/
│   │   ├── api/main.py                           — FastAPI app factory (baseline only, no hybrid)
│   │   ├── api/routes/{health,products,recommendations,users}.py — REST endpoints
│   │   ├── api/config.py, api/dependencies.py, api/schemas.py
│   │   ├── db/models.py, db/session.py, db/migrations/env.py — SQLAlchemy models, unused at runtime (see §2)
│   │   ├── jobs/{celery_app,precompute,retrain}.py — Celery task stubs
│   │   ├── recommender/baseline.py               — BaselineRecommender (recency-sorted, no personalization)
│   │   ├── recommender/content_based.py           — TF-IDF + cosine similarity (identical to hybrid-model's copy)
│   │   ├── recommender/collaborative.py           — SVD collaborative filtering (identical to hybrid-model's copy)
│   │   ├── recommender/hybrid.py                  — hybrid class present but differs from hybrid-model's version (older/simpler; not exposed via this backend's API)
│   │   ├── recommender/evaluator.py, recommender/utils.py
│   │   ├── generate_dataset.py                    — synthetic dataset generator (same generation logic as hybrid-model's)
│   │   ├── nepali_ecommerce_data/{products,users,interactions}.csv — dataset copy
│   │   ├── notebooks/01_EDA…05_evaluation.ipynb   — notebook shells, largely unexecuted (see §6)
│   │   ├── tests/unit/test_baseline.py, tests/integration/test_api.py
│   │   └── pyproject.toml, poetry.lock, Makefile, Dockerfile.api, Dockerfile.worker, docker-compose.yml
│   └── frontend/                                  — separate minimal Next.js UI (ProductCarousel, RecommendationCard, SimilarItems); no dashboard/metrics UI
│
├── hybrid-model/
│   ├── backend/
│   │   ├── api/main.py                            — FastAPI app factory; loads/trains HybridRecommender + BaselineRecommender at startup, optional Redis cache
│   │   ├── api/routes/health.py                   — `/health`
│   │   ├── api/routes/products.py                 — `/api/v1/products`, `/api/v1/products/{id}` (currently modified in working tree, see git status)
│   │   ├── api/routes/recommendations.py           — `/api/v1/recommend/user/{id}`, `/baseline/user/{id}`, `/product/{id}/similar`, `/popular`, `/batch`, `/interact`
│   │   ├── api/routes/users.py                     — user list endpoint
│   │   ├── api/config.py                           — pydantic-settings; DB/Redis URLs, CACHE_TTL, COLD_START_THRESHOLD=3
│   │   ├── api/schemas.py, api/dependencies.py
│   │   ├── db/models.py                            — SQLAlchemy ORM models (Product, User, Interaction, CachedRecommendation) — **defined but never connected**: `api/main.py` lifespan never opens a DB session; `app.state.db_connected` is hardcoded `False`. Data is served entirely from in-memory pandas DataFrames loaded from CSV.
│   │   ├── db/session.py, db/migrations/env.py
│   │   ├── jobs/celery_app.py, jobs/precompute.py, jobs/retrain.py — Celery tasks for nightly retrain / cache precompute; no evidence they are scheduled or have ever run (no Celery beat config, no logs)
│   │   ├── recommender/baseline.py                 — BaselineRecommender: most-recent-interaction sort, no personalization
│   │   ├── recommender/content_based.py            — ContentBasedRecommender: TF-IDF + cosine similarity
│   │   ├── recommender/collaborative.py            — CollaborativeRecommender: mean-centered SVD (`scipy.sparse.linalg.svds`) with popularity fallback
│   │   ├── recommender/hybrid.py                   — HybridRecommender: adaptive-α blend of CF/CB + festival boost + freshness boost
│   │   ├── recommender/evaluator.py                — Evaluator: time-split Precision/Recall/NDCG/Coverage/Diversity @K
│   │   ├── recommender/utils.py                    — load_data(), min_max_normalize(), get_popular_products(); contains a code comment "AGENT DECISION: …generated only when the files do not exist" — i.e. an AI coding agent previously modified this fallback behavior
│   │   ├── generate_dataset.py                     — deterministic synthetic dataset generator (`random.seed(42)`, `np.random.seed(42)`)
│   │   ├── evaluation_suite/compare_models.py       — standalone Hit-Rate@10 comparison script; writes evaluation_results.txt
│   │   ├── evaluation_suite/evaluation_results.txt  — **real output** (see §6)
│   │   ├── nepali_ecommerce_data/{products,users,interactions}.csv — primary dataset (500 / 300 / 6,194 rows)
│   │   ├── nepali_ecommerce_data/content_similarity_matrix.npy — cached TF-IDF cosine-similarity matrix (written by ContentBasedRecommender.fit)
│   │   ├── models/hybrid_recommender.pkl            — pretrained, pickled HybridRecommender (5.27 MB, last modified 2025-07-08 per filesystem)
│   │   ├── notebooks/01_EDA.ipynb                   — executed; full EDA with 5 embedded plots (see §7)
│   │   ├── notebooks/02_content_based.ipynb         — executed; 1 code cell, TF-IDF fit + sample recommendations
│   │   ├── notebooks/03_collaborative.ipynb         — executed; 1 code cell, SVD fit + sample recommendations
│   │   ├── notebooks/04_hybrid.ipynb                — executed; 1 code cell, hybrid fit + sample recommendations across months
│   │   ├── notebooks/05_evaluation.ipynb            — executed; **the source of the only Precision/Recall/NDCG/Coverage/Diversity numbers in the repo** (see §6)
│   │   ├── tests/unit/test_{baseline,collaborative,content_based,hybrid}.py — unit tests
│   │   ├── tests/integration/test_api.py, tests/test_api.py — API integration tests
│   │   ├── tests/test_recommenders.py               — small fixture-based recommender tests
│   │   ├── tests/run_advanced_evaluation.py         — RQ1 (paired t-test significance)/RQ2 (latency)/RQ3 (cold-start vs active stratification) script; **prints to stdout only, no output file — no evidence it has ever been run and captured** (see §6)
│   │   └── pyproject.toml, poetry.lock, pytest.ini, Makefile, Dockerfile.api, Dockerfile.worker, docker-compose.yml
│   │
│   └── frontend/                                   — Next.js "NepKart" storefront + thesis dashboard
│       ├── pages/index.tsx                          — storefront home
│       ├── pages/dashboard.tsx                       — **thesis dashboard**: user/month/topK controls, hybrid-vs-baseline comparison, MetricsPanel, AlgorithmExplainer
│       ├── pages/cart.tsx, pages/product/[id].tsx, pages/_app.tsx
│       ├── components/dashboard/{MetricsPanel,AlgorithmExplainer,StatCard}.tsx — MetricsPanel hardcodes the notebook 05 numbers (see §6); AlgorithmExplainer explains α formula/festival/freshness boosts
│       ├── components/storefront/WhyAIWins.tsx      — marketing block hardcoding NDCG@10/Precision@10/Coverage numbers, explicitly commented as "sourced from components/dashboard/MetricsPanel.tsx" (i.e. same real numbers, not independently fabricated)
│       ├── components/storefront/{CategoryNav,FestivalStrip}.tsx
│       ├── components/recommendations/{ProductCard,RecommendationGrid,FestivalBanner}.tsx
│       ├── components/onboarding/PreferenceOnboarding.tsx
│       ├── components/layout/Layout.tsx
│       ├── components/ui/{Navbar,Badge,Skeleton,StoreProductCard}.tsx
│       ├── contexts/CartContext.tsx, contexts/DemoUserContext.tsx — client-side demo-user selection (no real auth; `AuthContext.tsx`/`LoginModal.tsx` were deleted in the current uncommitted working-tree diff)
│       ├── hooks/useRecommendations.ts, hooks/useUserAnalyzer.ts — SWR data-fetching hooks
│       ├── lib/rec-api.ts                            — typed API client
│       └── next.config.js, tailwind.config.js, package.json, tsconfig.json
│
└── .gitignore
```

Note: `hybrid-model/frontend/.next/` (build cache) and both backends' `.pytest_cache/`/`__pycache__/` were excluded above as build artifacts, per the audit scope.

**Uncommitted working-tree state at audit time** (`git status`): `hybrid-model/frontend` has staged deletions of `AuthContext.tsx` and `LoginModal.tsx`, and modifications to Navbar, CartContext, StoreProductCard, cart/product pages, `rec-api.ts`, `useRecommendations.ts`, and `api/routes/products.py` — i.e. an in-progress removal of a JWT-auth flow in favor of the `DemoUserContext` onboarding approach. This audit describes the code as currently on disk (working tree), not the last commit.

---

## 2. ENVIRONMENT & REPRODUCIBILITY

- **Language**: Python `^3.11` (pyproject.toml), confirmed installed: Python 3.11.9.
- **Package manager**: Poetry (`poetry.lock` present, pinned). Key deps from `hybrid-model/backend/pyproject.toml`:
  - fastapi ^0.111.0, uvicorn[standard] ^0.30.0, pydantic ^2.7.0, pydantic-settings ^2.3.0
  - sqlalchemy ^2.0.30, alembic ^1.13.1, asyncpg ^0.29.0 (DB stack — unused at runtime, see §1)
  - redis ^5.0.4, celery ^5.4.0 (optional cache / job stack)
  - scikit-learn ^1.5.0, scipy ^1.13.0, numpy ^1.26.4, pandas ^2.2.2, joblib ^1.4.2
  - dev group: pytest ^8.2.0, pytest-asyncio ^0.23.7, httpx ^0.27.0, jupyter ^1.0.0, matplotlib ^3.9.0, seaborn ^0.13.2
  - `baseline-model/backend/pyproject.toml` has the same dependency set.
- **Frontend**: Next.js/React/TypeScript/Tailwind (`package.json`, `package-lock.json` present — pinned).
- **README with run instructions**: Yes, root `README.md` (also a shorter `hybrid-model/backend/README.md`). Quoted verbatim from root README:

  > ### 1. Train the Model
  > ```bash
  > cd hybrid-model/backend
  > poetry install
  > poetry run python -c "
  > from recommender.hybrid import HybridRecommender
  > from recommender.utils import load_data
  > p, u, i = load_data()
  > m = HybridRecommender().fit(p, u, i)
  > m.save('models/hybrid_recommender.pkl')
  > print('Models trained and saved')
  > "
  > ```
  > ### 2. Start the Backend
  > ```bash
  > cd hybrid-model/backend
  > poetry run uvicorn api.main:app --host 127.0.0.1 --port 8000
  > ```
  > ### 5. Run Evaluation
  > ```bash
  > cd hybrid-model/backend/evaluation_suite
  > poetry run python compare_models.py
  > ```

- **Random seeds**: Fixed. `generate_dataset.py` sets `RANDOM_STATE = 42` and calls `random.seed(RANDOM_STATE)` / `np.random.seed(RANDOM_STATE)` before generating products/users/interactions (deterministic dataset). `recommender/collaborative.py` also calls `np.random.seed(42)` immediately before `scipy.sparse.linalg.svds` (SVD's randomized solver is seeded). No seed is set for the TF-IDF/cosine-similarity path (deterministic algorithm, doesn't need one).
- **Can it run end-to-end today?** Yes, verified directly in this audit:
  - A Poetry virtualenv for `hybrid-model/backend` already exists on this machine (`nepali-rec-system-TbCyp9J3-py3.11`).
  - `poetry run python -m pytest tests/ -q` → **38 passed**, 12 warnings (Pydantic v1-style `Config` deprecation, `python_multipart` import deprecation, a `np.bool_` deprecation warning — none fatal).
  - Loading the committed `models/hybrid_recommender.pkl` and calling `.recommend('U0042', top_k=5)` returns 5 results (smoke test from README passes): `Smoke test passed, sample: P0278 0.6103831282006821`.
  - The `/health`, `/api/v1/recommend/...` endpoints were not live-curled in this audit (no server was started), but `api/main.py`'s lifespan logic is straightforward (load pickle if present, else fit from CSV) and the model/data files it depends on are present.
- **Obvious breakage found**: None blocking. Two things worth flagging:
  1. `recommender/utils.py::load_data()` contains a code comment left by a prior AI coding session: `# AGENT DECISION: The supplied workspace was missing the promised CSVs, so deterministic local data is generated only when the files do not exist.` — i.e. dataset auto-generation was retrofitted at some point; worth being aware of for the "is the data really fixed/reproducible" narrative in the thesis.
  2. `db/`, `jobs/` (Celery/Redis/Postgres) are fully coded but not exercised by any test or verified live — treat as **unverified/aspirational infrastructure**, not confirmed working.

---

## 3. DATASET

- **Present, fully synthetic** (not scraped) — see `hybrid-model/backend/DATASET.md` and root README §"Dataset". The README explicitly states an attempted Daraz.com.np scrape was abandoned because Daraz is a JS SPA with MTOP/Alibaba internal APIs requiring auth tokens and anti-bot bypass, which the authors judged would violate Daraz ToS.
- **Location**: `hybrid-model/backend/nepali_ecommerce_data/{products,users,interactions}.csv` (primary; used by the API and notebooks), duplicated at `baseline-model/backend/nepali_ecommerce_data/`.
- **Generator**: `hybrid-model/backend/generate_dataset.py` (`generate_dataset()`), seeded (`RANDOM_STATE=42`).
- **Actual measured shape** (computed directly from the CSVs in this audit):
  | File | Rows | Columns |
  |---|---|---|
  | products.csv | 500 | 12 |
  | users.csv | 300 | 9 |
  | interactions.csv | 6,194 | 9 |
  - products.csv columns: product_id, name, category, subcategory, brand, description, price_npr, avg_rating, rating_count, tags, is_new_arrival, in_stock.
  - users.csv columns: user_id, name, city, age, gender, user_type, preferred_categories, joined_date, is_verified.
  - interactions.csv columns: interaction_id, user_id, product_id, interaction_type, rating, implicit_score, timestamp, month, is_festival_period.
  - Categories (7): Traditional Attire, Handicrafts & Art, Electronics, Kitchen & Home, Daily Groceries, Fashion & Accessories, Books & Education. Category counts (from executed `01_EDA.ipynb` output): Fashion & Accessories 86, Traditional Attire 76, Electronics 75, Books & Education 71, Handicrafts & Art 70, Daily Groceries 64, Kitchen & Home 58.
  - Interaction type breakdown (from `01_EDA.ipynb` output): view 3,494 (56.4%), cart 1,246 (20.1%), purchase 943 (15.2%), rating 511 (8.2%).
  - Timestamp range (computed in this audit): 2024-01-01 to 2025-06-03.
  - `rating` column: 5,683/6,194 missing (91.75%) — only the "rating" interaction type populates it; view/cart/purchase leave it null (expected given implicit-feedback design).
  - Festival-period interactions: 727/6,194 = 11.7% (from `01_EDA.ipynb`).
  - New-arrival products: 75/500 = 15% (from `01_EDA.ipynb`).
  - Users: mean 20.65 interactions/user, std 4.42, min 9, max 34 (from `01_EDA.ipynb` `.describe()` output).
- **Sparsity** (from `01_EDA.ipynb`'s own computed output, using unique user-product pairs): 6,066 observed pairs / 150,000 possible pairs → density 4.044%, **sparsity 95.956%**. (A quick independent recomputation in this audit using raw interaction rows instead of unique pairs gives ~95.87% — consistent to within rounding/method choice; the notebook's own number is the one to cite.)
- **Assumptions baked into the generator** (from reading `generate_dataset.py`): 7 fixed categories/subcategories, 6 fixed brand names, price drawn from a fixed discrete NPR set (350–14,500), rating ~ Normal(4.0, 0.55) clipped to [2.2, 5.0], 75 products randomly flagged `is_new_arrival`, users' `joined_date` uniform over a 720-day window from 2023-01-01, interaction type sampled with fixed weights `[view 0.56, cart 0.2, purchase 0.16, rating 0.08]`, interaction timestamps uniform over a 520-day window from 2024-01-01, festival flag = month in {10, 11}. This is a **statistically simulated dataset**, not observed user behavior — the thesis should describe it as such (the project's own `DATASET.md` already does, calling it a "Smart Data for Small Markets" simulation).

---

## 4. MODEL COMPONENTS

**a. Baseline (non-personalized / popularity ranking) — EXISTS**
- File: `hybrid-model/backend/recommender/baseline.py`, class `BaselineRecommender`.
- Technique: sorts the product catalog by **most recent interaction timestamp** per product (recency ranking), not popularity-by-count. Same list returned to every user (no personalization). Excludes out-of-stock products by default.
- Params: none tunable; `top_k` only.

**b. Content-based — EXISTS**
- File: `recommender/content_based.py`, class `ContentBasedRecommender`.
- Technique: builds a text field from `description + tags×3 + category + subcategory + brand`, vectorizes with `sklearn.feature_extraction.text.TfidfVectorizer(max_features=3000, ngram_range=(1,2), stop_words="english", min_df=2)`, computes full pairwise `cosine_similarity` matrix, persists it to `nepali_ecommerce_data/content_similarity_matrix.npy`. Recommends by looking up the most-similar rows to a seed product (the user's most recent interaction, or an explicit seed).

**c. Collaborative filtering — EXISTS**
- File: `recommender/collaborative.py`, class `CollaborativeRecommender`.
- Technique: builds a user×item matrix of mean implicit scores, mean-centers it per user, and runs **Truncated SVD** via `scipy.sparse.linalg.svds(sparse, k=latent_k)` with `latent_k = min(20, min(matrix.shape) - 1)` (so k=20 factors given the 300×500 matrix), reconstructs `u @ diag(sigma) @ vt + user_means`, clips to [0, 5]. Seeded (`np.random.seed(42)`) immediately before `svds`. Falls back to a popularity ranking (`get_popular_products`, 0.6·normalized interaction-count + 0.4·normalized avg-rating) for users with <3 interactions or unseen users.

**d. Hybrid combiner — EXISTS**
- File: `recommender/hybrid.py`, class `HybridRecommender`.
- Formula (exact, from code): `hybrid_score = alpha * cf_score + (1 - alpha) * cb_score`, then `+0.08` if the product `is_new_arrival` (freshness boost), then `+0.25` if `month in {10, 11}` and category is in a fixed festival-category set (Traditional Attire, Kitchen & Home, Handicrafts & Art, Daily Groceries, Traditional Gifts, Electronics).
- **α is a fixed formula, not tuned**: `alpha = U_c / (U_c + gamma)` where `U_c` = the user's interaction count and `gamma = COLD_START_THRESHOLD = 3` (class constant, hardcoded). For new-arrival products, α is additionally halved (`alpha *= 0.5`) to favor content-based scoring. There is **no grid search, cross-validation, or optimization procedure for α or γ anywhere in the repo** — γ=3 and the two boost constants (0.08, 0.25) are authored constants, not learned/tuned values.
- CF scores are min-max normalized to [0,1] before blending; CB (cosine similarity) scores are already in [0,1].

---

## 5. EVALUATION HARNESS

- **Train/test split**: Two different splits exist depending on which script is used:
  1. `recommender/evaluator.py` (`Evaluator.evaluate`, used by `05_evaluation.ipynb` and the dashboard's real numbers) uses a **fixed calendar-date split**: `test = interactions[timestamp >= 2025-01-01]`, and evaluates the model's live recommendations against that held-out set. **Important caveat**: in `05_evaluation.ipynb`, `HybridRecommender.fit()` is called on the **full** `interactions` DataFrame (not a train-only subset) before evaluation — i.e., the model was fit on data that includes the test period. This is train/test **leakage**, not a clean 80/20 split. (See Top Priorities.)
  2. `evaluation_suite/compare_models.py` uses a different, cleaner scheme: sort by `(user_id, timestamp)`, hold out each user's **last interaction** (leave-one-out), train on the remainder, and measure Hit Rate@10 on a 100-user subset. This one does properly separate train/test.
  - Neither script implements a literal **80/20 percentage split**; both are time/leave-one-out based. The root README's abstract doesn't claim an 80/20 split — that requirement in this audit's target checklist is **MISSING** as literally specified (a fixed-date and a leave-one-out split exist instead).
- **Metrics implemented**: Precision@K, Recall@K, NDCG@K, catalog Coverage, intra-list Diversity (all in `Evaluator.evaluate`, for K ∈ {5,10,20}); Hit Rate@10 (in `compare_models.py`); paired t-test on NDCG@10 (in `tests/run_advanced_evaluation.py`, RQ1) — see caveat below.
- **Cold-start / sparsity experiment**: `tests/run_advanced_evaluation.py::run_rq3_stratification()` **exists as code** — it splits test users into "active" (>3 train interactions) vs "cold" (≤3 or zero train interactions) and reports Precision/Recall/NDCG/Coverage per segment. **However**, there is no saved output, log, or notebook cell showing this was ever actually executed (see §6) — code EXISTS, **executed result is MISSING**.

---

## 6. ACTUAL RESULTS (verbatim, with source)

Two independent, real result sets exist. They do not perfectly agree with each other because they use different splits/methodologies (see §5) — this is worth explicitly noting in the thesis rather than picking one silently.

**A. `hybrid-model/backend/evaluation_suite/evaluation_results.txt`** (leave-one-out Hit Rate@10, 100 test users, generated by `compare_models.py`):
```
Evaluation Results (Hit Rate @ 10)
Baseline: 0.0200
Hybrid AI: 0.0300
Improvement: +50.0%
```

**B. `hybrid-model/backend/notebooks/05_evaluation.ipynb`** (executed cell outputs; fixed-date split test ≥ 2025-01-01, 299 users evaluated — note this run has the train/test leakage caveat from §5):

Hybrid:
```
K | Precision | Recall | NDCG | Coverage | Diversity | Users
--|-----------|--------|------|----------|-----------|------
5 | 0.059 | 0.044 | 0.053 | 0.638 | 0.301 | 299
10 | 0.054 | 0.082 | 0.065 | 0.894 | 0.353 | 299
20 | 0.043 | 0.133 | 0.087 | 0.936 | 0.408 | 299
```
Baseline:
```
K | Precision | Recall | NDCG | Coverage | Diversity | Users
--|-----------|--------|------|----------|-----------|------
5 | 0.019 | 0.015 | 0.021 | 0.010 | 0.900 | 299
10 | 0.017 | 0.027 | 0.025 | 0.020 | 0.800 | 299
20 | 0.018 | 0.060 | 0.039 | 0.040 | 0.858 | 299
```

These notebook-B numbers are the ones surfaced in the UI: `frontend/components/dashboard/MetricsPanel.tsx` hardcodes exactly this table, and `frontend/components/storefront/WhyAIWins.tsx` derives "NDCG@10 +160% (0.065 vs 0.025)", "Precision@10 +218% (0.054 vs 0.017)", "Catalog Coverage +4370% (0.894 vs 0.020)" from it — these percentages check out arithmetically against the quoted numbers and are traceable to a real executed notebook, not fabricated.

**C. `notebooks/01_EDA.ipynb`** — descriptive stats only (already quoted in §3): 500/300/6,194 rows, category counts, interaction-type breakdown, sparsity 95.956%, per-user interaction count mean 20.65/std 4.42.

**D. `tests/run_advanced_evaluation.py` (RQ1 significance / RQ2 latency / RQ3 cold-start stratification): NO CAPTURED RESULTS EXIST.** The script prints formatted markdown tables to stdout and never writes to a file; no log, notebook, or results file in the repo contains its output. Statement in the thesis that these RQs have been empirically answered would **not** be supported by anything currently in the repo — the code exists, the numbers do not.

**E. Baseline-model's own notebooks** (`baseline-model/backend/notebooks/*.ipynb`): checked — only 1 has 10 executed code cells and it's inconclusive without deeper inspection, but no separate results table or results file exists under `baseline-model/` (no `evaluation_suite` there at all). Treat `baseline-model/` as superseded by `hybrid-model/` for any results claims.

---

## 7. FIGURES / VISUALS

- `notebooks/01_EDA.ipynb` contains **5 embedded PNG plots** (base64-encoded inside the notebook JSON, confirmed present in this audit) — not exported as standalone image files anywhere in the repo:
  1. Top-10 products by interaction count, bar chart colored by category.
  2. Distribution of interaction counts per user (histogram + KDE).
  3. Product count by category (bar chart).
  4. Festival-period vs non-festival interaction counts (bar chart).
  5. New-arrival vs established product counts (bar chart).
- No `.png`/`.jpg`/`.svg` files exist anywhere in the repository (confirmed by glob search) — all visuals are notebook-embedded only.
- The frontend dashboard (`MetricsPanel.tsx`) renders the Precision/Recall/NDCG/Coverage/Diversity comparison as an interactive HTML bar-comparison table (not a static chart image), driven by the hardcoded numbers from §6.

---

## 8. GAP ANALYSIS

| Item | Status | Note |
|---|---|---|
| Baseline model | **Done** | `recommender/baseline.py`, recency-sort, tested (`tests/unit/test_baseline.py`) |
| Content-based | **Done** | TF-IDF + cosine similarity, tested |
| Collaborative | **Done** | SVD (`scipy.sparse.linalg.svds`), tested |
| Hybrid combiner | **Done** | Weighted α blend + boosts, tested |
| α tuning | **Missing** | α follows a fixed, hand-authored saturation formula; γ=3 and the two boost constants are not tuned via any search/CV in the repo |
| 80/20 time-series eval | **Partial** | A fixed-date split (test ≥ 2025-01-01) and a leave-one-out split both exist, but neither is a literal 80/20 percentage split; the fixed-date split also has train/test leakage in the notebook run that produced the headline numbers |
| Precision@K | **Done** | Implemented in `Evaluator`, real numbers produced for K=5,10,20 |
| Cold-start experiment | **Partial** | `run_rq3_stratification()` code exists and is well-designed (active vs cold-start segments), but has never been executed with saved output |
| Reproducible run | **Done** | Verified in this audit: `poetry run pytest` → 38/38 pass; pretrained pickle loads and serves recommendations; dataset generation is seeded |
| README | **Done** | Root README + backend READMEs, with copy-pasteable run commands (verified working) |
| Requirements pinned | **Done** | `poetry.lock` + caret-pinned `pyproject.toml`, `package-lock.json` for frontend |
| Figures for results | **Partial** | 5 EDA plots exist embedded in a notebook; no exported image files, and no chart specifically visualizing the Precision/Recall/NDCG hybrid-vs-baseline comparison (only an HTML table in the dashboard) |

---

## 9. TOP PRIORITIES (ordered by impact on thesis defensibility)

1. **Fix the train/test leakage in the headline evaluation run.** The numbers quoted everywhere in the UI and likely to be quoted in the thesis (Precision/Recall/NDCG@K from `05_evaluation.ipynb`) come from a model **fit on the full dataset including the test period**, then evaluated against `timestamp >= 2025-01-01`. Re-run with the model fit only on `timestamp < 2025-01-01` (the split `run_advanced_evaluation.py` already uses correctly) and regenerate the table. This is the single biggest threat to defensibility — a reviewer who reads the code will find this immediately.
2. **Actually run and capture `run_advanced_evaluation.py` (RQ1/RQ2/RQ3).** It's the only script that computes statistical significance (paired t-test) and a real cold-start-vs-active stratification, both of which are exactly what a thesis needs — but right now it has never been executed and saved. Run it, save stdout to a results file, and cite it.
3. **Reconcile the two evaluation methodologies and pick one primary metric story.** Right now the repo has Hit Rate@10 (0.02 vs 0.03, +50%) from one script and Precision/Recall/NDCG@10 (0.017 vs 0.054, +218%) from another, on different splits. Presenting both without explanation looks like cherry-picking; the thesis needs one clearly justified primary evaluation protocol, with the other as a secondary/sensitivity check.
4. **Decide on and either wire up or remove the DB/Celery/Redis infrastructure.** `db/models.py`, `jobs/retrain.py`, `jobs/precompute.py` are fully coded but confirmed unused at runtime (`db_connected` is hardcoded False, no scheduled Celery beat). If the thesis's "Infrastructure" RQ2 claims a caching/precompute architecture, it should either be demonstrated running, or clearly scoped as "designed but not deployed."
5. **Do an honest α-tuning pass (or explicitly justify why γ=3 was chosen).** The formula `α = U_c/(U_c+γ)` and the freshness/festival boost constants (0.08, 0.25) are currently unmotivated hand-picked numbers. Even a small ablation (e.g., sweep γ ∈ {1,3,5,10} and re-report Precision/NDCG@10 per value) would substantially strengthen the "Adaptive Alpha Weighting" section of the methodology, which currently reads as a design choice rather than an empirical finding.
