import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useCart, type CartItem } from '../contexts/CartContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useInteract } from '../hooks/useRecommendations';
import { placeOrder } from '../lib/rec-api';
import { Navbar } from '../components/ui/Navbar';
import { ShieldCheck, CheckCircle2, Truck, Loader2 } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', emoji: '💵' },
  { id: 'esewa', label: 'eSewa', emoji: '📱' },
  { id: 'khalti', label: 'Khalti', emoji: '💜' },
];

export default function CheckoutPage() {
  const { user, isLoading } = useRequireAuth();
  const { items, total, clearCart } = useCart();
  const logInteraction = useInteract();
  const router = useRouter();

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState('');
  const [orderRecap, setOrderRecap] = useState<{ items: CartItem[]; total: number } | null>(null);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (items.length === 0 && !orderRecap) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <Navbar />
        <main className="max-w-xl mx-auto px-4 py-24 text-center">
          <p className="text-slate-500 text-lg mb-4">Your cart is empty.</p>
          <Link href="/" className="text-indigo-600 font-bold hover:text-indigo-700">
            Start Shopping
          </Link>
        </main>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setError(null);
    const snapshot = { items: [...items], total };
    try {
      const order = await placeOrder(
        items.map((i) => ({ product_id: i.product_id, name: i.name, price_npr: i.price_npr, quantity: i.quantity })),
        total,
      );
      for (const item of items) {
        await logInteraction(user.user_id, item.product_id, 'purchase');
      }
      setOrderRecap(snapshot);
      setOrderId(order.order_id);
      clearCart();
    } catch {
      setError('Could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Head>
        <title>Checkout — NepKart</title>
      </Head>

      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {!orderRecap ? (
          <div className="max-w-xl mx-auto">
            <h1 className="text-3xl font-extrabold mb-8">Checkout</h1>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 flex items-center gap-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">Delivering to Kathmandu</div>
                <div className="text-slate-400 text-xs">Signed in as {user.name}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
              <h2 className="font-bold mb-4">Payment Method</h2>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === m.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={m.id}
                      checked={paymentMethod === m.id}
                      onChange={() => setPaymentMethod(m.id)}
                      className="accent-indigo-600"
                    />
                    <span className="text-lg">{m.emoji}</span>
                    <span className="font-semibold text-sm">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
              <div className="flex justify-between text-xl font-extrabold">
                <span>Total</span>
                <span>NPR {total.toLocaleString()}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/cart')}
                disabled={placing}
                className="px-6 py-4 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50"
              >
                {placing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                {placing ? 'Placing Order…' : 'Place Order'}
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto text-center">
            <div className="bg-white border border-slate-200 rounded-3xl p-10">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h1 className="text-3xl font-extrabold mb-2">Order Placed!</h1>
              <p className="text-slate-500 mb-1">Order ID</p>
              <p className="font-mono font-bold text-indigo-600 text-lg mb-8">{orderId}</p>

              <div className="text-left border-t border-slate-100 pt-6 space-y-2 mb-6">
                {orderRecap.items.map((item) => (
                  <div key={item.product_id} className="flex justify-between text-sm text-slate-600">
                    <span>{item.name} × {item.quantity}</span>
                    <span>NPR {(item.price_npr * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xl font-extrabold border-t border-slate-100 pt-6 mb-8">
                <span>Total Paid</span>
                <span>NPR {orderRecap.total.toLocaleString()}</span>
              </div>

              <p className="text-slate-400 text-xs mb-8">
                This purchase has been logged as real feedback to the hybrid recommender — your next
                recommendations will reflect it.
              </p>

              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-slate-500 text-sm">
        <p>© 2026 NepKart Recommendation System Thesis. All rights reserved.</p>
      </footer>
    </div>
  );
}
