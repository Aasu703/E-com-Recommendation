# Nepali E-Commerce Hybrid AI Recommendation System

> Personalized product recommendations for Nepal's e-commerce market. Festival-aware. Cold-start resistant. Locally grounded.
> Aayush Subedi (230425)

## Quick Start

```bash
poetry install
make train
make api
```

Open `http://localhost:8000/docs` for the API explorer. The frontend runs from `frontend/` with `npm install && npm run dev`.

## Architecture

```text
CSV data -> recommender package -> FastAPI API -> Next.js widgets
              |                         |
              v                         v
          joblib models             Redis cache
              |
              v
       Celery retrain/precompute -> PostgreSQL audit tables
```

## API Reference

```bash
curl http://localhost:8000/health
curl "http://localhost:8000/api/v1/recommend/user/U0001?top_k=5&month=10"
curl "http://localhost:8000/api/v1/recommend/product/P0001/similar?top_k=5"
```

## Embedding In Your Site

```tsx
import { ProductCarousel } from "./components/recommendations/ProductCarousel";
<ProductCarousel userId="U0001" title="Picks for you" month={10} />
```

## How The Hybrid Model Works

The system combines collaborative filtering and content similarity:
`hybrid_score = alpha * CF + (1 - alpha) * CB`. Alpha rises for power users, falls for new users, drops during Dashain/Tihar for festival categories, and becomes almost pure content for new arrivals.

## Nepal-Specific Design Decisions

The catalog uses Nepali market categories, Nepali cities, local festival months 10 and 11, and cold-start handling for new arrivals that have no interaction history.
