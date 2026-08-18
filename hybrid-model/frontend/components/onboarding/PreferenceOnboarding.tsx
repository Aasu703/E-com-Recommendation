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

interface PreferenceOnboardingProps {
  /** 'demo' (default): the original cold-start dropdown-persona modal, unchanged.
   *  'register': embedded (non-modal) category quiz, step 2 of real signup. */
  mode?: 'demo' | 'register';
  /** register mode only: called with the chosen categories on confirm. */
  onComplete?: (categories: string[]) => void;
  /** register mode only: disables the confirm button while the parent submits. */
  submitting?: boolean;
}

export function PreferenceOnboarding({ mode = 'demo', onComplete, submitting: externalSubmitting }: PreferenceOnboardingProps = {}) {
  const demo = useDemoUser();
  const [selected, setSelected] = useState<string[]>([]);
  const [seeding, setSeeding] = useState(false);

  if (mode === 'demo' && !demo.showOnboarding) return null;

  const submitting = mode === 'register' ? !!externalSubmitting : seeding;

  const toggleCategory = (name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= 3) return prev;
      return [...prev, name];
    });
  };

  const handleConfirm = async () => {
    if (mode === 'register') {
      onComplete?.(selected);
      return;
    }
    setSeeding(true);
    try {
      for (const category of selected) {
        const popular = await getPopularProducts(1, category);
        const product = popular.recommendations[0];
        if (product) {
          await logInteraction(demo.userId, product.product_id, 'view');
        }
      }
    } catch {
      // Demo seeding is best-effort — even a failed seed still lands on cold-start defaults.
    } finally {
      setSeeding(false);
      demo.completeOnboarding();
    }
  };

  const isValid = mode === 'register' ? selected.length >= 3 : selected.length > 0;
  const body = (
    <div className={mode === 'demo' ? 'w-full max-w-lg rounded-3xl bg-white shadow-2xl p-8' : 'w-full'}>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100 text-teal-800 font-medium text-xs w-fit mb-5">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{mode === 'register' ? 'Personalize Your Feed' : 'Cold-Start Personalization Demo'}</span>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        {mode === 'register' ? 'What are you into?' : 'Welcome to NepKart!'}
      </h2>
      <p className="text-slate-500 mb-6">
        {mode === 'register'
          ? 'Pick 3 categories so your first "Recommended for You" is relevant from the start, instead of generic.'
          : "You're a brand-new visitor with no browsing history. Tell us what you're into and our hybrid AI will personalize your picks instantly — instead of showing you the same generic list everyone else sees."}
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
                  ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-lg">{c.emoji}</span>
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 mb-6">
        {mode === 'register' ? 'Pick exactly 3 categories.' : 'Pick 1–3 categories.'}
      </p>

      <div className="flex gap-3">
        {mode === 'demo' && (
          <button
            type="button"
            onClick={demo.skipOnboarding}
            disabled={submitting}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Skip for now
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isValid || submitting}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'register' ? 'Continue' : submitting ? 'Personalizing…' : 'Show me picks'}
        </button>
      </div>
    </div>
  );

  if (mode === 'register') return body;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      {body}
    </div>
  );
}
