import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { PreferenceOnboarding } from '../components/onboarding/PreferenceOnboarding';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState<'details' | 'categories'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setStep('categories');
  };

  const handleCategoriesComplete = async (categories: string[]) => {
    if (categories.length < 3) {
      setError('Select at least 3 categories.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register({ email, password, name, preferred_categories: categories });
      const next = typeof router.query.next === 'string' ? router.query.next : '/';
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
      setStep('details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <Head>
        <title>Create Account — NepKart</title>
      </Head>
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-8">
        {step === 'details' ? (
          <>
            <Link href="/" className="flex items-center gap-2 mb-8 w-fit">
              <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold text-xl">
                N
              </div>
              <span className="text-xl font-bold text-slate-900">
                NepKart
              </span>
            </Link>

            <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
            <p className="text-slate-500 mb-6">Step 1 of 2 — your details.</p>

            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <p className="text-xs text-slate-400 mt-1">At least 8 characters.</p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all"
              >
                Continue
              </button>
            </form>

            <p className="text-sm text-slate-500 mt-6 text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-teal-700 font-semibold hover:text-teal-800">
                Log in
              </Link>
            </p>
          </>
        ) : (
          <>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <PreferenceOnboarding mode="register" onComplete={handleCategoriesComplete} submitting={submitting} />
            <button
              type="button"
              onClick={() => setStep('details')}
              disabled={submitting}
              className="mt-4 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              &larr; Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
