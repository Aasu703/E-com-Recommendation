import Link from 'next/link';
import { Star } from 'lucide-react';
import type { RecommendedProduct } from '../../lib/rec-api';

interface StoreProductCardProps {
  product: RecommendedProduct;
}

export function StoreProductCard({ product }: StoreProductCardProps) {
  return (
    <Link 
      href={`/product/${product.product_id}`}
      className="group bg-[#1e2130] border border-[#353a50] hover:border-indigo-500 rounded-2xl p-4 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col h-full relative overflow-hidden"
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
        <h3 className="text-white font-bold text-lg mb-1 leading-tight group-hover:text-indigo-400 transition-colors">
          {product.name}
        </h3>
        <p className="text-gray-500 text-sm mb-3">
          {product.category} · {product.brand}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-[#353a50]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xl font-extrabold text-indigo-400">
            NPR {product.price_npr.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 text-gray-400 text-sm">
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            <span>{product.avg_rating != null ? product.avg_rating.toFixed(1) : "N/A"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
