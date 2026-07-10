<<<<<<< HEAD
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useSimilarProducts, useProduct } from "../../hooks/useRecommendations";
import { useCart } from "../../contexts/CartContext";
import { Navbar } from "../../components/ui/Navbar";
import { StoreProductCard } from "../../components/ui/StoreProductCard";
import { ArrowLeft, ShoppingCart, Star, Sparkles, Minus, Plus, Check } from "lucide-react";
import type { RecommendedProduct } from "../../lib/rec-api";

export default function ProductDetailPage() {
  const router = useRouter();
  const productId = String(router.query.id ?? "");

  const { addToCart } = useCart();
  const { product, isLoading, isError } = useProduct(productId);
  const { recommendations, isLoading: similarLoading } = useSimilarProducts(productId, 8);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    if (!product || !product.in_stock) return;
    addToCart({ product_id: product.product_id, name: product.name, price_npr: product.price_npr }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Head>
        <title>{product ? `${product.name} — NepKart` : "NepKart"}</title>
      </Head>

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium mb-10 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Store
        </Link>

        {isLoading ? (
          <div className="h-96 bg-slate-200 rounded-3xl animate-pulse mb-20" />
        ) : isError || !product ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center mb-20">
            <p className="text-slate-500 text-lg">Product not found.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 mb-20 shadow-sm flex flex-col md:flex-row gap-12">
            {/* Product Image Placeholder */}
            <div className="w-full md:w-1/2 aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-slate-100 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0,transparent_70%)]" />
              <span className="text-9xl opacity-20">📦</span>
            </div>

            {/* Product Info */}
            <div className="w-full md:w-1/2 flex flex-col justify-center">
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold tracking-wider uppercase border border-indigo-100">
                  {product.category}
                </span>
                {product.is_new_arrival && (
                  <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold tracking-wider uppercase border border-green-100">
                    New Arrival
                  </span>
                )}
                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold tracking-wider uppercase">
                  ID: {product.product_id}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 leading-tight">
                {product.name}
              </h1>
              <p className="text-slate-400 text-sm mb-4">{product.brand} · {product.subcategory}</p>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="text-slate-700 font-semibold">
                    {product.avg_rating != null ? product.avg_rating.toFixed(1) : "N/A"}
                  </span>
                </div>
                <span className="text-slate-400 text-sm">({product.rating_count} reviews)</span>
                {!product.in_stock && (
                  <span className="text-red-500 text-sm font-semibold">Out of Stock</span>
                )}
              </div>

              <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                {product.description}
              </p>

              <div className="text-4xl font-extrabold text-indigo-600 mb-8">
                NPR {product.price_npr.toLocaleString()}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <span className="font-semibold text-sm text-slate-600">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!product.in_stock}
                className={`w-full font-bold py-4 px-8 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 ${
                  added
                    ? 'bg-green-500 text-white'
                    : product.in_stock
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                {added ? 'Added to Cart' : product.in_stock ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          </div>
        )}

        {/* Similar Products */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-pink-100 rounded-lg text-pink-600 shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Similar Products You Might Like</h2>
              <p className="text-slate-500 text-sm">Found via TF-IDF cosine similarity on metadata</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
              ))
            ) : (
              recommendations.map((p: RecommendedProduct) => (
                <StoreProductCard key={`sim-${p.product_id}`} product={p} />
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-slate-500 text-sm mt-20">
        <p>© 2026 NepKart Recommendation System Thesis. All rights reserved.</p>
      </footer>
    </div>
=======
/**
 * Product Detail Page — shows product information and similar products.
 */

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSimilarProducts } from "../../hooks/useRecommendations";
import { RecommendationGrid } from "../../components/recommendations/RecommendationGrid";

export default function ProductDetailPage() {
  const router = useRouter();
  const productId = String(router.query.id ?? "P0001");

  const { recommendations, seedName, isLoading } = useSimilarProducts(productId, 8);

  return (
    <>
      <Head>
        <title>{seedName || productId} — Similar Products</title>
        <meta name="description" content={`Content-based similar products for ${seedName || productId}`} />
      </Head>

      <main className="page product-detail">
        <Link href="/" className="back-link">
          ← Back to Dashboard
        </Link>

        <h1>{seedName || productId}</h1>
        <div className="product-detail-meta">
          <span>Product ID: {productId}</span>
          <span>·</span>
          <span>Content-Based Similarity (TF-IDF + Cosine)</span>
        </div>

        <RecommendationGrid
          title="Similar Products"
          subtitle="Found via TF-IDF cosine similarity on product metadata (description, tags, category, brand)"
          products={recommendations as any}
          isLoading={isLoading}
          showScores={false}
        />
      </main>
    </>
>>>>>>> b0cbdba1f8b96ecd4f0dbb3c7b8e48fecda82efb
  );
}
