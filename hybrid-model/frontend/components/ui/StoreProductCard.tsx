import Link from 'next/link';
import { Star } from 'lucide-react';
import type { RecommendedProduct } from '../../lib/rec-api';

interface StoreProductCardProps {
  product: RecommendedProduct;
  onInteract?: () => void;
}

export function StoreProductCard({ product, onInteract }: StoreProductCardProps) {
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
        <div className="flex justify-between items-center mb-2">
          <span className="text-xl font-extrabold text-indigo-600">
            NPR {product.price_npr.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 text-slate-500 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span>{product.avg_rating != null ? product.avg_rating.toFixed(1) : "N/A"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
