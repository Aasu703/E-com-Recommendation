"""Hybridization-strategy comparison on the clean leak-free split.

The proposal promises "a weighted or switching heuristic". This script compares
all three combination strategies plus a boost ablation, on the same train-only
fit / held-out test split as results_eval_clean.py (train < 2025-01-01), at K=10:

  * FIXED weighted:  constant alpha in {0.0, 0.25, 0.5, 0.75, 1.0}
                     (0.0 = pure CB, 1.0 = pure CF).
  * ADAPTIVE alpha:  alpha = Uc/(Uc+gamma), gamma in {1, 3, 5, 10}.
  * SWITCHING:       pure CB if Uc < gamma else pure CF, gamma in {1, 3, 5}.
  * BOOST ablation:  adaptive(gamma=3) with freshness/festival boosts toggled
                     (both on, freshness off, festival off, both off).

Strategy / alpha / gamma / boost flags only affect HybridRecommender.recommend(),
not fit(), so the CB/CF sub-models are fit once and the configuration is mutated
on the same fitted instance between evaluation passes (equivalent to refitting).
cold_user_fallback is explicitly disabled (False) so every row isolates the
strategy/boost effect without the shipped cold-user popularity fallback (which
triggers only for zero-history users and is orthogonal to these settings).

NOTE on the festival boost: the Evaluator does not pass a month context and the
held-out test window is 2025-01 .. 2025-06 (months 1-6), whereas the festival
boost only fires in months 10-11. The festival boost is therefore INACTIVE on
this test set by construction, so "festival off" rows are identical to their
"festival on" counterparts. This is reported honestly rather than hidden; only
the freshness boost is testable on this window.

Outputs:
  results/alpha_strategy_ablation.csv
  results/alpha_strategy_ablation.txt
"""

from __future__ import annotations

import csv
from pathlib import Path

import pandas as pd

from recommender.evaluator import Evaluator
from recommender.hybrid import HybridRecommender
from recommender.utils import load_data

RESULTS_DIR = Path(__file__).parent / "results"
SPLIT_DATE = pd.Timestamp("2025-01-01")
K = 10


def main() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    products_df, users_df, interactions_df = load_data()
    interactions_df = interactions_df.copy()
    interactions_df["timestamp"] = pd.to_datetime(interactions_df["timestamp"])
    train_df = interactions_df[interactions_df["timestamp"] < SPLIT_DATE].copy()

    hybrid = HybridRecommender(cold_user_fallback=False).fit(products_df, users_df, train_df)
    evaluator = Evaluator()

    # (family, label, strategy, alpha, gamma, freshness, festival)
    configs: list[tuple] = []
    for a in [0.0, 0.25, 0.5, 0.75, 1.0]:
        configs.append(("fixed", f"fixed alpha={a:.2f}", "fixed", a, 3, True, True))
    for g in [1, 3, 5, 10]:
        configs.append(("adaptive", f"adaptive gamma={g}", "adaptive", None, g, True, True))
    for g in [1, 3, 5]:
        configs.append(("switching", f"switching gamma={g}", "switching", None, g, True, True))
    configs.append(("boost", "adaptive gamma=3 boosts:both-on", "adaptive", None, 3, True, True))
    configs.append(("boost", "adaptive gamma=3 boosts:freshness-off", "adaptive", None, 3, False, True))
    configs.append(("boost", "adaptive gamma=3 boosts:festival-off", "adaptive", None, 3, True, False))
    configs.append(("boost", "adaptive gamma=3 boosts:both-off", "adaptive", None, 3, False, False))

    lines: list[str] = []

    def emit(text: str = "") -> None:
        print(text)
        lines.append(text)

    emit("=" * 84)
    emit("HYBRIDIZATION-STRATEGY comparison (clean leak-free split, K=10)")
    emit("=" * 84)
    emit(f"Split date: {SPLIT_DATE.date()} | Train interactions: {len(train_df):,}")
    emit("NOTE: the festival boost is inactive on this test window (months 1-6);")
    emit("      'festival off' rows are identical to 'festival on' by construction.")
    emit()

    rows: list[dict] = []
    current_family = None
    header = "Configuration                          | Precision | Recall | NDCG  | Coverage"
    sep = "---------------------------------------|-----------|--------|-------|---------"
    for family, label, strategy, alpha, gamma, fresh, fest in configs:
        if family != current_family:
            emit()
            emit(f"[{family.upper()}]")
            emit(header)
            emit(sep)
            current_family = family
        hybrid.strategy = strategy
        hybrid.fixed_alpha = 0.5 if alpha is None else float(alpha)
        hybrid.COLD_START_THRESHOLD = gamma
        hybrid.freshness_boost = fresh
        hybrid.festival_boost = fest
        res = evaluator.evaluate(hybrid, interactions_df, products_df, K_values=[K])[K]
        precision = res["precision"]["mean"]
        recall = res["recall"]["mean"]
        ndcg = res["ndcg"]["mean"]
        coverage = res["coverage"]
        emit(f"{label:<38} | {precision:.4f}    | {recall:.4f} | {ndcg:.4f} | {coverage:.4f}")
        rows.append({
            "family": family,
            "config": label,
            "strategy": strategy,
            "alpha": "" if alpha is None else alpha,
            "gamma": gamma,
            "freshness_boost": fresh,
            "festival_boost": fest,
            "k": K,
            "precision": precision,
            "recall": recall,
            "ndcg": ndcg,
            "coverage": coverage,
            "n_users_evaluated": res["n_users_evaluated"],
        })

    emit()
    best_p = max(rows, key=lambda r: r["precision"])
    best_c = max(rows, key=lambda r: r["coverage"])
    emit(f"Highest Precision@{K}: {best_p['config']} ({best_p['precision']:.4f})")
    emit(f"Highest Coverage@{K}: {best_c['config']} ({best_c['coverage']:.4f})")

    txt_path = RESULTS_DIR / "alpha_strategy_ablation.txt"
    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    csv_path = RESULTS_DIR / "alpha_strategy_ablation.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "family", "config", "strategy", "alpha", "gamma", "freshness_boost",
            "festival_boost", "k", "precision", "recall", "ndcg", "coverage", "n_users_evaluated",
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {txt_path}")
    print(f"Wrote {csv_path}")


if __name__ == "__main__":
    main()
