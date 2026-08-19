import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useSimilarProducts, useProduct, useInteract } from "../../hooks/useRecommendations";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { useCartGate } from "../../contexts/CartGateContext";
import { Navbar } from "../../components/ui/Navbar";
import { StoreProductCard } from "../../components/ui/StoreProductCard";
import { ArrowLeft, ShoppingCart, Star, Sparkles, Minus, Plus, Check, Package } from "lucide-react";
import type { RecommendedProduct } from "../../lib/rec-api";

export default function ProductDetailPage() {
  const router = useRouter();
  const productId = String(router.query.id ?? "");

  const { addToCart } = useCart();
  const { user } = useAuth();
  const { requestAdd } = useCartGate();
  const logInteraction = useInteract();
  const { product, isLoading, isError } = useProduct(productId);
  const { recommendations, isLoading: similarLoading } = useSimilarProducts(productId, 8);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Log one "view" per product per tab session, logged-in users only.
  useEffect(() => {
    if (!productId || !user) return;
    const key = `nepkart_viewed:${productId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    logInteraction(user.user_id, productId, 'view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, user?.user_id]);

  const handleAddToCart = () => {
    if (!product || !product.in_stock) return;
    const cartItem = { product_id: product.product_id, name: product.name, price_npr: product.price_npr };
    if (!user) {
      requestAdd(cartItem);
      return;
    }
    addToCart(cartItem, quantity);
    logInteraction(user.user_id, product.product_id, 'add_to_cart');
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
        <Link href="/" className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-800 font-medium mb-10 transition-colors">
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
          <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 mb-20 flex flex-col md:flex-row gap-12">
            {/* Product Image Placeholder */}
            <div className="w-full md:w-1/2 aspect-square bg-teal-50 rounded-2xl border border-slate-100 flex items-center justify-center relative overflow-hidden">
              <Package className="h-24 w-24 text-teal-200" />
            </div>

            {/* Product Info */}
            <div className="w-full md:w-1/2 flex flex-col justify-center">
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold tracking-wider uppercase border border-teal-100">
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

              <div className="text-4xl font-extrabold text-teal-700 mb-8">
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
                className={`w-full font-bold py-4 px-8 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                  added
                    ? 'bg-green-500 text-white'
                    : product.in_stock
                    ? 'bg-teal-700 hover:bg-teal-800 text-white'
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
            <div className="p-2 bg-teal-50 rounded-lg text-teal-700">
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
  );
}
