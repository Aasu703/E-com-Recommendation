# Nepali E-Commerce Hybrid Recommendation Backend

Hybrid API for the thesis recommendation model. This backend combines collaborative filtering, content similarity, cold-start handling, and festival-aware ranking.

## Quick Start

```bash
poetry install
make train
poetry run uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Open `http://localhost:8000/docs` for the API explorer.

## Running the full storefront (backend + frontend)

```bash
make dev
```

Starts the backend on `:8000` (backgrounded) and the frontend (`../frontend`) on `:3000` in the same terminal. To run them separately instead:

```bash
# terminal 1
poetry run uvicorn api.main:app --reload --port 8000
# terminal 2
cd ../frontend && npm run dev
```

`docker-compose.yml` still provisions Postgres/Redis for the (unused-in-production) `db/`/Celery scaffolding; the auth/live-recommendation feature described below does **not** depend on either.

## Main Endpoints

```bash
curl http://localhost:8000/health
curl "http://localhost:8000/api/v1/recommend/user/U0001?top_k=5&month=10"
curl "http://localhost:8000/api/v1/recommend/product/P0001/similar?top_k=5"
```

### Auth (real accounts)

```
POST /api/v1/auth/register   { email, password, name, preferred_categories: string[] (>=3) }
POST /api/v1/auth/login      { email, password }
GET  /api/v1/auth/me         (Authorization: Bearer <token>)
```

### Account (auth required)

```
GET/PUT  /api/v1/account/preferences   { preferred_categories: string[] (>=3) }
GET/POST /api/v1/account/orders        { items: [...], total }
```

### Catalogue

```
GET /api/v1/products              ?category=&q=&min_price=&max_price=&in_stock=&sort=price_asc|price_desc|rating|newest&page=&limit=
GET /api/v1/products/categories
```

### Live interaction loop

```
POST /api/v1/recommend/interact   { product_id, interaction_type: view|click|add_to_cart|purchase, user_id? }
```

Takes the user from the JWT when a bearer token is present; otherwise falls back to the body's `user_id` (this is what `/demo`'s unauthenticated persona-switcher still uses, unchanged).

## Real users, live interactions, and auth

Authentication is deliberately **file-backed, not database-backed** — `db/` (SQLAlchemy) stays exactly as unwired as it already was (see `api/main.py`'s `db_connected = False`).

- Passwords are hashed with `passlib[bcrypt]`; sessions are `python-jose` JWTs (`api/auth.py`).
- Real accounts live in `nepali_ecommerce_data/app_users.json` (gitignored), written atomically (temp file + `os.replace`) under an `asyncio.Lock`. Real user ids are minted as `RU0001`, `RU0002`, … — a disjoint namespace from the simulated dataset's `U0001…U0300`, so they can never collide.
- Every real interaction (`view`/`click`/`add_to_cart`/`purchase`) is appended to `nepali_ecommerce_data/live_interactions.csv` (gitignored) in addition to the in-memory `HybridRecommender.interactions_df` — **never** to `interactions.csv`, which stays exactly what `results_*.py` evaluates against.
- On startup, after the model is fit/loaded exactly as before, `api/auth.replay_live_state()` merges `app_users.json` into `users_df` and `live_interactions.csv` into `interactions_df`, and recomputes `cf.user_interaction_counts` from that merged set (excluding `preference_seed` rows, see below) — so a restart doesn't wipe a real user's account, cart-independent order history, or learned profile. This never re-fits the CF/CB sub-models; see "Honest limitations" below.

## Cold-start seeding (registration)

`recommender/` is **never modified** by this feature. `ContentBasedRecommender` builds no per-user profile at all — it's pure product-to-product similarity, and `HybridRecommender.recommend()` seeds its content-based score from a single "most-recent-interaction" product. That's fine for an established user, but useless for someone who has just picked 3 categories and has no interactions yet.

Two things happen at `POST /api/v1/auth/register`, both in `api/`, not in `recommender/`:

1. **Seeding** (`api/auth.seed_new_user`): one synthetic interaction per chosen category is added, against that category's current most-popular product, tagged `interaction_type="preference_seed"` with a low `implicit_score` of `0.5`. These rows are excluded from `cf.user_interaction_counts` (so the α badge honestly reads "0 interactions" right after signup, not a pre-inflated count) and are never written to `interactions.csv`.
2. **Blending** (`api/recommend_blend.py`): because the shipped model only ever seeds CB from a *single* product, a brand-new user's first `GET /recommend/user/{id}` would otherwise be dominated by whichever category happened to seed last. Instead, for any real user below the cold-start threshold with preferences set, this module calls the recommender's own `cb.recommend()` once per chosen category and round-robin interleaves the results — then scores each item with the recommender's own, completely unmodified `_compute_alpha()`/hybrid formula. The result: the first "Recommended for You" grid is genuinely spread across all of a new user's chosen categories, without a single line of `recommender/` changing, and without needing to re-run any thesis evaluation script.

As they click, `POST /interact` increments `cf.user_interaction_counts` exactly as it always has, `_compute_alpha` shifts them toward collaborative filtering, and they fall out of the cold-start blend path once their count reaches `COLD_START_THRESHOLD` (default 3).

## Honest limitations of "live" adaptation

- **The SVD factors are not refit per request.** `CollaborativeRecommender.predictions_df` (the actual matrix-factorization scores) stays exactly as it was at the last `HybridRecommender.fit()`/`jobs/retrain.py` run. Live adaptation happens entirely through: (1) `cf.user_interaction_counts` rising, which shifts `_compute_alpha` toward CF; (2) the growing `interactions_df` changing which product seeds the CB similarity lookup and which products get excluded as "already seen"; and (3) the cold-start category blend above. The UI never claims online matrix retraining.
- Real users' `preferred_categories` are stored in the same pipe-delimited string format as `users.csv`, but `preferred_categories` itself is (as before) inert to `recommender/` — it's only ever read by the `api/` cold-start blend, not by `ContentBasedRecommender`.

The matching frontend lives in `../frontend`.
