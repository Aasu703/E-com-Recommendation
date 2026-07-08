import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useDemoUser } from '../../contexts/DemoUserContext';
import { getPopularProducts, logInteraction } from '../../lib/rec-api';

const CATEGORIES = [
  { name: 'Traditional Attire', emoji: '🧵' },
  { name: 'Handicrafts & Art', emoji: '🏺' },
  { name: 'Electronics', emoji: '📱' },
  { name: 'Kitchen & Home', emoji: '🍳' },
  { name: 'Daily Groceries', emoji: '🛒' },
  { name: 'Fashion & Accessories', emoji: '👜' },
  { name: 'Books & Education', emoji: '📚' },
];

export function PreferenceOnboarding() {
  const { userId, showOnboarding, completeOnboarding, skipOnboarding } = useDemoUser();
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!showOnboarding) return null;

  const toggleCategory = (name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= 3) return prev;
      return [...prev, name];
    });
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      for (const category of selected) {
        const popular = await getPopularProducts(1, category);
        const product = popular.recommendations[0];
        if (product) {
          await logInteraction(userId, product.product_id, 'view');
        }
      }
    } catch {
      // Demo seeding is best-effort — even a failed seed still lands on cold-start defaults.
    } finally {
      setSubmitting(false);
      completeOnboarding();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl p-8">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 font-medium text-xs w-fit mb-5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Cold-Start Personalization Demo</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to NepKart!</h2>
        <p className="text-slate-500 mb-6">
          You&apos;re a brand-new visitor with no browsing history. Tell us what you&apos;re into
          and our hybrid AI will personalize your picks instantly &mdash; instead of showing you
          the same generic list everyone else sees.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {CATEGORIES.map((c) => {
            const isSelected = selected.includes(c.name);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => toggleCategory(c.name)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{c.emoji}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 mb-6">Pick 1&ndash;3 categories.</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={skipOnboarding}
            disabled={submitting}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.length === 0 || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Personalizing…' : 'Show me picks'}
          </button>
        </div>
      </div>
    </div>
  );
}
