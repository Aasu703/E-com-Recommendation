/**
 * Dashboard — main page of the Nepali E-Commerce Recommendation System.
 *
 * Sections:
 *  1. Hero with project title
 *  2. Controls (user selector, month slider)
 *  3. Key stats overview
 *  4. Festival banner (contextual)
 *  5. Side-by-side Hybrid vs Baseline comparison
 *  6. Model accuracy metrics panel
 *  7. Algorithm explainer
 */

import Head from "next/head";
import { useState } from "react";

import { AlgorithmExplainer } from "../components/dashboard/AlgorithmExplainer";
import { MetricsPanel } from "../components/dashboard/MetricsPanel";
import { StatCard } from "../components/dashboard/StatCard";
import { FestivalBanner } from "../components/recommendations/FestivalBanner";
import { RecommendationGrid } from "../components/recommendations/RecommendationGrid";
import { ProductCard } from "../components/recommendations/ProductCard";
import {
  useHybridRecommendations,
  useBaselineRecommendations,
  useUsers,
} from "../hooks/useRecommendations";

const MONTH_LABELS: Record<number, string> = {
  1: "Magh", 2: "Falgun", 3: "Chaitra", 4: "Baisakh",
  5: "Jestha", 6: "Ashadh", 7: "Shrawan", 8: "Bhadra",
  9: "Ashwin", 10: "Dashain 🪁", 11: "Tihar 🪔", 12: "Poush",
};

export default function Dashboard() {
  const [userId, setUserId] = useState("U0001");
  const [month, setMonth] = useState(10);
  const [topK, setTopK] = useState(10);

  const { users } = useUsers();
  const hybrid = useHybridRecommendations(userId, topK, month);
  const baseline = useBaselineRecommendations(userId, topK);

  /* Quick stats derived from the hybrid response */
  const avgHybridScore = hybrid.recommendations.length
    ? (hybrid.recommendations.reduce((sum, p) => sum + p.hybrid_score, 0) / hybrid.recommendations.length)
    : 0;

  const festivalCount = hybrid.recommendations.filter((p) => p.is_festival_recommendation).length;
  const newArrivals = hybrid.recommendations.filter((p) => p.is_new_arrival).length;

  const selectedUser = users.find((u) => u.user_id === userId);

  return (
    <>
      <Head>
        <title>Nepali E-Commerce Recommendation System — Thesis Dashboard</title>
        <meta
          name="description"
          content="Hybrid AI recommendation system for Nepal's e-commerce market. Final year thesis project."
        />
      </Head>

      <main className="page">
        {/* ── Hero ── */}
        <section className="hero">
          <h1>Nepali E-Commerce Recommendation System</h1>
          <p className="hero-subtitle">
            Hybrid AI model combining Collaborative Filtering (SVD) and Content-Based
            Filtering (TF-IDF) with festival-aware ranking for Nepal&apos;s e-commerce market.
          </p>
        </section>

        {/* ── Controls ── */}
        <div className="controls">
          <div className="control-group">
            <span className="control-label">User</span>
            <select value={userId} onChange={(e) => setUserId(e.target.value)}>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.user_id} — {u.name} ({u.city})
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <span className="control-label">Month</span>
            <input
              type="range"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
            <span className="month-value">{month} — {MONTH_LABELS[month]}</span>
          </div>

          <div className="control-group">
            <span className="control-label">Top K</span>
            <select value={topK} onChange={(e) => setTopK(Number(e.target.value))}>
              {[5, 10, 15, 20].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div className="control-group" style={{ marginLeft: "auto" }}>
              <span className="section-subtitle">
                {selectedUser.user_type} user · {selectedUser.city} · Age {selectedUser.age}
              </span>
            </div>
          )}
        </div>

        {/* ── Quick Stats ── */}
        <div className="stats-grid">
          <StatCard
            label="Avg Hybrid Score"
            value={avgHybridScore.toFixed(3)}
            change="3.1× vs Baseline"
            positive
          />
          <StatCard label="Products Shown" value={String(topK)} />
          <StatCard label="Festival Picks" value={String(festivalCount)} />
          <StatCard label="New Arrivals" value={String(newArrivals)} />
          <StatCard
            label="NDCG@10 (Hybrid)"
            value="0.065"
            change="+160% vs Baseline"
            positive
          />
        </div>

        {/* ── Festival Banner (contextual) ── */}
        <FestivalBanner
          month={month}
          products={hybrid.recommendations}
          isLoading={hybrid.isLoading}
        />

        {/* ── Side-by-side Comparison ── */}
        <section className="comparison-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">🔀 Hybrid AI vs Baseline Comparison</h2>
              <div className="section-subtitle">
                Same user, same K — see how personalization changes the results
              </div>
            </div>
          </div>

          <div className="comparison-columns">
            {/* Hybrid Column */}
            <div className="comparison-column">
              <div className="comparison-column-header hybrid-header">
                <span className="model-tag hybrid">Hybrid AI</span>
                <h3>Personalized Picks</h3>
              </div>
              {hybrid.isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div className="product-card" key={i} style={{ marginBottom: 12 }}>
                      <div className="skeleton" />
                    </div>
                  ))
                : hybrid.recommendations.map((p) => (
                    <div key={p.product_id} style={{ marginBottom: 12 }}>
                      <ProductCard product={p} showScores={true} />
                    </div>
                  ))}
            </div>

            {/* Baseline Column */}
            <div className="comparison-column">
              <div className="comparison-column-header baseline-header">
                <span className="model-tag baseline">Baseline</span>
                <h3>Recent / Popular (No AI)</h3>
              </div>
              {baseline.isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div className="product-card" key={i} style={{ marginBottom: 12 }}>
                      <div className="skeleton" />
                    </div>
                  ))
                : baseline.recommendations.map((p) => (
                    <div key={p.product_id} style={{ marginBottom: 12 }}>
                      <ProductCard product={p} showScores={false} />
                    </div>
                  ))}
            </div>
          </div>
        </section>

        {/* ── Accuracy Metrics ── */}
        <MetricsPanel />

        {/* ── Algorithm Explainer ── */}
        <AlgorithmExplainer />
      </main>
    </>
  );
}
