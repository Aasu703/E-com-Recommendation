import { useState } from 'react';
import { Loader2, Lock, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useCartGate } from '../../contexts/CartGateContext';
import { useInteract } from '../../hooks/useRecommendations';
import { PreferenceOnboarding } from '../onboarding/PreferenceOnboarding';

type Mode = 'login' | 'register-details' | 'register-categories';

/** Mounted once (in _app.tsx). Gated add-to-cart opens this instead of
 * bouncing to a full page; on success the pending item is added and logged
 * automatically and the shopper stays on the same page. */
export function AuthGateModal() {
  const { pending, clear } = useCartGate();
  const { login, register } = useAuth();
  const { addToCart } = useCart();
  const logInteraction = useInteract();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!pending) return null;

  const reset = () => {
    setMode('login');
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    clear();
    reset();
  };

  const completeAdd = (userId: string) => {
    addToCart(pending);
    logInteraction(userId, pending.product_id, 'add_to_cart');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const profile = await login(email, password);
      completeAdd(profile.user_id);
      handleClose();
    } catch {
      setError('Invalid email or password.');
      setSubmitting(false);
    }
  };

  const handleRegisterDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setMode('register-categories');
  };

  const handleRegisterCategories = async (categories: string[]) => {
    setError(null);
    setSubmitting(true);
    try {
      const profile = await register({ email, password, name, preferred_categories: categories });
      completeAdd(profile.user_id);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
      setMode('register-details');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-8 relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        {mode !== 'register-categories' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 font-medium text-xs w-fit mb-5">
            <Lock className="h-3.5 w-3.5" />
            <span>Sign in to add items to your cart</span>
          </div>
        )}

        {mode === 'login' && (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Log in</h2>
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Logging in…' : 'Log in & add to cart'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('register-details');
              }}
              className="mt-4 text-sm text-slate-500 hover:text-slate-700"
            >
              New here? <span className="text-indigo-600 font-semibold">Create an account</span>
            </button>
          </>
        )}

        {mode === 'register-details' && (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Create your account</h2>
            <form onSubmit={handleRegisterDetails} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all"
              >
                Continue
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('login');
              }}
              className="mt-4 text-sm text-slate-500 hover:text-slate-700"
            >
              Already have an account? <span className="text-indigo-600 font-semibold">Log in</span>
            </button>
          </>
        )}

        {mode === 'register-categories' && (
          <>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <PreferenceOnboarding mode="register" onComplete={handleRegisterCategories} submitting={submitting} />
          </>
        )}
      </div>
    </div>
  );
}
