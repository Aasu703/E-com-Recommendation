# Thesis Recommendation Project

The project is separated into model-specific frontend/backend stacks:

```text
baseline-model/
  backend/    FastAPI app backed by BaselineRecommender
  frontend/   Next.js UI for recent-product baseline recommendations

hybrid-model/
  backend/    FastAPI app backed by HybridRecommender
  frontend/   Next.js UI for personalized hybrid recommendations

nepali-rec-system/  Original backend workspace kept intact
frontend/           Original frontend workspace kept intact
models/             Shared/generated model artifacts
notebooks/          Thesis notebooks
```

Run each backend from its own `backend` folder and each frontend from its matching `frontend` folder.
