/**
 * Hidden thesis-defence route: unchanged persona-switching + cold-start demo,
 * moved out of the public Navbar. Not linked from any storefront page. The
 * real storefront (pages/index.tsx etc.) no longer depends on DemoUserContext
 * at all -- this page is the only remaining consumer.
 */
import { useState } from 'react';
import Head from 'next/head';
import { UserPlus, Sparkles, TrendingUp, Scale } from 'lucide-react';
import { DemoUserProvider, useDemoUser } from '../contexts/DemoUserContext';
import { PreferenceOnboarding } from '../components/onboarding/PreferenceOnboarding';
import { StoreProductCard } from '../components/ui/StoreProductCard';
import { Hero } from '../components/ui/Hero';
import { CategoryNav } from '../components/storefront/CategoryNav';
import { FestivalStrip } from '../components/storefront/FestivalStrip';
import { WhyAIWins } from '../components/storefront/WhyAIWins';
import { AlphaBadge } from '../components/recommendations/AlphaBadge';
import {
  useHybridRecommendations,
  useBaselineRecommendations,
  usePopularProducts,
  useUsers,
} from '../hooks/useRecommendations';

function PersonaPicker() {
  const { users } = useUsers();
  const { userId, setUserId, startAsNewVisitor } = useDemoUser();

  return (
    <div className="w-full bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
          Thesis Demo — not part of the storefront
        </span>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
        >
          {userId.startsWith('GUEST-') && <option value={userId}>New Visitor ({userId})</option>}
          {users.slice(0, 300).map((u) => (
            <option key={u.user_id} value={u.user_id}>
              {u.name} ({u.user_id})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={startAsNewVisitor}
          className="flex items-center gap-1.5 text-sm font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
        >
          <UserPlus className="h-4 w-4" /> New Visitor (cold-start)
        </button>
        <span className="ml-auto text-xs text-slate-400 font-mono">{userId}</span>
      </div>
    </div>
  );
}

function DemoStorefront() {
  const { userId } = useDemoUser();
  const currentMonth = 10; // Dashain/Festival month for demo
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const hybrid = useHybridRecommendations(userId, 8, currentMonth);
  const baseline = useBaselineRecommendations(userId, 4);
  const popular = usePopularProducts(10, activeCategory ?? undefined);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Head>
        <title>NepKart — Demo Persona Switcher</title>
      </Head>

      <PersonaPicker />
      <CategoryNav activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
      <Hero />
      <FestivalStrip />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-24 pb-32">
        <section id="recommendations">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Recommended for You</h2>
              <p className="text-slate-500 text-sm">Personalized picks based on your style and behavior</p>
            </div>
            <div className="ml-auto"><AlphaBadge context={hybrid.meta?.context} /></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {hybrid.isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
                ))
              : hybrid.recommendations.map((p) => (
                  <StoreProductCard key={`rec-${p.product_id}`} product={p} gated={false} userId={userId} />
                ))}
          </div>
        </section>

        <WhyAIWins
          hybridTop={hybrid.recommendations[0]}
          baselineTop={baseline.recommendations[0]}
          isLoading={hybrid.isLoading || baseline.isLoading}
        />

        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shadow-sm">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Hybrid AI vs Baseline — See the Difference</h2>
              <p className="text-slate-500 text-sm">
                Same shopper, two engines: adaptive AI personalization vs a plain &quot;most recent&quot; list
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">🤖 Hybrid AI</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {hybrid.isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
                    ))
                  : hybrid.recommendations.slice(0, 4).map((p) => (
                      <StoreProductCard key={`cmp-hybrid-${p.product_id}`} product={p} gated={false} userId={userId} />
                    ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-slate-500 text-white text-xs font-bold">📋 Baseline (No AI)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {baseline.isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
                    ))
                  : baseline.recommendations.slice(0, 4).map((p) => (
                      <StoreProductCard key={`cmp-baseline-${p.product_id}`} product={p} gated={false} />
                    ))}
              </div>
            </div>
          </div>
        </section>

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
                <StoreProductCard key={`pop-${p.product_id}`} product={p} gated={false} userId={userId} />
              ))
            )}
          </div>
        </section>
      </main>

      <PreferenceOnboarding mode="demo" />
    </div>
  );
}

export default function DemoPage() {
  return (
    <DemoUserProvider>
      <DemoStorefront />
    </DemoUserProvider>
  );
}
