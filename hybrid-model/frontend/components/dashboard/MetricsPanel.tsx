/**
 * MetricsPanel — side-by-side comparison of Hybrid vs Baseline.
 *
 * Displays Precision, Recall, NDCG, Coverage, and Diversity at K = 5, 10, 20.
 * All numbers are imported from lib/metrics.generated.ts, which is auto-generated
 * from the leak-free evaluation results (results/clean_eval_results.csv) by
 * backend/scripts/export_metrics.py — this component holds NO hardcoded metrics,
 * so it can never drift from results/.
 */

import { useState } from "react";
import { HYBRID_VS_BASELINE, HEADLINE } from "../../lib/metrics.generated";

const K_VALUES = HYBRID_VS_BASELINE.map((entry) => entry.k);

function getDelta(hybrid: number, baseline: number): string {
  if (baseline === 0) return "—";
  const pct = ((hybrid - baseline) / baseline) * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

export function MetricsPanel() {
  const [activeK, setActiveK] = useState<number>(K_VALUES[0] ?? 5);
  const rows = HYBRID_VS_BASELINE.find((entry) => entry.k === activeK)?.rows ?? [];

  return (
    <div className="metrics-panel">
      <div className="section-header">
        <div>
          <h2>📊 Hybrid vs Baseline — Leak-Free Evaluation</h2>
          <div className="section-subtitle">
            {HEADLINE.protocol} · {HEADLINE.n_users} users. Accuracy is on par with
            the baseline ({HEADLINE.accuracy_significance.verdict}); the Hybrid&apos;s
            clear win is catalog coverage.
          </div>
        </div>
      </div>

      <div className="metrics-tabs">
        {K_VALUES.map((k) => (
          <button
            key={k}
            className={`metrics-tab ${activeK === k ? "active" : ""}`}
            onClick={() => setActiveK(k)}
          >
            K = {k}
          </button>
        ))}
      </div>

      <table className="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>
              <span className="model-tag baseline">Baseline</span>
            </th>
            <th>
              <span className="model-tag hybrid">Hybrid AI</span>
            </th>
            <th>Hybrid vs Baseline</th>
            <th style={{ width: "30%" }}>Comparison</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const maxVal = Math.max(row.hybrid, row.baseline, 0.001);
            return (
              <tr key={row.metric}>
                <td style={{ fontWeight: 600 }}>{row.metric}</td>
                <td>
                  <span className="metric-value">{row.baseline.toFixed(3)}</span>
                </td>
                <td>
                  <span className="metric-value" style={{ color: "var(--accent-light)" }}>
                    {row.hybrid.toFixed(3)}
                  </span>
                </td>
                <td>
                  <span className="improvement">
                    {getDelta(row.hybrid, row.baseline)}
                  </span>
                </td>
                <td>
                  <div className="metric-bar">
                    <div className="metric-bar-track">
                      <div
                        className="metric-bar-fill baseline"
                        style={{ width: `${(row.baseline / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="metric-bar" style={{ marginTop: 4 }}>
                    <div className="metric-bar-track">
                      <div
                        className="metric-bar-fill hybrid"
                        style={{ width: `${(row.hybrid / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
