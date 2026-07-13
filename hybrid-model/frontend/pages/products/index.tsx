import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Navbar } from '../../components/ui/Navbar';
import { StoreProductCard } from '../../components/ui/StoreProductCard';
import { useProducts, useCategories } from '../../hooks/useRecommendations';
import type { Product, RecommendedProduct, ProductListParams } from '../../lib/rec-api';

const PAGE_SIZE = 20;

function toCard(p: Product): RecommendedProduct {
  return {
    ...p,
    price_formatted: `NPR ${p.price_npr.toLocaleString()}`,
    hybrid_score: 0,
    cf_score: 0,
    cb_score: 0,
    alpha_used: 0,
    is_festival_recommendation: false,
    freshness_boost_applied: false,
  };
}

export default function ProductsPage() {
  const router = useRouter();
  const { categories } = useCategories();

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<ProductListParams['sort'] | ''>('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!router.isReady) return;
    const query = typeof router.query.q === 'string' ? router.query.q : '';
    setQ(query);
    setPage(1);
  }, [router.isReady, router.query.q]);

  const { items, total, isLoading } = useProducts({
    q: q || undefined,
    category: category || undefined,
    sort: sort || undefined,
    in_stock: inStockOnly ? true : undefined,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Head>
        <title>All Products — NepKart</title>
      </Head>

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <h1 className="text-3xl font-extrabold mb-8">
          {q ? `Search results for "${q}"` : 'All Products'}
        </h1>

        <div className="flex flex-wrap items-center gap-3 mb-8 bg-white border border-slate-200 rounded-2xl p-4">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search products..."
              className="w-full bg-slate-100 border border-transparent rounded-full py-2 px-4 pl-10 text-sm focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="bg-slate-100 rounded-full px-4 py-2 text-sm font-medium"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as ProductListParams['sort']);
              setPage(1);
            }}
            className="bg-slate-100 rounded-full px-4 py-2 text-sm font-medium"
          >
            <option value="">Sort: Default</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
            <option value="newest">Newest</option>
          </select>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 px-2">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => {
                setInStockOnly(e.target.checked);
                setPage(1);
              }}
              className="accent-indigo-600"
            />
            <SlidersHorizontal className="h-4 w-4" />
            In stock only
          </label>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-slate-500 text-sm py-12 text-center">No products match your filters.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {items.map((p) => (
                <StoreProductCard key={p.product_id} product={toCard(p)} />
              ))}
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-slate-500 text-sm">
        <p>© 2026 NepKart Recommendation System Thesis. All rights reserved.</p>
      </footer>
    </div>
  );
}
