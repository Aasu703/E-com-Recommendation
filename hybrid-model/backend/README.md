# Nepali E-Commerce Hybrid Recommendation Backend

Hybrid API for the thesis recommendation model. This backend combines collaborative filtering, content similarity, cold-start handling, and festival-aware ranking.

## Quick Start

```bash
poetry install
make train
poetry run uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Open `http://localhost:8000/docs` for the API explorer.

## Main Endpoints

```bash
curl http://localhost:8000/health
curl "http://localhost:8000/api/v1/recommend/user/U0001?top_k=5&month=10"
curl "http://localhost:8000/api/v1/recommend/product/P0001/similar?top_k=5"
```

The matching frontend lives in `../frontend`.
