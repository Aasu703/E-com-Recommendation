# Migration notes: real auth + live per-user recommendations

Every file added or changed to turn NepKart from a persona-dropdown demo into a storefront where a real logged-in user's own clicks drive the hybrid recommender live, and why. `baseline-model/` and `recommender/` are untouched throughout.

## Backend — added

- `backend/api/auth.py` — password hashing (passlib/bcrypt), JWT encode/decode (python-jose), `app_users.json` load/save (atomic), `RU####` id minting, `get_current_user`/`get_optional_user` FastAPI deps, cold-start seeding (`seed_new_user`), and startup replay (`replay_live_state`).
- `backend/api/routes/auth.py` — `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- `backend/api/routes/account.py` — `GET/PUT /account/preferences`, `GET/POST /account/orders` (auth-required).
- `backend/api/recommend_blend.py` — cold-start category blending for `GET /recommend/user/{id}`, entirely in `api/`, reusing the recommender's own `cb.recommend()` and `_compute_alpha()` unmodified.
- `backend/tests/unit/test_auth.py` — password hashing, JWT round-trip, `RU####` minting, duplicate email/invalid category rejection.
- `backend/tests/integration/test_auth_flow.py` — register → onboard → recommend → interact → recommendations change → restart-replay.

## Backend — changed

- `backend/api/config.py` — added `APP_USERS_FILE`, `LIVE_INTERACTIONS_FILE`, `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`.
- `backend/api/main.py` — wires the `auth`/`account` routers; calls `replay_live_state()` and creates `app.state.app_users_lock` after the existing fit/load block.
- `backend/api/schemas.py` — added `RegisterRequest`, `LoginRequest`, `UserProfile`, `AuthResponse`; `InteractionRequest.user_id` made optional (JWT can supply it instead).
- `backend/api/routes/recommendations.py` — `GET /recommend/user/{id}` now checks `is_cold_start()` and calls the blend for real users below the interaction threshold; adds `context.user_interaction_count`/`context.alpha_avg` (no schema break — `context` was already a free dict) for the frontend's α badge. `POST /interact` now resolves the user from a bearer token when present (falling back to the body `user_id` for `/demo`), validates `interaction_type` against `{view, click, add_to_cart, purchase}`, and persists real (`RU`-prefixed) rows to `live_interactions.csv`.
- `backend/api/routes/products.py` — added `category`/`q`/`min_price`/`max_price`/`in_stock`/`sort`/`page`/`limit` query params and a `GET /products/categories` endpoint for the new catalogue page.
- `backend/pyproject.toml` / `poetry.lock` — added `python-jose[cryptography]`, `passlib[bcrypt]`, and pinned `bcrypt==4.0.1` (passlib 1.7.4's bcrypt backend self-test crashes on bcrypt>=4.1).
- `backend/.env.example` — documents the four new settings.
- `backend/.gitignore` — excludes `app_users.json`/`live_interactions.csv` (runtime state, not thesis data).
- `backend/Makefile` — added a `dev` target that starts backend + frontend together.
- `backend/README.md` — documents the new routes, the auth/persistence design, cold-start seeding, and the honest limitations of "live" adaptation.

## Frontend — added

- `frontend/contexts/AuthContext.tsx` — token/user state, `login`/`register`/`logout`.
- `frontend/contexts/CartGateContext.tsx` — pending-product state for the gated add-to-cart flow.
- `frontend/components/auth/AuthGateModal.tsx` — inline login/register (mounted once in `_app.tsx`); completes the pending cart add automatically on success.
- `frontend/components/recommendations/AlphaBadge.tsx` — reads `context.alpha_avg`/`context.user_interaction_count` from the hybrid response.
- `frontend/hooks/useRequireAuth.ts` — redirects to `/login?next=<path>` once auth state settles with no user.
- `frontend/pages/login.tsx`, `frontend/pages/register.tsx` — real auth pages; register's step 2 reuses `PreferenceOnboarding` in `mode="register"`.
- `frontend/pages/demo.tsx` — the persona-switcher, unchanged in behaviour, relocated out of the public Navbar; not linked anywhere in the storefront.
- `frontend/pages/checkout.tsx` — payment step + `POST /account/orders` + `purchase` interactions + confirmation (split out of the old single-page `cart.tsx`).
- `frontend/pages/account.tsx` — profile, editable preferred categories, order history.
- `frontend/pages/products/index.tsx` — full catalogue: category filter, price sort, in-stock filter, `?q=` search.

## Frontend — changed

- `frontend/lib/rec-api.ts` — module-level bearer token (`setAuthToken`), auth/account/catalogue API functions; `logInteraction` now goes through the same `fetchJson` (and so carries the token) instead of a separate raw `fetch`.
- `frontend/hooks/useRecommendations.ts` — `useHybridRecommendations`/`useBaselineRecommendations` accept `userId: string | null` (guests skip the request instead of it firing with an empty id); added `useAccountPreferences`, `useAccountOrders`, `useProducts`, `useCategories`.
- `frontend/contexts/CartContext.tsx` — reads the current user from `AuthContext`; storage key is now `cart_items:<user_id>` (was a single global `cart_items` key) and the cart is empty for guests.
- `frontend/components/onboarding/PreferenceOnboarding.tsx` — generalized with an optional `mode: 'demo' | 'register'` prop; `mode="demo"` (the default) is byte-for-byte the original behaviour, so `/demo` is unaffected.
- `frontend/components/ui/Navbar.tsx` — persona `<select>` and "Signed in as…" chrome removed; replaced with Login/Sign up buttons or an account menu (Account, Orders, Logout) driven by `AuthContext`.
- `frontend/components/ui/StoreProductCard.tsx` — add-to-cart is gated behind auth by default (`gated` prop, default `true`); the whole card now also navigates to the product page and logs a `click` interaction (previously it logged a mislabelled `view` and didn't navigate anywhere). `gated={false}` + a `userId` prop preserves `/demo`'s ungated behaviour.
- `frontend/pages/_app.tsx` — `DemoUserProvider` replaced with `AuthProvider` + `CartGateProvider` + `AuthGateModal`; the global `PreferenceOnboarding` mount is removed (it now only renders inside `/demo` and inline during registration).
- `frontend/pages/cart.tsx` — now cart-review only (payment/place-order/success moved to `checkout.tsx`); protected via `useRequireAuth`; per-user cart.
- `frontend/pages/index.tsx` — sources identity from `AuthContext` instead of `DemoUserContext`; guests see a non-personalized "Popular in Nepal" feed instead of "Recommended for You", and the Hybrid-vs-Baseline comparison section only renders for logged-in users; adds the α badge.
- `frontend/pages/product/[id].tsx` — gated add-to-cart; logs one `view` per product per tab session for logged-in users only.

## Why blend cold-start in `api/`, not `recommender/`

`HybridRecommender.recommend()` seeds its content-based score from a single most-recent-interaction product; `ContentBasedRecommender` builds no per-user profile at all. Averaging across a user's multiple category-seed interactions inside `hybrid.py` would change `recommend()`'s output for every user with 2+ interactions — including the frozen thesis evaluation set — forcing a re-run of `results_eval_clean.py`, `run_advanced_evaluation.py`, `gamma_ablation.py`, and every downstream figure/number. `api/recommend_blend.py` instead calls the existing `cb.recommend()` once per category and blends the candidate sets in the API layer, only for real (`RU####`) users below the cold-start threshold. `recommender/` is provably untouched (`git diff --stat -- recommender/` is empty), and `results_eval_clean.py`'s re-run output is byte-identical to what's committed under `results/`.
