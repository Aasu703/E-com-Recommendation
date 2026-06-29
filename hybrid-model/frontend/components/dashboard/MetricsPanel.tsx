/**
 * MetricsPanel — side-by-side accuracy comparison of Hybrid vs Baseline.
 *
 * Displays Precision, Recall, NDCG, Coverage, and Diversity at K = 5, 10, 20
 * using the offline evaluation results from the thesis notebook.
 */

import { useState } from "react";

interface MetricRow {
  metric: string;
  hybrid: number;
  baseline: number;
}

/** Offline evaluation results from notebooks/05_evaluation.ipynb */
const EVALUATION_DATA: Record<number, MetricRow[]> = {
  5: [
    { metric: "Precision",  hybrid: 0.059, baseline: 0.019 },
    { metric: "Recall",     hybrid: 0.044, baseline: 0.015 },
    { metric: "NDCG",       hybrid: 0.053, baseline: 0.021 },
    { metric: "Coverage",   hybrid: 0.638, baseline: 0.010 },
    { metric: "Diversity",  hybrid: 0.301, baseline: 0.900 },
  ],
  10: [
    { metric: "Precision",  hybrid: 0.054, baseline: 0.017 },
    { metric: "Recall",     hybrid: 0.082, baseline: 0.027 },
    { metric: "NDCG",       hybrid: 0.065, baseline: 0.025 },
    { metric: "Coverage",   hybrid: 0.894, baseline: 0.020 },
    { metric: "Diversity",  hybrid: 0.353, baseline: 0.800 },
  ],
  20: [
    { metric: "Precision",  hybrid: 0.043, baseline: 0.018 },
    { metric: "Recall",     hybrid: 0.133, baseline: 0.060 },
    { metric: "NDCG",       hybrid: 0.087, baseline: 0.039 },
    { metric: "Coverage",   hybrid: 0.936, baseline: 0.040 },
    { metric: "Diversity",  hybrid: 0.408, baseline: 0.858 },
  ],
};

const K_VALUES = [5, 10, 20];

function getImprovement(hybrid: number, baseline: number): string {
  if (baseline === 0) return "—";
  const pct = ((hybrid - baseline) / baseline) * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

export function MetricsPanel() {
  const [activeK, setActiveK] = useState(5);
  const rows = EVALUATION_DATA[activeK];

  return (
    <div className="metrics-panel">
      <div className="section-header">
        <div>
          <h2>📊 Model Accuracy Comparison</h2>
          <div className="section-subtitle">
            Offline evaluation — time-based train/test split (test ≥ Jan 2025) · 299 users
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
                    {getImprovement(row.hybrid, row.baseline)}
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
