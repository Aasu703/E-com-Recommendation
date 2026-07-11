import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-slate-50 pt-16 pb-32">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium text-sm mb-8 shadow-sm">
          <Sparkles className="h-4 w-4" />
          <span>Powered by Hybrid AI Recommendations</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
          Discover the best of
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mt-2">
            Nepali E-Commerce
          </span>
        </h1>
        
        <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-600 mb-10">
          Experience hyper-personalized shopping. Our AI learns what you love and curates the perfect selection just for you.
        </p>

        <div className="flex justify-center gap-4">
          <Link 
            href="#recommendations"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all hover:scale-105 shadow-lg shadow-indigo-500/30"
          >
            Shop Now
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold transition-all hover:scale-105 shadow-sm"
          >
            View Thesis Dashboard
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-12 text-sm text-slate-500 font-medium">
          <span>📦 500 Products</span>
          <span>👥 300 Simulated Shoppers</span>
          <span>🧠 Live SVD + TF-IDF Engine</span>
        </div>
      </div>
    </div>
  );
}
