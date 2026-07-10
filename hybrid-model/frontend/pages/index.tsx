<<<<<<< HEAD
import Head from 'next/head';
import { useState } from 'react';
import { Navbar } from '../components/ui/Navbar';
import { Hero } from '../components/ui/Hero';
import { StoreProductCard } from '../components/ui/StoreProductCard';
import { CategoryNav } from '../components/storefront/CategoryNav';
import { FestivalStrip } from '../components/storefront/FestivalStrip';
import { WhyAIWins } from '../components/storefront/WhyAIWins';
import { useHybridRecommendations, useBaselineRecommendations, usePopularProducts, useInteract } from '../hooks/useRecommendations';
import { useDemoUser } from '../contexts/DemoUserContext';
import { Sparkles, TrendingUp, Scale } from 'lucide-react';

export default function StoreFront() {
  const { userId } = useDemoUser();
  const currentMonth = 10; // Dashain/Festival month for demo
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Fetch hybrid recommendations (Personalized)
  const hybrid = useHybridRecommendations(userId, 8, currentMonth);
  // Fetch baseline (non-personalized) recommendations for comparison
  const baseline = useBaselineRecommendations(userId, 4);
  // Fetch popular products (Trending), filterable by category
  const popular = usePopularProducts(10, activeCategory ?? undefined);

  const logInteraction = useInteract();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Head>
        <title>NepKart — AI-Powered E-Commerce</title>
        <meta name="description" content="Discover products you'll love with Hybrid AI" />
      </Head>

      <Navbar />
      <CategoryNav activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
      <Hero />
      <FestivalStrip />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-24 pb-32">
        {/* Recommended For You Section */}
        <section id="recommendations">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Recommended for You</h2>
              <p className="text-slate-500 text-sm">Personalized picks based on your style and behavior</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {hybrid.isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
              ))
            ) : (
              hybrid.recommendations.map((p) => (
                <StoreProductCard
                  key={`rec-${p.product_id}`}
                  product={p}
                  onInteract={() => logInteraction(userId, p.product_id, "view", 8, currentMonth)}
                />
              ))
            )}
          </div>
        </section>

        {/* Why Hybrid AI Wins — dedicated showcase */}
        <WhyAIWins
          hybridTop={hybrid.recommendations[0]}
          baselineTop={baseline.recommendations[0]}
          isLoading={hybrid.isLoading || baseline.isLoading}
        />

        {/* Hybrid AI vs Baseline Comparison Section */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shadow-sm">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Hybrid AI vs Baseline — See the Difference</h2>
              <p className="text-slate-500 text-sm">Same shopper, two engines: adaptive AI personalization vs a plain &quot;most recent&quot; list</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">🤖 Hybrid AI</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {hybrid.isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
                  ))
                ) : (
                  hybrid.recommendations.slice(0, 4).map((p) => (
                    <StoreProductCard
                      key={`cmp-hybrid-${p.product_id}`}
                      product={p}
                      onInteract={() => logInteraction(userId, p.product_id, "view", 8, currentMonth)}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-slate-500 text-white text-xs font-bold">📋 Baseline (No AI)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {baseline.isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
                  ))
                ) : (
                  baseline.recommendations.slice(0, 4).map((p) => (
                    <StoreProductCard key={`cmp-baseline-${p.product_id}`} product={p} />
                  ))
                )}
              </div>
=======
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
>>>>>>> b0cbdba1f8b96ecd4f0dbb3c7b8e48fecda82efb
            </div>
          </div>
        </section>

<<<<<<< HEAD
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600 shadow-sm">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {activeCategory ? `Trending in ${activeCategory}` : 'Trending Now'}
              </h2>
              <p className="text-slate-500 text-sm">Most popular items across NepKart this week</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {popular.isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
              ))
            ) : popular.recommendations.length === 0 ? (
              <p className="col-span-full text-slate-500 text-sm py-8 text-center">No products found in this category yet.</p>
            ) : (
              popular.recommendations.map((p) => (
                <StoreProductCard
                  key={`pop-${p.product_id}`}
                  product={p}
                  onInteract={() => logInteraction(userId, p.product_id, "view", 8, currentMonth)}
                />
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-slate-500 text-sm">
        <p>© 2026 NepKart Recommendation System Thesis. All rights reserved.</p>
      </footer>
    </div>
=======
        {/* ── Accuracy Metrics ── */}
        <MetricsPanel />

        {/* ── Algorithm Explainer ── */}
        <AlgorithmExplainer />
      </main>
    </>
>>>>>>> b0cbdba1f8b96ecd4f0dbb3c7b8e48fecda82efb
  );
}
