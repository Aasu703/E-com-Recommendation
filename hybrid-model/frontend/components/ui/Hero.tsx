import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-[#0f1117] pt-16 pb-32">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium text-sm mb-8">
          <Sparkles className="h-4 w-4" />
          <span>Powered by Hybrid AI Recommendations</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
          Discover the best of
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mt-2">
            Nepali E-Commerce
          </span>
        </h1>
        
        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400 mb-10">
          Experience hyper-personalized shopping. Our AI learns what you love and curates the perfect selection just for you.
        </p>

        <div className="flex justify-center gap-4">
          <Link 
            href="#recommendations"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
          >
            Shop Now
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#1e2130] hover:bg-[#252840] border border-[#353a50] text-white font-bold transition-all hover:scale-105"
          >
            View Thesis Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
