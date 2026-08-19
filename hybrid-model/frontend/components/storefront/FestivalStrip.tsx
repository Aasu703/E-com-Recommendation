import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function FestivalStrip() {
  return (
    <Link
      href="#recommendations"
      className="block w-full bg-teal-700 hover:bg-teal-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
        <span className="text-white font-extrabold text-lg tracking-tight">
          DASHAIN SALE IS LIVE
        </span>
        <span className="hidden sm:inline text-teal-100 text-sm">
          Festival-Boosted AI Picks — Traditional Attire, Kitchen &amp; Home, Handicrafts and more get a
          <span className="text-amber-300 font-bold"> +0.25 score boost</span> this season
        </span>
        <span className="inline-flex items-center gap-1 text-amber-300 font-bold text-sm">
          See Picks <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
