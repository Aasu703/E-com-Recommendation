import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useCart, type CartItem } from '../contexts/CartContext';
import { useDemoUser } from '../contexts/DemoUserContext';
import { useUsers, useInteract } from '../hooks/useRecommendations';
import { Navbar } from '../components/ui/Navbar';
import { ArrowLeft, Trash2, Minus, Plus, ShieldCheck, CheckCircle2, Truck, Loader2 } from 'lucide-react';

type Step = 'cart' | 'payment' | 'success';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', emoji: '💵' },
  { id: 'esewa', label: 'eSewa', emoji: '📱' },
  { id: 'khalti', label: 'Khalti', emoji: '💜' },
];

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { userId } = useDemoUser();
  const { users } = useUsers();
  const logInteraction = useInteract();

  const [step, setStep] = useState<Step>('cart');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [orderRecap, setOrderRecap] = useState<{ items: CartItem[]; total: number } | null>(null);

  const currentUser = users.find((u) => u.user_id === userId);
  const deliveryCity = currentUser?.city ?? 'Kathmandu';

  const handlePlaceOrder = async () => {
    setPlacing(true);
    const snapshot = { items: [...items], total };
    try {
      for (const item of items) {
        await logInteraction(userId, item.product_id, 'purchase');
      }
    } finally {
      setOrderRecap(snapshot);
      setOrderId(`ORD-${Date.now().toString(36).toUpperCase()}`);
      clearCart();
      setPlacing(false);
      setStep('success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Head>
        <title>Your Cart — NepKart</title>
      </Head>

      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {step !== 'success' && (
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Link>
        )}

        {/* ── Step: Cart Review ── */}
        {step === 'cart' && (
          <>
            <h1 className="text-4xl font-extrabold mb-8">Shopping Cart</h1>

            {items.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                <p className="text-slate-500 text-lg mb-4">Your cart is empty.</p>
                <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700">
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-10">
                <div className="lg:w-2/3 space-y-4">
                  {items.map((item) => (
                    <div key={item.product_id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-5">
                      <div className="h-20 w-20 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl">
                        📦
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{item.name}</h3>
                        <p className="text-slate-400 text-xs mt-1">Product ID: {item.product_id}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-extrabold text-indigo-600 mb-2">
                          NPR {(item.price_npr * item.quantity).toLocaleString()}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="lg:w-1/3">
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 sticky top-24">
                    <h2 className="text-xl font-bold mb-6">Order Summary</h2>
                    <div className="space-y-3 text-slate-600 text-sm mb-6 border-b border-slate-100 pb-6">
                      <div className="flex justify-between">
                        <span>Subtotal ({items.length} items)</span>
                        <span>NPR {total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span className="text-green-600 font-semibold">Free</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>Calculated at checkout</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-2xl font-extrabold mb-8">
                      <span>Total</span>
                      <span>NPR {total.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => setStep('payment')}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                    >
                      <ShieldCheck className="h-5 w-5" />
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Step: Payment ── */}
        {step === 'payment' && (
          <div className="max-w-xl mx-auto">
            <h1 className="text-3xl font-extrabold mb-8">Checkout</h1>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 flex items-center gap-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">Delivering to {deliveryCity}</div>
                <div className="text-slate-400 text-xs">Signed in as {currentUser?.name ?? 'Guest Visitor'}</div>
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

            <div className="flex gap-3">
              <button
                onClick={() => setStep('cart')}
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
        )}

        {/* ── Step: Success ── */}
        {step === 'success' && orderRecap && (
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
