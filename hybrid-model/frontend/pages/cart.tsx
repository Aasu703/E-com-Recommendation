import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCart } from '../contexts/CartContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { Navbar } from '../components/ui/Navbar';
import { ArrowLeft, Trash2, Minus, Plus, ShieldCheck } from 'lucide-react';

export default function CartPage() {
  const { user, isLoading } = useRequireAuth();
  const { items, removeFromCart, updateQuantity, total } = useCart();
  const router = useRouter();

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Head>
        <title>Your Cart — NepKart</title>
      </Head>

      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>

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
                  onClick={() => router.push('/checkout')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <ShieldCheck className="h-5 w-5" />
                  Proceed to Checkout
                </button>
              </div>
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
