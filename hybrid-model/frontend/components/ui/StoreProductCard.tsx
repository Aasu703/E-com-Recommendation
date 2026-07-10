import { useState } from 'react';
import { Star, ShoppingCart, Check } from 'lucide-react';
import type { RecommendedProduct } from '../../lib/rec-api';
import { useCart } from '../../contexts/CartContext';
import { useDemoUser } from '../../contexts/DemoUserContext';
import { useInteract } from '../../hooks/useRecommendations';

interface StoreProductCardProps {
  product: RecommendedProduct;
  onInteract?: () => void;
}

export function StoreProductCard({ product, onInteract }: StoreProductCardProps) {
  const { addToCart } = useCart();
  const { userId } = useDemoUser();
  const logInteraction = useInteract();
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.in_stock) return;
    addToCart({ product_id: product.product_id, name: product.name, price_npr: product.price_npr });
    logInteraction(userId, product.product_id, 'cart');
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div
      onClick={onInteract}
      className="group bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl p-4 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col h-full relative overflow-hidden cursor-pointer"
    >
      <div className="flex gap-2 flex-wrap mb-3">
        {product.is_festival_recommendation && (
          <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
            Festival Pick
          </span>
        )}
        {product.is_new_arrival && (
          <span className="bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
            New Arrival
          </span>
        )}
        {!product.in_stock && (
          <span className="bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
            Out of Stock
          </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-slate-800 font-bold text-lg mb-1 leading-tight group-hover:text-indigo-600 transition-colors">
          {product.name}
        </h3>
        <p className="text-slate-500 text-sm mb-3">
          {product.category} · {product.brand}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xl font-extrabold text-indigo-600">
            NPR {product.price_npr.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 text-slate-500 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span>{product.avg_rating != null ? product.avg_rating.toFixed(1) : "N/A"}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!product.in_stock}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            justAdded
              ? 'bg-green-500 text-white'
              : product.in_stock
              ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          {justAdded ? 'Added' : product.in_stock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
}
