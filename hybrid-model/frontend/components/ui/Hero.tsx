import { useState } from 'react';
import { Sparkles, ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <div className="relative overflow-hidden bg-slate-50 pt-16 pb-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 800px 420px at 50% -15%, rgba(107,49,25,0.10), transparent 60%), radial-gradient(ellipse 500px 320px at 90% 10%, rgba(181,117,15,0.10), transparent 60%)',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="animate-hero-rise inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-medium text-sm mb-8">
          <Sparkles className="h-4 w-4" />
          <span>Powered by Hybrid AI Recommendations</span>
        </div>

        <h1 className="animate-hero-rise [animation-delay:0.08s] font-serif text-5xl md:text-7xl font-semibold tracking-tight text-slate-900 mb-6">
          Discover the best of
          <span className="block text-teal-700 mt-2 italic">
            Nepali E-Commerce
          </span>
        </h1>

        <p className="animate-hero-rise [animation-delay:0.16s] mt-4 max-w-2xl mx-auto text-xl text-slate-600 mb-10">
          Our AI learns what you love and curates products just for you.
        </p>

        <form
          onSubmit={handleSearch}
          className="animate-hero-rise [animation-delay:0.2s] max-w-xl mx-auto mb-10"
        >
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, brand, category or tag..."
              className="w-full bg-white border border-slate-200 rounded-full py-4 px-5 pl-12 text-slate-900 shadow-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold transition-colors"
            >
              Search
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        <div className="animate-hero-rise [animation-delay:0.24s] flex justify-center gap-4">
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

        <div className="animate-hero-rise [animation-delay:0.32s] flex flex-wrap justify-center gap-x-8 gap-y-3 mt-12 text-sm text-slate-500 font-medium font-mono">
          <span>500 Products</span>
          <span>300 Simulated Shoppers</span>
          <span>Live SVD + TF-IDF Engine</span>
        </div>
      </div>
    </div>
  );
}