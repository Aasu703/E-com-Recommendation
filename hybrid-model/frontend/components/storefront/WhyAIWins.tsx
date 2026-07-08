import Link from 'next/link';
import { Brain, ArrowRight, Sparkles } from 'lucide-react';
import type { RecommendedProduct } from '../../lib/rec-api';

interface WhyAIWinsProps {
  hybridTop?: RecommendedProduct;
  baselineTop?: RecommendedProduct;
  isLoading: boolean;
}

/** K=10 offline evaluation figures — sourced from components/dashboard/MetricsPanel.tsx
 *  so the storefront headline never contradicts the Thesis Dashboard. */
const STATS = [
  { label: 'NDCG@10', value: '+160%', detail: '0.065 vs 0.025' },
  { label: 'Precision@10', value: '+218%', detail: '0.054 vs 0.017' },
  { label: 'Catalog Coverage', value: '+4370%', detail: '0.894 vs 0.020' },
];

function buildReason(p: RecommendedProduct): string {
  const isCold = p.alpha_used < 0.4;
  const lean = isCold
    ? "we leaned on products similar to what you've viewed"
    : 'we leaned on shoppers with similar taste to you';
  const festival = p.is_festival_recommendation
    ? ", plus a Dashain-season boost since it's culturally relevant right now"
    : '';
  const fresh = p.freshness_boost_applied
    ? ', plus a freshness boost since it just arrived in the catalog'
    : '';
  return `Because you're a ${isCold ? 'new' : 'returning'} shopper (α = ${p.alpha_used.toFixed(2)}), ${lean}${festival}${fresh}. Baseline ignores who you are — it just shows whatever was most recently viewed by anyone.`;
}

export function WhyAIWins({ hybridTop, baselineTop, isLoading }: WhyAIWinsProps) {
  return (
    <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 rounded-3xl p-8 md:p-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm">
          <Brain className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Why Hybrid AI Wins in Nepal&apos;s Sparse-Data Market</h2>
          <p className="text-slate-500 text-sm">Live proof from your session, backed by offline evaluation</p>
        </div>
      </div>

      {/* Stat callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
            <div className="text-3xl font-extrabold text-indigo-600">{s.value}</div>
            <div className="text-sm font-semibold text-slate-700 mt-1">{s.label}</div>
            <div className="text-xs text-slate-400 mt-1">{s.detail}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 text-center -mt-6 mb-10">
        Offline evaluation · 299 users · time-based train/test split ·{' '}
        <Link href="/dashboard" className="text-indigo-600 font-semibold hover:underline">
          full breakdown on Thesis Dashboard
        </Link>
      </p>

      {/* Live annotated example */}
      {isLoading || !hybridTop || !baselineTop ? (
        <div className="h-48 bg-white/60 rounded-2xl animate-pulse" />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Right now, for you</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
              <span className="inline-block px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold mb-3">
                🤖 Hybrid AI shows you
              </span>
              <h3 className="font-bold text-slate-900 leading-tight">{hybridTop.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{hybridTop.category}</p>
              <p className="text-indigo-600 font-extrabold mt-2">{hybridTop.price_formatted}</p>
            </div>

            <div className="justify-self-center text-slate-300 font-black text-xl">VS</div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-500 text-white text-xs font-bold mb-3">
                📋 Baseline shows everyone
              </span>
              <h3 className="font-bold text-slate-900 leading-tight">{baselineTop.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{baselineTop.category}</p>
              <p className="text-slate-600 font-extrabold mt-2">{baselineTop.price_formatted}</p>
            </div>
          </div>

          <p className="mt-6 text-slate-600 text-sm leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-4">
            {buildReason(hybridTop)}
          </p>
        </div>
      )}

      <div className="text-center mt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
        >
          See the full calculation
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
