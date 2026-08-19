import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const next = typeof router.query.next === 'string' ? router.query.next : '/';
      router.push(next);
    } catch {
      setError('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Head>
        <title>Login — NepKart</title>
      </Head>
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-8">
        <Link href="/" className="flex items-center gap-2 mb-8 w-fit">
          <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold text-xl">
            N
          </div>
          <span className="text-xl font-bold text-slate-900">
            NepKart
          </span>
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
        <p className="text-slate-500 mb-6">Log in to see your personalized recommendations.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center">
          New to NepKart?{' '}
          <Link href="/register" className="text-teal-700 font-semibold hover:text-teal-800">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
