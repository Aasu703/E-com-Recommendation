import Link from 'next/link';
import { Brain, ArrowRight, Sparkles } from 'lucide-react';
import type { RecommendedProduct } from '../../lib/rec-api';
import { HEADLINE } from '../../lib/metrics.generated';

interface WhyAIWinsProps {
  hybridTop?: RecommendedProduct;
  baselineTop?: RecommendedProduct;
  isLoading: boolean;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Honest headline figures — auto-generated in lib/metrics.generated.ts from the
 *  leak-free results (results/*.csv). Once train/test leakage was removed the
 *  Hybrid is on PAR with the baseline on ranking accuracy; its genuine wins are
 *  catalog coverage / personalization and reaching brand-new (cold) items. */
const STATS = [
  {
    label: 'Catalog Coverage @10',
    value: pct(HEADLINE.coverage_at_10.hybrid),
    detail: `vs ${pct(HEADLINE.coverage_at_10.baseline)} for Baseline — one static list for everyone`,
  },
  {
    label: 'Cold (new) Items Reached',
    value: pct(HEADLINE.cold_item_coverage.hybrid),
    detail: `vs ${pct(HEADLINE.cold_item_coverage.baseline)} for Baseline & Popularity`,
  },
  {
    label: 'Ranking Accuracy',
    value: 'On par',
    detail: `Precision@10 ${HEADLINE.precision_at_10.hybrid.toFixed(3)} vs ${HEADLINE.precision_at_10.baseline.toFixed(3)} · ${HEADLINE.accuracy_significance.verdict}`,
  },
];

function buildReason(p: RecommendedProduct): string {
  const isCold = p.alpha_used < 0.4;
  const lean = isCold
    ? 'we matched you with similar products'
    : 'we matched shoppers with similar taste to you';
  const festival = p.is_festival_recommendation ? ', plus a Dashain-season boost' : '';
  const fresh = p.freshness_boost_applied ? ', plus a freshness boost' : '';
  return `You're a ${isCold ? 'new' : 'returning'} shopper (α = ${p.alpha_used.toFixed(2)}), so ${lean}${festival}${fresh}. Baseline ignores who you are.`;
}

export function WhyAIWins({ hybridTop, baselineTop, isLoading }: WhyAIWinsProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-teal-700 rounded-lg text-white">
          <Brain className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Where Hybrid AI Wins in Nepal&apos;s Sparse-Data Market</h2>
          <p className="text-slate-500 text-sm">Coverage &amp; personalization, not accuracy hype — backed by leak-free offline evaluation</p>
        </div>
      </div>

      {/* Stat callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {STATS.map((s) => (
          <div key={s.label} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-center">
            <div className="text-3xl font-extrabold text-teal-700">{s.value}</div>
            <div className="text-sm font-semibold text-slate-700 mt-1">{s.label}</div>
            <div className="text-xs text-slate-400 mt-1">{s.detail}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 text-center -mt-6 mb-10">
        Leak-free offline evaluation · {HEADLINE.n_users} users · time-based train/test split ·{' '}
        <Link href="/dashboard" className="text-teal-700 font-semibold hover:underline">
          full breakdown on Thesis Dashboard
        </Link>
      </p>

      {/* Live annotated example */}
      {isLoading || !hybridTop || !baselineTop ? (
        <div className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
      ) : (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Right now, for you</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
              <span className="inline-block px-3 py-1 rounded-full bg-teal-700 text-white text-xs font-bold mb-3">
                Hybrid AI shows you
              </span>
              <h3 className="font-bold text-slate-900 leading-tight">{hybridTop.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{hybridTop.category}</p>
              <p className="text-teal-700 font-extrabold mt-2">{hybridTop.price_formatted}</p>
            </div>

            <div className="justify-self-center text-slate-300 font-black text-xl">VS</div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-500 text-white text-xs font-bold mb-3">
                Baseline shows everyone
              </span>
              <h3 className="font-bold text-slate-900 leading-tight">{baselineTop.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{baselineTop.category}</p>
              <p className="text-slate-600 font-extrabold mt-2">{baselineTop.price_formatted}</p>
            </div>
          </div>

          <p className="mt-6 text-slate-600 text-sm leading-relaxed bg-white border border-slate-100 rounded-xl p-4">
            {buildReason(hybridTop)}
          </p>
        </div>
      )}

      <div className="text-center mt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-teal-700 font-bold hover:text-teal-800 transition-colors"
        >
          See the full calculation
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
