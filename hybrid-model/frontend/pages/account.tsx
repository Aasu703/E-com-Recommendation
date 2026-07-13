import Head from 'next/head';
import { useEffect, useState } from 'react';
import { User, Package, Loader2, Check } from 'lucide-react';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useAccountPreferences, useAccountOrders } from '../hooks/useRecommendations';
import { updatePreferences } from '../lib/rec-api';
import { Navbar } from '../components/ui/Navbar';

const CATEGORIES = [
  { name: 'Traditional Attire', emoji: '🧵' },
  { name: 'Handicrafts & Art', emoji: '🏺' },
  { name: 'Electronics', emoji: '📱' },
  { name: 'Kitchen & Home', emoji: '🍳' },
  { name: 'Daily Groceries', emoji: '🛒' },
  { name: 'Fashion & Accessories', emoji: '👜' },
  { name: 'Books & Education', emoji: '📚' },
];

export default function AccountPage() {
  const { user, isLoading } = useRequireAuth();
  const { preferredCategories, isLoading: prefsLoading, mutate: mutatePrefs } = useAccountPreferences(!!user);
  const { orders, isLoading: ordersLoading } = useAccountOrders(!!user);

  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!prefsLoading) setSelected(preferredCategories);
  }, [prefsLoading, preferredCategories]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  const toggleCategory = (name: string) => {
    setSaved(false);
    setSelected((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const handleSave = async () => {
    if (selected.length < 3) return;
    setSaving(true);
    try {
      await updatePreferences(selected);
      await mutatePrefs();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Head>
        <title>My Account — NepKart</title>
      </Head>

      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-10">
        <section className="bg-white border border-slate-200 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <User className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold">My Account</h1>
          </div>
          <p className="text-slate-500 text-sm mb-6">
            {user.name} &middot; {user.email}
          </p>
          <p className="text-xs text-slate-400">User ID: {user.user_id} &middot; Member since {new Date(user.created_at).toLocaleDateString()}</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-3xl p-8">
          <h2 className="text-xl font-bold mb-2">Preferred Categories</h2>
          <p className="text-slate-500 text-sm mb-6">
            These drive your content-based recommendations. Pick at least 3.
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

          <button
            type="button"
            onClick={handleSave}
            disabled={selected.length < 3 || saving}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saved && !saving && <Check className="h-4 w-4" />}
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save preferences'}
          </button>
        </section>

        <section id="orders" className="bg-white border border-slate-200 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <Package className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold">Order History</h2>
          </div>

          {ordersLoading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="text-slate-500 text-sm">No orders yet.</p>
          ) : (
            <div className="space-y-4">
              {[...orders].reverse().map((order) => (
                <div key={order.order_id} className="border border-slate-100 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono font-bold text-indigo-600 text-sm">{order.order_id}</span>
                    <span className="text-xs text-slate-400">{new Date(order.placed_at).toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {order.items.map((item) => (
                      <div key={item.product_id} className="flex justify-between text-sm text-slate-600">
                        <span>{item.name} × {item.quantity}</span>
                        <span>NPR {(item.price_npr * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-3">
                    <span>Total</span>
                    <span>NPR {order.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-slate-500 text-sm">
        <p>© 2026 NepKart Recommendation System Thesis. All rights reserved.</p>
      </footer>
    </div>
  );
}
