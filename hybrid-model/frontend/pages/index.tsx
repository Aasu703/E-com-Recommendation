import Head from 'next/head';
import { useState } from 'react';
import { Navbar } from '../components/ui/Navbar';
import { Hero } from '../components/ui/Hero';
import { StoreProductCard } from '../components/ui/StoreProductCard';
import { useHybridRecommendations, usePopularProducts } from '../hooks/useRecommendations';
import { Sparkles, TrendingUp } from 'lucide-react';

export default function StoreFront() {
  const [userId, setUserId] = useState("U0001");
  const currentMonth = 10; // Dashain/Festival month for demo
  
  // Fetch hybrid recommendations (Personalized)
  const hybrid = useHybridRecommendations(userId, 8, currentMonth);
  // Fetch popular products (Trending)
  const popular = usePopularProducts(8);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white font-sans">
      <Head>
        <title>NepKart — AI-Powered E-Commerce</title>
        <meta name="description" content="Discover products you'll love with Hybrid AI" />
      </Head>

      <Navbar userId={userId} setUserId={setUserId} />
      <Hero />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-24 pb-32">
        {/* Recommended For You Section */}
        <section id="recommendations">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Recommended for You</h2>
              <p className="text-gray-400 text-sm">Personalized picks based on your style and behavior</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {hybrid.isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 bg-[#1e2130] rounded-2xl animate-pulse" />
              ))
            ) : (
              hybrid.recommendations.map((p) => (
                <StoreProductCard key={`rec-${p.product_id}`} product={p} />
              ))
            )}
          </div>
        </section>

        {/* Real-time User Analyzer Section (Purchases/Views) */}
        {analyzer.hasHistory && analyzer.analyzedProducts.length > 0 && (
          <section className="bg-indigo-900/20 border border-indigo-500/30 rounded-3xl p-8 shadow-[0_0_40px_rgba(79,70,229,0.1)]">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-indigo-500 rounded-lg text-white">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-indigo-100">Because you interacted with "{analyzer.seedName}"</h2>
                <p className="text-indigo-300 text-sm">Real-time content-based analysis matching your recent activity</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {analyzer.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 bg-[#1e2130] rounded-2xl animate-pulse opacity-50" />
                ))
              ) : (
                analyzer.analyzedProducts.map((p: any) => (
                  <StoreProductCard key={`ana-${p.product_id}`} product={p} />
                ))
              )}
            </div>
          </section>
        )}

        {/* Trending Now Section */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Trending Now</h2>
              <p className="text-gray-400 text-sm">Most popular items across NepKart this week</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popular.isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 bg-[#1e2130] rounded-2xl animate-pulse" />
              ))
            ) : (
              popular.recommendations.map((p) => (
                <StoreProductCard key={`pop-${p.product_id}`} product={p} />
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2a2e3f] bg-[#0f1117] py-8 text-center text-gray-500 text-sm">
        <p>© 2026 NepKart Recommendation System Thesis. All rights reserved.</p>
      </footer>
    </div>
  );
}
