"""Live latency measurement against a running API backed by a real Redis.

Replaces the previously SIMULATED cache-hit figure (a fixed +0.5 ms constant in
tests/run_advanced_evaluation.py) with an end-to-end measurement:

  * COLD phase  -- the Redis cache is flushed, then 200 distinct users are each
    requested once, so every request is a cache MISS served by full inference.
  * WARM phase  -- the same 200 users are requested again, so every request is a
    cache HIT served from Redis.

Reports mean and P95 latency (ms) for both phases. Requires:
  * Redis running (docker compose up -d redis), and
  * the API running (poetry run uvicorn api.main:app --host 127.0.0.1 --port 8000).

Outputs:
  results/latency_live.csv
  results/latency_live.txt
"""

from __future__ import annotations

import csv
import time
from pathlib import Path

import httpx
import numpy as np
import redis

RESULTS_DIR = Path(__file__).parent / "results"
API = "http://127.0.0.1:8000"
REDIS_URL = "redis://localhost:6379/0"
N = 200
USERS = [f"U{i:04d}" for i in range(1, N + 1)]


def timed_get(client: httpx.Client, user_id: str) -> tuple[float, bool]:
    start = time.perf_counter()
    resp = client.get(f"{API}/api/v1/recommend/user/{user_id}")
    elapsed_ms = (time.perf_counter() - start) * 1000
    resp.raise_for_status()
    return elapsed_ms, bool(resp.json().get("cached", False))


def main() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    r = redis.Redis.from_url(REDIS_URL)
    if r.ping() is not True:
        raise SystemExit("Redis not reachable at " + REDIS_URL)

    with httpx.Client(timeout=60) as client:
        client.get(f"{API}/health").raise_for_status()  # ensure API is up

        # COLD: flush cache, then request each user once (all cache misses).
        r.flushdb()
        cold, cold_cached = [], 0
        for u in USERS:
            ms, cached = timed_get(client, u)
            cold.append(ms)
            cold_cached += int(cached)

        # WARM: request the same users again (all cache hits).
        warm, warm_cached = [], 0
        for u in USERS:
            ms, cached = timed_get(client, u)
            warm.append(ms)
            warm_cached += int(cached)

    cold = np.array(cold)
    warm = np.array(warm)
    mean_cold, p95_cold = float(cold.mean()), float(np.percentile(cold, 95))
    mean_warm, p95_warm = float(warm.mean()), float(np.percentile(warm, 95))
    reduction = (mean_cold - mean_warm) / mean_cold * 100 if mean_cold else 0.0

    lines: list[str] = []

    def emit(text: str = "") -> None:
        print(text)
        lines.append(text)

    emit("=" * 72)
    emit("LIVE LATENCY — measured against live Redis (not simulated)")
    emit("=" * 72)
    emit(f"Requests per phase: {N} | Endpoint: GET /api/v1/recommend/user/{{id}}")
    emit(f"Cache-hit sanity check: cold phase cached responses = {cold_cached}/{N} (expect 0);"
         f" warm phase cached responses = {warm_cached}/{N} (expect {N}).")
    emit()
    emit("Scenario                         | Mean Latency (ms) | P95 Latency (ms)")
    emit("---------------------------------|-------------------|-----------------")
    emit(f"Cache MISS (full inference)      | {mean_cold:10.2f}        | {p95_cold:10.2f}")
    emit(f"Cache HIT (live Redis GET)       | {mean_warm:10.2f}        | {p95_warm:10.2f}")
    emit()
    emit(f"Latency reduction (mean): {reduction:.2f}%")
    emit("This cache-hit figure is a real HTTP round-trip to the API served from a")
    emit("live Redis instance, replacing the earlier simulated +0.5 ms constant.")

    txt_path = RESULTS_DIR / "latency_live.txt"
    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    csv_path = RESULTS_DIR / "latency_live.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["scenario", "mean_latency_ms", "p95_latency_ms", "n_requests", "measurement"])
        writer.writerow(["cache_miss_full_inference", f"{mean_cold:.4f}", f"{p95_cold:.4f}", N, "live"])
        writer.writerow(["cache_hit_live_redis", f"{mean_warm:.4f}", f"{p95_warm:.4f}", N, "live"])

    print(f"\nWrote {txt_path}")
    print(f"Wrote {csv_path}")


if __name__ == "__main__":
    main()
