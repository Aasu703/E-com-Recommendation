import Link from 'next/link';
import { ShoppingCart, Search, User, Menu } from 'lucide-react';
import { useUsers } from '../../hooks/useRecommendations';

interface NavbarProps {
  userId: string;
  setUserId: (id: string) => void;
}

export function Navbar({ userId, setUserId }: NavbarProps) {
  const { users } = useUsers();

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-lg bg-[#0f1117]/80 border-b border-[#2a2e3f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] transition-all">
                N
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                NepKart
              </span>
            </Link>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full bg-[#1e2130] border border-[#353a50] rounded-full py-2 px-4 pl-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              <select 
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="bg-transparent text-sm text-gray-300 focus:outline-none cursor-pointer"
              >
                {users.slice(0, 20).map(u => (
                  <option key={u.user_id} value={u.user_id} className="bg-[#1e2130]">
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button className="relative text-gray-300 hover:text-white transition-colors">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                3
              </span>
            </button>
            <button className="md:hidden text-gray-300">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
