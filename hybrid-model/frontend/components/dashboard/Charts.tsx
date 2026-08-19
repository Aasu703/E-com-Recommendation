/**
 * Charts — dependency-free, responsive SVG chart primitives for the thesis dashboard.
 *
 * No charting library: every chart is hand-built inline SVG so it stays fully
 * theme-aware (CSS variables), animates on data change, and adds nothing to
 * package.json. All numbers are passed in by the caller — these components hold
 * NO data of their own, so they can never drift from results/.
 */

import { ReactNode } from "react";

/* ---------- shared helpers ---------- */

export interface Series {
  name: string;
  color: string;
  values: number[];
}

function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * pow;
}

/* ---------- Grouped / simple bar chart ---------- */

interface BarChartProps {
  categories: string[];
  series: Series[];
  /** Fixed upper bound for the y-axis; auto-computed when omitted. */
  yMax?: number;
  height?: number;
  format?: (n: number) => string;
  /** Print each bar's value above it. */
  showValues?: boolean;
  ariaLabel?: string;
  /** Re-mount key so bars replay their entrance animation on change. */
  animateKey?: string | number;
  /** With a single series, colour each category's bar individually. */
  categoryColors?: string[];
}

export function BarChart({
  categories,
  series,
  yMax,
  height = 280,
  format = (n) => n.toFixed(3),
  showValues = false,
  ariaLabel,
  animateKey,
  categoryColors,
}: BarChartProps) {
  const W = 640;
  const H = height;
  const m = { top: 18, right: 14, bottom: 42, left: 52 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const dataMax = Math.max(
    ...series.flatMap((s) => s.values),
    0.0001,
  );
  const top = yMax ?? niceMax(dataMax * 1.12);

  const y = (v: number) => m.top + plotH * (1 - v / top);
  const gridLines = 4;

  const groupW = plotW / categories.length;
  const groupPad = groupW * 0.18;
  const innerW = groupW - groupPad * 2;
  const barW = innerW / series.length;

  return (
    <div className="chart-frame">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* y grid + labels */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const v = (top / gridLines) * i;
          const yy = y(v);
          return (
            <g key={i}>
              <line
                x1={m.left}
                x2={W - m.right}
                y1={yy}
                y2={yy}
                className="chart-grid"
              />
              <text x={m.left - 8} y={yy + 4} className="chart-axis-label" textAnchor="end">
                {format(v)}
              </text>
            </g>
          );
        })}

        {/* bars */}
        <g key={animateKey}>
          {categories.map((cat, ci) => {
            const gx = m.left + groupW * ci + groupPad;
            return (
              <g key={cat}>
                {series.map((s, si) => {
                  const v = s.values[ci] ?? 0;
                  const bx = gx + barW * si;
                  const by = y(v);
                  const bh = Math.max(0, m.top + plotH - by);
                  const fill =
                    series.length === 1 && categoryColors ? categoryColors[ci] ?? s.color : s.color;
                  return (
                    <g key={s.name}>
                      <rect
                        x={bx + barW * 0.08}
                        y={by}
                        width={barW * 0.84}
                        height={bh}
                        rx={3}
                        fill={fill}
                        className="chart-bar"
                        style={{ animationDelay: `${ci * 60 + si * 30}ms` }}
                      >
                        <title>
                          {s.name} · {cat}: {format(v)}
                        </title>
                      </rect>
                      {showValues && v > 0 && (
                        <text
                          x={bx + barW / 2}
                          y={by - 5}
                          className="chart-bar-value"
                          textAnchor="middle"
                        >
                          {format(v)}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text
                  x={gx + innerW / 2}
                  y={H - m.bottom + 20}
                  className="chart-axis-label strong"
                  textAnchor="middle"
                >
                  {cat}
                </text>
              </g>
            );
          })}
        </g>

        {/* baseline axis */}
        <line
          x1={m.left}
          x2={W - m.right}
          y1={m.top + plotH}
          y2={m.top + plotH}
          className="chart-axis"
        />
      </svg>
    </div>
  );
}

/* ---------- Horizontal bar chart (good for skewed values like latency) ---------- */

interface HBarItem {
  label: string;
  value: number;
  color: string;
  sub?: string;
}

export function HBarChart({
  items,
  format = (n) => n.toFixed(1),
  animateKey,
}: {
  items: HBarItem[];
  format?: (n: number) => string;
  animateKey?: string | number;
}) {
  const max = Math.max(...items.map((i) => i.value), 0.0001);
  return (
    <div className="hbar-list" key={animateKey}>
      {items.map((it, idx) => (
        <div className="hbar-row" key={it.label}>
          <div className="hbar-label">
            <span>{it.label}</span>
            {it.sub && <span className="hbar-sub">{it.sub}</span>}
          </div>
          <div className="hbar-track">
            <div
              className="hbar-fill"
              style={{
                width: `${(it.value / max) * 100}%`,
                background: it.color,
                animationDelay: `${idx * 80}ms`,
              }}
            />
            <span className="hbar-value">{format(it.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Line chart (single series, for ablations) ---------- */

interface LineChartProps {
  xLabels: (string | number)[];
  values: number[];
  color: string;
  height?: number;
  format?: (n: number) => string;
  yFromZero?: boolean;
  ariaLabel?: string;
  animateKey?: string | number;
}

export function LineChart({
  xLabels,
  values,
  color,
  height = 200,
  format = (n) => n.toFixed(3),
  yFromZero = true,
  ariaLabel,
  animateKey,
}: LineChartProps) {
  const W = 320;
  const H = height;
  const m = { top: 16, right: 16, bottom: 34, left: 52 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const dataMax = Math.max(...values, 0.0001);
  const dataMin = yFromZero ? 0 : Math.min(...values);
  const top = niceMax(dataMax * 1.1);
  const bottom = yFromZero ? 0 : dataMin * 0.95;
  const span = top - bottom || 1;

  const x = (i: number) => m.left + (plotW * i) / Math.max(1, xLabels.length - 1);
  const y = (v: number) => m.top + plotH * (1 - (v - bottom) / span);

  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  return (
    <div className="chart-frame" key={animateKey}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const v = bottom + span * f;
          const yy = y(v);
          return (
            <g key={i}>
              <line x1={m.left} x2={W - m.right} y1={yy} y2={yy} className="chart-grid" />
              <text x={m.left - 8} y={yy + 4} className="chart-axis-label" textAnchor="end">
                {format(v)}
              </text>
            </g>
          );
        })}

        <path d={path} className="chart-line" style={{ stroke: color }} />

        {values.map((v, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r={4} fill={color} className="chart-dot">
              <title>
                {xLabels[i]}: {format(v)}
              </title>
            </circle>
            <text x={x(i)} y={H - m.bottom + 18} className="chart-axis-label strong" textAnchor="middle">
              {xLabels[i]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------- Legend ---------- */

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="chart-legend">
      {items.map((it) => (
        <span className="chart-legend-item" key={it.name}>
          <span className="chart-legend-swatch" style={{ background: it.color }} />
          {it.name}
        </span>
      ))}
    </div>
  );
}

/* ---------- Small labelled wrapper ---------- */

export function ChartCard({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="chart-card">
      <div className="chart-card-head">
        <div>
          <h3 className="chart-card-title">{title}</h3>
          {subtitle && <div className="chart-card-sub">{subtitle}</div>}
        </div>
        {actions && <div className="chart-card-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
