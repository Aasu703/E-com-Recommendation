"""Single source of truth for every metric the thesis or UI cites.

Reads the machine-readable result CSVs under results/ and writes BOTH:
  * hybrid-model/frontend/lib/metrics.generated.ts -- typed constants imported
    by the dashboard (MetricsPanel) and storefront (WhyAIWins), and
  * hybrid-model/backend/thesis_assets/thesis_numbers.json -- the full set of
    numbers, each section carrying a "source_file" field for traceability.

Both artefacts are AUTO-GENERATED from the same in-memory structure, so the
frontend and the thesis can never drift from results/. Re-run after any change
to the dataset or evaluation scripts:

    poetry run python scripts/export_metrics.py
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

BACKEND = Path(__file__).resolve().parent.parent
RESULTS = BACKEND / "results"
FRONTEND_LIB = BACKEND.parent / "frontend" / "lib"
THESIS_ASSETS = BACKEND / "thesis_assets"

DATASET_VERSION = "v3"


def load_csv(name: str) -> tuple[str, list[dict]]:
    """Return (repo-relative source path, records) for a results CSV."""
    path = RESULTS / name
    source = f"results/{name}"
    if not path.exists():
        return source, []
    df = pd.read_csv(path)
    records = json.loads(df.to_json(orient="records"))
    return source, records


def section(name: str) -> dict:
    source, rows = load_csv(name)
    return {"source_file": source, "rows": rows}


def row_at(rows: list[dict], **filters):
    for r in rows:
        if all(str(r.get(k)) == str(v) for k, v in filters.items()):
            return r
    return None


def build() -> dict:
    clean = section("clean_eval_results.csv")
    components = section("components_eval.csv")
    eval80 = section("eval_80_20.csv")
    significance = section("significance_tests.csv")
    alpha = section("alpha_strategy_ablation.csv")
    gamma = section("gamma_ablation.csv")
    cold = section("cold_items.csv")
    latency = section("latency_live.csv")

    # ---- UI convenience views (derived, so the components stay declarative) ----
    hvb = []
    metric_labels = [
        ("Precision", "precision"), ("Recall", "recall"), ("NDCG", "ndcg"),
        ("Coverage", "coverage"), ("Diversity", "diversity"),
    ]
    for k in (5, 10, 20):
        h = row_at(clean["rows"], model="Hybrid", k=k)
        b = row_at(clean["rows"], model="Baseline", k=k)
        if not h or not b:
            continue
        hvb.append({
            "k": k,
            "rows": [{"metric": label, "hybrid": h[key], "baseline": b[key]} for label, key in metric_labels],
        })

    h10 = row_at(clean["rows"], model="Hybrid", k=10) or {}
    b10 = row_at(clean["rows"], model="Baseline", k=10) or {}
    cold_hybrid_on = row_at(cold["rows"], model="Hybrid", freshness_boost="true") or \
        row_at(cold["rows"], model="Hybrid", freshness_boost="True") or {}
    cold_baseline = row_at(cold["rows"], model="Baseline") or {}
    sig_prec = row_at(significance["rows"], comparison="Hybrid vs Baseline", metric="Precision@10") or {}

    headline = {
        "n_users": h10.get("n_users_evaluated"),
        "protocol": "Leak-free time split (train < 2025-01-01, test >= 2025-01-01)",
        "coverage_at_10": {"hybrid": h10.get("coverage"), "baseline": b10.get("coverage")},
        "precision_at_10": {"hybrid": h10.get("precision"), "baseline": b10.get("precision")},
        "ndcg_at_10": {"hybrid": h10.get("ndcg"), "baseline": b10.get("ndcg")},
        "cold_item_coverage": {
            "hybrid": cold_hybrid_on.get("cold_item_coverage"),
            "baseline": cold_baseline.get("cold_item_coverage"),
        },
        "accuracy_significance": {
            "comparison": "Hybrid vs Baseline",
            "metric": "Precision@10",
            "p_ttest": sig_prec.get("p_ttest"),
            "verdict": "not statistically significant" if (sig_prec.get("p_ttest") or 1) >= 0.05 else "significant",
        },
    }
    lat_miss = row_at(latency["rows"], scenario="cache_miss_full_inference") or {}
    lat_hit = row_at(latency["rows"], scenario="cache_hit_live_redis") or {}
    headline["latency_ms"] = {
        "cache_miss_mean": lat_miss.get("mean_latency_ms"),
        "cache_hit_mean": lat_hit.get("mean_latency_ms"),
        "measurement": "live Redis" if lat_hit else "not measured",
    }

    return {
        "_meta": {
            "generated_by": "scripts/export_metrics.py",
            "dataset_version": DATASET_VERSION,
            "note": "AUTO-GENERATED. Do not edit by hand. Every number is traceable "
                    "to the source_file named in its section.",
        },
        "clean_eval": clean,
        "components_eval": components,
        "eval_80_20": eval80,
        "significance": significance,
        "alpha_strategy": alpha,
        "gamma_ablation": gamma,
        "cold_items": cold,
        "latency": latency,
        "ui": {"hybrid_vs_baseline": hvb, "headline": headline},
    }


def write_json(metrics: dict) -> Path:
    THESIS_ASSETS.mkdir(parents=True, exist_ok=True)
    path = THESIS_ASSETS / "thesis_numbers.json"
    path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    return path


def write_ts(metrics: dict) -> Path:
    FRONTEND_LIB.mkdir(parents=True, exist_ok=True)
    path = FRONTEND_LIB / "metrics.generated.ts"
    body = json.dumps(metrics, indent=2)
    ts = (
        "// AUTO-GENERATED by hybrid-model/backend/scripts/export_metrics.py.\n"
        "// DO NOT EDIT BY HAND. Run `poetry run python scripts/export_metrics.py`\n"
        "// (from hybrid-model/backend) to regenerate from results/.\n"
        "// Every number here is traceable to the source_file named in its section.\n\n"
        f"export const THESIS_METRICS = {body} as const;\n\n"
        "export const HYBRID_VS_BASELINE = THESIS_METRICS.ui.hybrid_vs_baseline;\n"
        "export const HEADLINE = THESIS_METRICS.ui.headline;\n"
    )
    path.write_text(ts, encoding="utf-8")
    return path


def main() -> None:
    metrics = build()
    json_path = write_json(metrics)
    ts_path = write_ts(metrics)
    print(f"Wrote {json_path}")
    print(f"Wrote {ts_path}")
    print(f"Headline coverage@10: Hybrid {metrics['ui']['headline']['coverage_at_10']['hybrid']} "
          f"vs Baseline {metrics['ui']['headline']['coverage_at_10']['baseline']}")


if __name__ == "__main__":
    main()
