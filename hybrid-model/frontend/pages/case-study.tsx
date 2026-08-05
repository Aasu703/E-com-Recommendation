import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowRight,
  MapPin,
  Sparkles,
  Users,
  PackageSearch,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Navbar } from '../components/ui/Navbar';
import { THESIS_METRICS, HEADLINE } from '../lib/metrics.generated';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Component-level results @K=10, used for the "why hybrid" comparison table.
 *  Source: results/components_eval.csv, via lib/metrics.generated.ts. */
const COMPONENT_ROWS = THESIS_METRICS.components_eval.rows.filter((r) => r.k === 10);
const COMPONENT_ORDER = ['Baseline', 'Popularity', 'ContentBased', 'Collaborative', 'Hybrid'] as const;
const COMPONENT_LABEL: Record<(typeof COMPONENT_ORDER)[number], string> = {
  Baseline: 'Recency Baseline',
  Popularity: 'Popularity',
  ContentBased: 'Content-Based (TF-IDF)',
  Collaborative: 'Collaborative (SVD)',
  Hybrid: 'Hybrid (shipped)',
};

const NEPAL_CHALLENGES = [
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Festival-driven demand',
    body: "Dashain and Tihar create sharp seasonal spikes for Traditional Attire, Handicrafts, Kitchen & Home, and Electronics — categories a generic global recommender has no reason to weight differently in October.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Cold-start users',
    body: 'New shoppers arrive with little or no browsing history. A pure collaborative filter has nothing to work with until they interact — but they still need a useful first screen.',
  },
  {
    icon: <PackageSearch className="h-5 w-5" />,
    title: 'Cold-start products',
    body: "New arrivals have zero interaction history, so collaborative filtering structurally cannot surface them yet — they need a content-similarity or freshness pathway instead.",
  },
  {
    icon: <MapPin className="h-5 w-5" />,
    title: 'A smaller, sparser market',
    body: "Nepal's e-commerce interaction volume is a fraction of Amazon/Alibaba-scale markets — this dataset's simulated catalog is ~96% sparse (see notebooks/01_EDA.ipynb), closer to what a real regional platform would see than the dense benchmarks most recommender research assumes.",
  },
];

