"""Celery application configuration."""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from api.config import settings

app = Celery("nepali_rec", broker=settings.REDIS_URL.replace("/0", "/1"))
app.conf.beat_schedule = {
    "nightly-retrain": {"task": "jobs.retrain.retrain_models", "schedule": crontab(hour=2, minute=0)},
    "precompute-recs": {"task": "jobs.precompute.precompute_all_user_recs", "schedule": crontab(hour=3, minute=0)},
}
