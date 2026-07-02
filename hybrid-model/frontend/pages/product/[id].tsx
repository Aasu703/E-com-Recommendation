import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from 'react';
import { useSimilarProducts, usePopularProducts } from "../../hooks/useRecommendations";
import { useCart } from "../../contexts/CartContext";
import { Navbar } from "../../components/ui/Navbar";
import { StoreProductCard } from "../../components/ui/StoreProductCard";
import { ArrowLeft, ShoppingCart, Star, Sparkles } from "lucide-react";

export default function ProductDetailPage() {
  const router = useRouter();
  const productId = String(router.query.id ?? "P0001");
  const [userId, setUserId] = useState("U0001");
  
  const { addToCart } = useCart();

  const { recommendations, seedName, isLoading } = useSimilarProducts(productId, 8);
  const { recommendations: popularProducts } = usePopularProducts(1);
  
  // Create a mock product display since we only have the ID from the URL and similar products
  // We can use the seedName if available, or fallback.
  const productTitle = seedName || `Product ${productId}`;

  return (
    <div className="min-h-screen bg-[#0f1117] text-white font-sans flex flex-col">
      <Head>
        <title>{productTitle} — NepKart</title>
      </Head>

      <Navbar userId={userId} setUserId={setUserId} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium mb-10 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Store
        </Link>

        {/* Product Showcase */}
        <div className="bg-[#1e2130] border border-[#353a50] rounded-3xl p-8 md:p-12 mb-20 shadow-2xl flex flex-col md:flex-row gap-12">
          {/* Mock Product Image / Placeholder */}
          <div className="w-full md:w-1/2 aspect-square bg-gradient-to-br from-[#252840] to-[#1a1d27] rounded-2xl border border-[#353a50] flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.8)_0,transparent_70%)]" />
             <span className="text-9xl opacity-10">📦</span>
          </div>

          {/* Product Info */}
          <div className="w-full md:w-1/2 flex flex-col justify-center">
            <div className="flex gap-2 mb-4">
               <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold tracking-wider uppercase border border-indigo-500/20">
                 Best Seller
               </span>
               <span className="px-3 py-1 bg-[#252840] text-gray-300 rounded-full text-xs font-bold tracking-wider uppercase border border-[#353a50]">
                 ID: {productId}
               </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              {productTitle}
            </h1>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current opacity-50" />
              </div>
              <span className="text-gray-400 text-sm">(124 reviews)</span>
            </div>

            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Experience premium quality and unparalleled design. This product has been carefully selected based on our content-based TF-IDF similarity model.
            </p>

            <div className="text-4xl font-extrabold text-white mb-8">
              NPR 4,500 <span className="text-lg text-gray-500 font-normal line-through ml-2">NPR 6,000</span>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => {
                  addToCart({ product_id: productId, name: productTitle, price_npr: 4500 });
                  alert("Added to cart!");
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Similar Products You Might Like</h2>
              <p className="text-gray-400 text-sm">Found via TF-IDF cosine similarity on metadata</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 bg-[#1e2130] rounded-2xl animate-pulse" />
              ))
            ) : (
              recommendations.map((p: any) => (
                <StoreProductCard key={`sim-${p.product_id}`} product={p} />
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2a2e3f] bg-[#0f1117] py-8 text-center text-gray-500 text-sm mt-20">
        <p>© 2026 NepKart Recommendation System Thesis. All rights reserved.</p>
      </footer>
    </div>
  );
}
