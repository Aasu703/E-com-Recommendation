import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Navbar } from '../../components/ui/Navbar';
import { StoreProductCard } from '../../components/ui/StoreProductCard';
import { useProducts, useCategories } from '../../hooks/useRecommendations';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { Product, RecommendedProduct, ProductListParams } from '../../lib/rec-api';

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

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
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);

  const debouncedQ = useDebouncedValue(q, SEARCH_DELAY_MS);

  // External navigation (navbar search, back/forward, share link) -> input state.
  // Only runs when the URL query itself changes, so it never fights in-page typing.
  const urlQuery = typeof router.query.q === 'string' ? router.query.q : '';
  useEffect(() => {
    if (!router.isReady) return;
    setQ(urlQuery);
    setPage(1);
  }, [router.isReady, urlQuery]);

  const { items, total, isLoading } = useProducts({
    q: debouncedQ || undefined,
    category: category || undefined,
    sort: sort || undefined,
    in_stock: inStockOnly ? true : undefined,
    min_price: minPrice ? Number(minPrice) : undefined,
    max_price: maxPrice ? Number(maxPrice) : undefined,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters =
    q !== '' ||
    category !== '' ||
    sort !== '' ||
    inStockOnly ||
    minPrice !== '' ||
    maxPrice !== '';

  const clearFilters = () => {
    setQ('');
    setCategory('');
    setSort('');
    setInStockOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
    router.replace('/products', undefined, { shallow: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Head>
        <title>{q ? `Search: ${q} — NepKart` : 'All Products — NepKart'}</title>
      </Head>

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <h1 className="text-3xl font-extrabold">
            {q ? `Search results for "${q}"` : 'All Products'}
          </h1>
          {!isLoading && (
            <p className="text-sm text-slate-500">
              {total} product{total === 1 ? '' : 's'}
              {hasFilters ? ' match your filters' : ' in the catalogue'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-8 bg-white border border-slate-200 rounded-2xl p-4">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, brand, category or tag..."
              className="w-full bg-slate-100 border border-transparent rounded-full py-2 px-4 pl-10 text-sm focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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

          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            placeholder="Min NPR"
            className="w-24 bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            placeholder="Max NPR"
            className="w-24 bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />

          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 px-2">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => {
                setInStockOnly(e.target.checked);
                setPage(1);
              }}
              className="accent-teal-700"
            />
            <SlidersHorizontal className="h-4 w-4" />
            In stock only
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>

        {isLoading && items.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-slate-500 text-sm py-12 text-center">
            No products match your filters.
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-2 text-teal-700 font-semibold hover:underline"
              >
                Clear filters
              </button>
            )}
          </p>
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