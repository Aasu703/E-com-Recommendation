/**
 * ResultsVisualizations — the interactive "thesis results" section of the dashboard.
 *
 * Renders the leak-free evaluation as proper charts instead of a flat table:
 *  1. Headline stat strip (the honest findings)
 *  2. Accuracy — Hybrid vs Baseline (Precision / Recall / NDCG), K-selectable
 *  3. Catalogue coverage — the decisive, business-relevant win
 *  4. Component comparison — all 5 models, metric- and K-selectable
 *  5. γ ablation — Precision & Coverage @10 across γ ∈ {1,3,5,10}
 *  6. Live latency — cache miss vs Redis cache hit
 *  7. Statistical significance + cold-start callouts
 *
 * Every number is read from lib/metrics.generated.ts (auto-generated from
 * results/ by backend/scripts/export_metrics.py). This component holds NO
 * hardcoded metrics, so it can never drift from results/.
 */

import { useState } from "react";

import { THESIS_METRICS, HEADLINE } from "../../lib/metrics.generated";
import { BarChart, HBarChart, LineChart, Legend, ChartCard, Series } from "./Charts";

/* One colour per model, reused everywhere for instant recognition. */
const COLOR = {
  Baseline: "#f59e0b",
  Popularity: "#6b7194",
  ContentBased: "#3b82f6",
  Collaborative: "#22c55e",
  Hybrid: "#6366f1",
} as const;

type ModelName = keyof typeof COLOR;
type MetricKey = "precision" | "recall" | "ndcg" | "coverage" | "diversity";

const METRICS: { key: MetricKey; label: string; rate: boolean }[] = [
  { key: "precision", label: "Precision", rate: false },
  { key: "recall", label: "Recall", rate: false },
  { key: "ndcg", label: "NDCG", rate: false },
  { key: "coverage", label: "Coverage", rate: true },
  { key: "diversity", label: "Diversity", rate: true },
];

const K_VALUES = [5, 10, 20];

/* Formatters: 0–1 "rate" metrics read as %, accuracy metrics as 3 decimals. */
const fmtRate = (n: number) => `${(n * 100).toFixed(0)}%`;
const fmtSmall = (n: number) => n.toFixed(3);

/* ---------- data selectors (pure, over generated metrics) ---------- */

function cleanRow(model: ModelName, k: number) {
  return THESIS_METRICS.clean_eval.rows.find((r) => r.model === model && r.k === k);
}

function componentRow(model: ModelName, k: number) {
  return THESIS_METRICS.components_eval.rows.find((r) => r.model === model && r.k === k);
}

