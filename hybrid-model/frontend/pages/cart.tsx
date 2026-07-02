import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/ui/Navbar';
import { LoginModal } from '../components/ui/LoginModal';
import { ArrowLeft, Trash2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { items, removeFromCart, total, clearCart } = useCart();
  const { isAuthenticated, userId } = useAuth();
  
  const [showLogin, setShowLogin] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auth Wall check on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLogin(true);
    }
  }, [isAuthenticated]);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    // Simulate recording the purchase for the Analyzer
    const purchases = JSON.parse(localStorage.getItem('user_purchases') || '[]');
    const newPurchases = items.map(i => i.product_id);
    localStorage.setItem('user_purchases', JSON.stringify([...purchases, ...newPurchases]));
    
    clearCart();
    setShowSuccess(true);
    
    // Redirect after success
    setTimeout(() => {
      router.push('/');
    }, 3000);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-white">
        <div className="text-center p-8 bg-[#1e2130] rounded-3xl border border-[#353a50]">
          <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
          <p className="text-gray-400">Thank you for your purchase. Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white font-sans flex flex-col">
      <Head>
        <title>Your Cart — NepKart</title>
      </Head>

      <Navbar userId={userId || "U0001"} setUserId={() => {}} />
      <LoginModal isOpen={showLogin} onClose={() => {
        if (!isAuthenticated) router.push('/');
        setShowLogin(false);
      }} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium mb-10 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>

        <h1 className="text-4xl font-extrabold mb-8">Shopping Cart</h1>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Cart Items List */}
          <div className="lg:w-2/3 space-y-6">
            {items.length === 0 ? (
              <div className="bg-[#1e2130] border border-[#353a50] rounded-3xl p-12 text-center">
                <p className="text-gray-400 text-lg">Your cart is empty.</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.product_id} className="bg-[#1e2130] border border-[#353a50] rounded-2xl p-6 flex items-center gap-6">
                  <div className="h-24 w-24 bg-[#252840] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">📦</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                    <p className="text-gray-400 text-sm">Product ID: {item.product_id}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-indigo-400 mb-2">
                      NPR {item.price_npr.toLocaleString()}
                    </div>
                    <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.product_id)}
                    className="p-3 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors ml-4"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Checkout Panel */}
          <div className="lg:w-1/3">
            <div className="bg-[#1e2130] border border-[#353a50] rounded-3xl p-8 sticky top-8">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 text-gray-300 mb-8 border-b border-[#353a50] pb-6">
                <div className="flex justify-between">
                  <span>Subtotal ({items.length} items)</span>
                  <span>NPR {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-400">Free</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>

              <div className="flex justify-between text-2xl font-extrabold text-white mb-8">
                <span>Total</span>
                <span>NPR {total.toLocaleString()}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={items.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              >
                <ShieldCheck className="h-6 w-6" />
                Secure Checkout
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
