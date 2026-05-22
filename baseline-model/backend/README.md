# Nepali E-Commerce Baseline Recommendation Backend

Baseline API for the thesis comparison model. This backend serves recent-product recommendations without personalization or hybrid scoring.

## Quick Start

```bash
poetry install
poetry run uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Open `http://localhost:8000/docs` for the API explorer.

## Main Endpoints

```bash
curl http://localhost:8000/health
curl "http://localhost:8000/api/v1/recommend/user/U0001?top_k=5"
curl "http://localhost:8000/api/v1/recommend/popular?top_k=5"
```

The matching frontend lives in `../frontend`.