export function ResultsVisualizations() {
  const [k, setK] = useState(10);
  const [metric, setMetric] = useState<MetricKey>("precision");

  /* ---- 2. Accuracy: Hybrid vs Baseline at the chosen K ---- */
  const hy = cleanRow("Hybrid", k);
  const bl = cleanRow("Baseline", k);
  const accSeries: Series[] = [
    {
      name: "Baseline",
      color: COLOR.Baseline,
      values: [bl?.precision ?? 0, bl?.recall ?? 0, bl?.ndcg ?? 0],
    },
    {
      name: "Hybrid",
      color: COLOR.Hybrid,
      values: [hy?.precision ?? 0, hy?.recall ?? 0, hy?.ndcg ?? 0],
    },
  ];

  /* ---- 3. Coverage across all K (the headline win) ---- */
  const covSeries: Series[] = [
    {
      name: "Baseline",
      color: COLOR.Baseline,
      values: K_VALUES.map((kk) => cleanRow("Baseline", kk)?.coverage ?? 0),
    },
    {
      name: "Hybrid",
      color: COLOR.Hybrid,
      values: K_VALUES.map((kk) => cleanRow("Hybrid", kk)?.coverage ?? 0),
    },
  ];

  /* ---- 4. Component comparison: all 5 models on the chosen metric+K ---- */
  const models: ModelName[] = ["Baseline", "Popularity", "ContentBased", "Collaborative", "Hybrid"];
  const activeMetric = METRICS.find((m) => m.key === metric)!;
  // One category per model, one series — coloured per-bar via categoryColors.
  const compSeries: Series[] = [
    {
      name: activeMetric.label,
      color: COLOR.Hybrid,
      values: models.map((m) => componentRow(m, k)?.[metric] ?? 0),
    },
  ];
  const compColors = models.map((m) => COLOR[m]);

  /* ---- 5. γ ablation ---- */
  const gamma = THESIS_METRICS.gamma_ablation.rows;
  const gammaLabels = gamma.map((r) => `γ=${r.gamma}`);

  /* ---- 6. Latency ---- */
  const latency = THESIS_METRICS.latency.rows;

  /* ---- 7. Significance ---- */
  const sig = THESIS_METRICS.significance.rows;
  const cold = THESIS_METRICS.cold_items.rows;

  return (
    <section className="results-viz">
      <div className="section-header">
        <div>
          <h2 className="section-title">📈 Thesis Results — Leak-Free Evaluation</h2>
          <div className="section-subtitle">
            {HEADLINE.protocol} · {HEADLINE.n_users} users. Accuracy is on par with the
            baseline ({HEADLINE.accuracy_significance.verdict}); the Hybrid&apos;s decisive win
            is catalogue coverage and per-user personalisation.
          </div>
        </div>
      </div>

      {/* 1. Headline strip */}
      <div className="viz-headline-grid">
        <HeadlineStat
          label="Coverage @10"
          value={fmtRate(HEADLINE.coverage_at_10.hybrid)}
          sub={`vs ${fmtRate(HEADLINE.coverage_at_10.baseline)} baseline`}
          tone="win"
        />
        <HeadlineStat
          label="Cold-item Coverage"
          value={fmtRate(HEADLINE.cold_item_coverage.hybrid)}
          sub={`vs ${fmtRate(HEADLINE.cold_item_coverage.baseline)} baseline`}
          tone="win"
        />
        <HeadlineStat
          label="Precision @10"
          value={fmtSmall(HEADLINE.precision_at_10.hybrid)}
          sub={`baseline ${fmtSmall(HEADLINE.precision_at_10.baseline)} · p=${HEADLINE.accuracy_significance.p_ttest.toFixed(3)}`}
          tone="parity"
        />
        <HeadlineStat
          label="Cache-hit Latency"
          value={`${HEADLINE.latency_ms.cache_hit_mean.toFixed(1)} ms`}
          sub={`miss ${HEADLINE.latency_ms.cache_miss_mean.toFixed(0)} ms · ${HEADLINE.latency_ms.measurement}`}
          tone="info"
        />
      </div>

      {/* Shared K selector */}
      <div className="viz-controls">
        <span className="viz-controls-label">Top-K</span>
        <div className="metrics-tabs" style={{ marginBottom: 0 }}>
          {K_VALUES.map((kk) => (
            <button
              key={kk}
              className={`metrics-tab ${k === kk ? "active" : ""}`}
              onClick={() => setK(kk)}
            >
              K = {kk}
            </button>
          ))}
        </div>
      </div>

      <div className="viz-grid">
        {/* 2. Accuracy */}
        <ChartCard
          title="Accuracy: Hybrid vs Baseline"
          subtitle={`Precision / Recall / NDCG @${k} — statistically on par`}
          actions={<Legend items={[{ name: "Baseline", color: COLOR.Baseline }, { name: "Hybrid", color: COLOR.Hybrid }]} />}
        >
          <BarChart
            categories={["Precision", "Recall", "NDCG"]}
            series={accSeries}
            format={fmtSmall}
            showValues
            animateKey={`acc-${k}`}
            ariaLabel={`Accuracy metrics for Hybrid and Baseline at K=${k}`}
          />
        </ChartCard>

        {/* 3. Coverage win */}
        <ChartCard
          title="Catalogue Coverage — the headline win"
          subtitle="Share of the catalogue ever recommended, across K"
          actions={<Legend items={[{ name: "Baseline", color: COLOR.Baseline }, { name: "Hybrid", color: COLOR.Hybrid }]} />}
        >
          <BarChart
            categories={K_VALUES.map((kk) => `K=${kk}`)}
            series={covSeries}
            yMax={1}
            format={fmtRate}
            showValues
            animateKey="cov"
            ariaLabel="Catalogue coverage for Hybrid vs Baseline across K"
          />
        </ChartCard>
      </div>

      {/* 4. Component comparison */}
      <ChartCard
        title="Component comparison — all five models"
        subtitle={`${activeMetric.label} @${k} for each recommender in the ablation`}
        actions={
          <div className="metrics-tabs" style={{ marginBottom: 0 }}>
            {METRICS.map((m) => (
              <button
                key={m.key}
                className={`metrics-tab ${metric === m.key ? "active" : ""}`}
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      >
        <BarChart
          categories={models}
          series={compSeries}
          categoryColors={compColors}
          yMax={activeMetric.rate ? 1 : undefined}
          format={activeMetric.rate ? fmtRate : fmtSmall}
          showValues
          animateKey={`comp-${metric}-${k}`}
          ariaLabel={`${activeMetric.label} at K=${k} across five models`}
        />
        <p className="viz-note">
          Each bar is a distinct model. Content-Based shows 0% diversity because it ranks
          within a single similarity neighbourhood; the Hybrid trades a little raw accuracy
          for far broader coverage.
        </p>
      </ChartCard>

      <div className="viz-grid">
        {/* 5. γ ablation */}
        <ChartCard
          title="γ ablation @10"
          subtitle="Cold-start blend weight γ — small monotonic effect on accuracy, larger on coverage"
        >
          <div className="viz-dual">
            <div>
              <div className="viz-mini-title" style={{ color: COLOR.Hybrid }}>Precision</div>
              <LineChart
                xLabels={gammaLabels}
                values={gamma.map((r) => r.precision)}
                color={COLOR.Hybrid}
                format={fmtSmall}
                animateKey="g-prec"
                ariaLabel="Precision at 10 across gamma"
              />
            </div>
            <div>
              <div className="viz-mini-title" style={{ color: COLOR.Collaborative }}>Coverage</div>
              <LineChart
                xLabels={gammaLabels}
                values={gamma.map((r) => r.coverage)}
                color={COLOR.Collaborative}
                format={fmtRate}
                animateKey="g-cov"
                ariaLabel="Coverage at 10 across gamma"
              />
            </div>
          </div>
        </ChartCard>

        {/* 6. Latency */}
        <ChartCard
          title="Live latency"
          subtitle={`Measured over ${latency[0]?.n_requests ?? 0} requests each`}
        >
          <HBarChart
            items={latency.map((r) => ({
              label: r.scenario === "cache_hit_live_redis" ? "Cache hit (Redis)" : "Cache miss (full inference)",
              value: r.mean_latency_ms,
              sub: `p95 ${r.p95_latency_ms.toFixed(1)} ms`,
              color: r.scenario === "cache_hit_live_redis" ? COLOR.Collaborative : COLOR.Baseline,
            }))}
            format={(n) => `${n.toFixed(1)} ms`}
            animateKey="lat"
          />
          <p className="viz-note">
            A live Redis cache hit serves a stored recommendation ~{Math.round(
              (latency.find((r) => r.scenario === "cache_miss_full_inference")?.mean_latency_ms ?? 1) /
                (latency.find((r) => r.scenario === "cache_hit_live_redis")?.mean_latency_ms ?? 1),
            )}× faster than recomputing it.
          </p>
        </ChartCard>
      </div>

      {/* 7. Significance + cold-start */}
      <ChartCard
        title="Statistical significance & cold-start"
        subtitle="Paired tests over per-user Precision@10 / NDCG@10; cold-item exposure"
      >
        <div className="sig-table-wrap">
          <table className="sig-table">
            <thead>
              <tr>
                <th>Comparison</th>
                <th>Metric</th>
                <th>Mean Δ</th>
                <th>p (t-test)</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {sig.map((r) => {
                const significant = r.p_ttest < 0.05;
                return (
                  <tr key={`${r.comparison}-${r.metric}`}>
                    <td>{r.comparison}</td>
                    <td>{r.metric}</td>
                    <td className="mono">{r.mean_diff >= 0 ? "+" : ""}{r.mean_diff.toFixed(4)}</td>
                    <td className="mono">{r.p_ttest.toFixed(4)}</td>
                    <td>
                      <span className={`sig-badge ${significant ? "sig" : "ns"}`}>
                        {significant ? "significant" : "n.s."}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="cold-row">
          {cold
            .filter((c) => c.model === "Hybrid" || c.model === "Baseline")
            .map((c) => (
              <div className="cold-chip" key={`${c.model}-${c.freshness_boost}`}>
                <span className="cold-chip-model" style={{ color: COLOR[c.model as ModelName] }}>
                  {c.model}
                  {c.model === "Hybrid" ? (c.freshness_boost ? " (freshness on)" : " (freshness off)") : ""}
                </span>
                <span className="cold-chip-val">{fmtRate(c.cold_item_coverage)} cold-item coverage</span>
                <span className="cold-chip-sub">{c.mean_cold_items_per_list.toFixed(2)} cold items / list</span>
              </div>
            ))}
        </div>
      </ChartCard>
    </section>
  );
}

/* ---------- headline stat tile ---------- */

function HeadlineStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "win" | "parity" | "info";
}) {
  return (
    <div className={`viz-headline-stat tone-${tone}`}>
      <div className="viz-headline-label">{label}</div>
      <div className="viz-headline-value">{value}</div>
      <div className="viz-headline-sub">{sub}</div>
    </div>
  );
}
