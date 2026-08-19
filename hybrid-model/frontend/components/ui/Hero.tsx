import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-slate-50 pt-16 pb-32">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-medium text-sm mb-8">
          <Sparkles className="h-4 w-4" />
          <span>Powered by Hybrid AI Recommendations</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
          Discover the best of
          <span className="block text-teal-700 mt-2">
            Nepali E-Commerce
          </span>
        </h1>

        <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-600 mb-10">
          Our AI learns what you love and curates products just for you.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            href="#recommendations"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-colors"
          >
            Shop Now
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold transition-colors"
          >
            View Thesis Dashboard
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-12 text-sm text-slate-500 font-medium">
          <span>500 Products</span>
          <span>300 Simulated Shoppers</span>
          <span>Live SVD + TF-IDF Engine</span>
        </div>
      </div>
    </div>
  );
}
