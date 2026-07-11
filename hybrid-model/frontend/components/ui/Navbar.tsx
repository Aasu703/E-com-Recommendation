import Link from 'next/link';
import { ShoppingCart, Search, User, Menu, UserPlus } from 'lucide-react';
import { useUsers } from '../../hooks/useRecommendations';
import { useDemoUser } from '../../contexts/DemoUserContext';
import { useCart } from '../../contexts/CartContext';

export function Navbar() {
  const { users } = useUsers();
  const { userId, setUserId, startAsNewVisitor } = useDemoUser();
  const { items } = useCart();

  const currentUser = users.find((u) => u.user_id === userId);
  const displayName = userId.startsWith('GUEST-') ? 'Guest Visitor' : currentUser?.name ?? '...';
  const cartCount = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-lg bg-white/80 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] transition-all">
                N
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                NepKart
              </span>
            </Link>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full bg-slate-100 border border-transparent rounded-full py-2 px-4 pl-10 text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                <User className="h-3.5 w-3.5" />
                Signed in as {displayName}
              </span>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="bg-transparent text-sm text-slate-600 font-medium focus:outline-none cursor-pointer"
              >
                {userId.startsWith('GUEST-') && (
                  <option value={userId} className="bg-white text-slate-900">
                    New Visitor ({userId})
                  </option>
                )}
                {users.slice(0, 20).map(u => (
                  <option key={u.user_id} value={u.user_id} className="bg-white text-slate-900">
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={startAsNewVisitor}
                title="Restart as a new visitor (cold-start demo)"
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden lg:inline">New Visitor</span>
              </button>
            </div>

            <Link href="/cart" className="relative text-slate-500 hover:text-indigo-600 transition-colors">
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>
            <button className="md:hidden text-slate-500">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