export default function CaseStudyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Head>
        <title>Case Study — Why a Hybrid Recommender for Nepal | NepKart</title>
        <meta
          name="description"
          content="Why this project chose a hybrid CF+CB recommender for Nepal's e-commerce market, what the evaluation actually shows it can and can't do."
        />
      </Head>

      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20 pb-32">
        {/* ── Hero ── */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium text-sm mb-6 shadow-sm">
            <Sparkles className="h-4 w-4" />
            <span>Case Study</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">
            Why a Hybrid Model for
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 mt-2">
              Nepal&apos;s E-Commerce Market
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-600">
            An honest account of the problem this project set out to solve, why a
            hybrid recommender was chosen over any single technique, and — backed
            by leak-free offline evaluation — exactly what it can and cannot
            deliver.
          </p>
        </section>

        {/* ── The Nepal Problem ── */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">The Problem</h2>
          <p className="text-slate-500 mb-8 max-w-3xl">
            E-commerce platforms serving Nepal face a combination of challenges
            that a generic, off-the-shelf recommender isn&apos;t built for.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {NEPAL_CHALLENGES.map((c) => (
              <div key={c.title} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">{c.icon}</div>
                  <h3 className="font-bold text-slate-900">{c.title}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why Hybrid: comparing the alternatives ── */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Why Hybrid, and Not a Single Technique?
          </h2>
          <p className="text-slate-500 mb-6 max-w-3xl">
            Before settling on a hybrid, this project evaluated all five candidate
            strategies against the same leak-free split (271 test users, K=10).
            No single technique wins on every axis — which is itself the case for
            blending them.
          </p>

          <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-semibold">Model</th>
                  <th className="px-5 py-3 font-semibold text-right">Precision@10</th>
                  <th className="px-5 py-3 font-semibold text-right">Coverage@10</th>
                  <th className="px-5 py-3 font-semibold text-right">Diversity@10</th>
                </tr>
              </thead>
              <tbody>
                {COMPONENT_ORDER.map((model) => {
                  const row = COMPONENT_ROWS.find((r) => r.model === model)!;
                  const isHybrid = model === 'Hybrid';
                  return (
                    <tr
                      key={model}
                      className={`border-b border-slate-100 last:border-0 ${isHybrid ? 'bg-indigo-50/60' : ''}`}
                    >
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        {COMPONENT_LABEL[model]}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {row.precision.toFixed(4)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {pct(row.coverage)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {row.diversity.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Source: <code>results/components_eval.csv</code> — see the full{' '}
            <Link href="/dashboard" className="text-indigo-600 font-semibold hover:underline">
              Thesis Dashboard
            </Link>{' '}
            for K=5/20 and every other protocol.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-2">Collaborative filtering alone</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Actually leads on raw ranking accuracy (Precision@10{' '}
                {COMPONENT_ROWS.find((r) => r.model === 'Collaborative')!.precision.toFixed(4)}) —
                but it has no answer for a user or product with no interaction
                history at all, and its catalog coverage (
                {pct(COMPONENT_ROWS.find((r) => r.model === 'Collaborative')!.coverage)}) is far
                below content-based or hybrid.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-2">Content-based alone</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Reaches the widest catalog coverage (
                {pct(COMPONENT_ROWS.find((r) => r.model === 'ContentBased')!.coverage)}) and needs
                no interaction history — ideal for cold-start items — but its
                intra-list diversity is essentially zero: it returns near-identical,
                same-category neighbours of a single seed product.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 mt-5">
            <h3 className="font-bold text-slate-900 mb-2">The hybrid&apos;s job, honestly stated</h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              The hybrid was chosen not because it beats every model on accuracy —
              the evaluation shows it doesn&apos;t — but because it is the only
              approach that simultaneously (1) personalizes per user via an
              adaptive α = U_c / (U_c + γ) blend of CF and CB, (2) has a built-in
              answer for both user- and item-side cold start, and (3) can encode
              Nepal-specific business logic (the Dashain/Tihar festival boost)
              directly into the score. A single technique can win one of these
              axes; none of them wins all three at once.
            </p>
          </div>
        </section>

        {/* ── What it can do ── */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">What This Model Can Do</h2>
          <p className="text-slate-500 mb-6 max-w-3xl">
            Reproducible, leak-free findings — every number below is traceable to a
            file under <code>backend/results/</code>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Personalizes across the catalog',
                body: `Surfaces products from ${pct(HEADLINE.coverage_at_10.hybrid)} of the catalog across users, vs ${pct(HEADLINE.coverage_at_10.baseline)} for the baseline's single static list, at K=10.`,
              },
              {
                title: 'Reaches brand-new items',
                body: `Surfaces ${pct(HEADLINE.cold_item_coverage.hybrid)} of items with zero pre-cutoff interaction history in users' top-10 lists; the recency and popularity baselines reach ${pct(HEADLINE.cold_item_coverage.baseline)} — structurally none.`,
              },
              {
                title: 'Adapts automatically per user',
                body: 'The α formula shifts weight toward content-based scoring for low-activity users and toward collaborative filtering as a user accumulates interactions — no manual segmentation required.',
              },
              {
                title: 'Reacts to Nepali festival seasonality',
                body: 'During Dashain/Tihar (months 10–11), culturally relevant categories receive a scoring boost — a business rule a generic imported recommender would not encode.',
              },
              {
                title: 'Serves from a live cache at low latency',
                body: `Cache-hit responses average ${HEADLINE.latency_ms.cache_hit_mean.toFixed(2)}ms vs ${HEADLINE.latency_ms.cache_miss_mean.toFixed(2)}ms on a cache miss (live Redis measurement) — a ~99% reduction, workable for real-time serving.`,
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── What it can't (yet) do ── */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">What This Model Cannot (Yet) Do</h2>
          <p className="text-slate-500 mb-6 max-w-3xl">
            Reported deliberately, not hidden — this is the same honest reading
            documented in <code>results/RESULTS_SUMMARY.md</code>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Does not beat the baseline on accuracy',
                body: `Once train/test leakage is removed, Hybrid vs Baseline Precision@10 is statistically indistinguishable (p = ${HEADLINE.accuracy_significance.p_ttest.toFixed(4)}, ${HEADLINE.accuracy_significance.verdict}).`,
              },
              {
                title: 'The blend costs some accuracy vs. CF alone',
                body: 'Collaborative filtering by itself significantly out-ranks the blended Hybrid on Precision@10 and NDCG@10 (p < 0.05) — personalization width comes at a measured accuracy cost.',
              },
              {
                title: 'Zero-history users score 0% accuracy',
                body: 'Brand-new (zero-interaction) users are served 100% new-arrival items via the freshness boost — a reasonable discovery strategy, but it scores zero against their (currently absent) held-out interactions.',
              },
              {
                title: 'Trained on a simulated dataset',
                body: 'A live Daraz.com.np scrape was attempted and abandoned (JS SPA, authenticated internal APIs, ToS risk). All numbers here come from a seeded, statistically simulated catalog modeled on real Nepali market patterns — not observed shopper behaviour.',
              },
              {
                title: 'Database and job queue are not deployed',
                body: 'PostgreSQL/SQLAlchemy and Celery are fully coded but not wired up at runtime — the live system serves from in-memory data with an optional Redis cache; /health honestly reports db_connected: false.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <XCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom line ── */}
        <section className="bg-slate-900 rounded-3xl p-8 md:p-12 text-center">
          <div className="flex justify-center gap-3 mb-4">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <ShieldAlert className="h-6 w-6 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">The Honest Bottom Line</h2>
          <p className="max-w-2xl mx-auto text-slate-300 leading-relaxed mb-8">
            For a data-sparse market like Nepal&apos;s, this hybrid recommender
            reaches accuracy parity with a strong recency baseline — not a
            manufactured accuracy win — while delivering a decisive, reproducible
            advantage in catalog coverage, personalization, and cold-start item
            reach. Both the leakage bug that once made it look better than it is,
            and the fix, are part of the reported story.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all hover:scale-105 shadow-lg shadow-indigo-500/30"
          >
            See the full statistical breakdown
            <ArrowRight className="h-5 w-5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
