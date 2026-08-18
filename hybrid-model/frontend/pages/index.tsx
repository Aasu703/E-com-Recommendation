import Head from 'next/head';
import { useState } from 'react';
import { Navbar } from '../components/ui/Navbar';
import { Hero } from '../components/ui/Hero';
import { StoreProductCard } from '../components/ui/StoreProductCard';
import { CategoryNav } from '../components/storefront/CategoryNav';
import { FestivalStrip } from '../components/storefront/FestivalStrip';
import { WhyAIWins } from '../components/storefront/WhyAIWins';
import { AlphaBadge } from '../components/recommendations/AlphaBadge';
import { useHybridRecommendations, useBaselineRecommendations, usePopularProducts } from '../hooks/useRecommendations';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, TrendingUp, Scale } from 'lucide-react';

export default function StoreFront() {
  const { user } = useAuth();
  const userId = user?.user_id ?? null;
  const personalized = !!userId;
  const currentMonth = 10; // Dashain/Festival month for demo
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Fetch hybrid recommendations (Personalized) — skipped for guests
  const hybrid = useHybridRecommendations(userId, 8, currentMonth);
  // Fetch baseline (non-personalized) recommendations for comparison — skipped for guests
  const baseline = useBaselineRecommendations(userId, 4);
  // Guests see this non-personalized feed instead of "Recommended for You"
  const popularForYou = usePopularProducts(8);
  // Fetch popular products (Trending), filterable by category
  const popular = usePopularProducts(10, activeCategory ?? undefined);

  const recommendedForYou = personalized ? hybrid.recommendations : popularForYou.recommendations;
  const recommendedLoading = personalized ? hybrid.isLoading : popularForYou.isLoading;

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
            <div className="p-2 bg-teal-50 rounded-lg text-teal-700">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Recommended for You</h2>
              <p className="text-slate-500 text-sm">
                {personalized ? 'Personalized picks based on your style and behavior' : 'Popular in Nepal — log in for picks tailored to you'}
              </p>
            </div>
            {personalized && <div className="ml-auto"><AlphaBadge context={hybrid.meta?.context} /></div>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
              ))
            ) : (
              recommendedForYou.map((p) => (
                <StoreProductCard key={`rec-${p.product_id}`} product={p} />
              ))
            )}
          </div>
        </section>

        {personalized && (
          <>
            {/* Why Hybrid AI Wins — dedicated showcase */}
            <WhyAIWins
              hybridTop={hybrid.recommendations[0]}
              baselineTop={baseline.recommendations[0]}
              isLoading={hybrid.isLoading || baseline.isLoading}
            />

            {/* Hybrid AI vs Baseline Comparison Section */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-700">
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
                    <span className="px-3 py-1 rounded-full bg-teal-700 text-white text-xs font-bold">Hybrid AI</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {hybrid.isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
                      ))
                    ) : (
                      hybrid.recommendations.slice(0, 4).map((p) => (
                        <StoreProductCard key={`cmp-hybrid-${p.product_id}`} product={p} />
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-slate-500 text-white text-xs font-bold">Baseline (No AI)</span>
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
                </div>
              </div>
            </section>
          </>
        )}

        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-teal-50 rounded-lg text-teal-700">
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
                <StoreProductCard key={`pop-${p.product_id}`} product={p} />
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-slate-500 text-sm">
        <p>© 2026 NepKart Recommendation System Thesis. All rights reserved.</p>
      </footer>
    </div>
  );
}
