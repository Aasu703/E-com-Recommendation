"""Nightly model retraining task."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
import time

from jobs.celery_app import app
from recommender.hybrid import HybridRecommender
from recommender.utils import load_data

logger = logging.getLogger(__name__)


@app.task(name="jobs.retrain.retrain_models")
def retrain_models() -> dict:
    """Retrain and save a dated hybrid model."""
    start = time.time()
    products_df, users_df, interactions_df = load_data()
    model = HybridRecommender().fit(products_df, users_df, interactions_df)
    path = Path("models") / f"hybrid_recommender_{datetime.now():%Y%m%d}.pkl"
    model.save(path)
    model.save(Path("models") / "hybrid_recommender.pkl")
    size = path.stat().st_size
    logger.info("Retrained model in %.2fs with %s interactions; size=%s", time.time() - start, len(interactions_df), size)
    return {"path": str(path), "interactions": len(interactions_df), "size": size}
