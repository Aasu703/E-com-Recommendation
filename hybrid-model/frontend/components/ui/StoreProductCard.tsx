import { useState } from 'react';
import { useRouter } from 'next/router';
import { Star, ShoppingCart, Check } from 'lucide-react';
import type { RecommendedProduct } from '../../lib/rec-api';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCartGate } from '../../contexts/CartGateContext';
import { useInteract } from '../../hooks/useRecommendations';

interface StoreProductCardProps {
  product: RecommendedProduct;
  /** false only for the /demo persona-switcher, where cart is never auth-gated. */
  gated?: boolean;
  /** required when gated=false: the demo persona to log the interaction against. */
  userId?: string;
}

export function StoreProductCard({ product, gated = true, userId }: StoreProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { requestAdd } = useCartGate();
  const logInteraction = useInteract();
  const [justAdded, setJustAdded] = useState(false);

  const effectiveUserId = gated ? user?.user_id : userId;

  const handleCardClick = () => {
    if (effectiveUserId) logInteraction(effectiveUserId, product.product_id, 'click');
    router.push(`/product/${product.product_id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.in_stock) return;

    const cartItem = { product_id: product.product_id, name: product.name, price_npr: product.price_npr };

    if (gated && !user) {
      requestAdd(cartItem);
      return;
    }

    addToCart(cartItem);
    if (effectiveUserId) logInteraction(effectiveUserId, product.product_id, 'add_to_cart');
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group bg-white border border-slate-200 hover:border-teal-400 rounded-2xl p-4 transition-colors flex flex-col h-full relative overflow-hidden cursor-pointer"
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
        <h3 className="text-slate-800 font-bold text-lg mb-1 leading-tight group-hover:text-teal-700 transition-colors">
          {product.name}
        </h3>
        <p className="text-slate-500 text-sm mb-3">
          {product.category} · {product.brand}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xl font-extrabold text-teal-700">
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
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            justAdded
              ? 'bg-green-500 text-white'
              : product.in_stock
              ? 'bg-teal-50 text-teal-700 hover:bg-teal-700 hover:text-white'
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
