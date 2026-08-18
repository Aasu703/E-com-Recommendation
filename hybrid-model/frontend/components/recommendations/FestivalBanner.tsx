/**
 * FestivalBanner — highlighted section for Dashain/Tihar seasonal picks.
 * Only renders when the selected month is 10 (Dashain) or 11 (Tihar).
 */

import type { RecommendedProduct } from "../../lib/rec-api";
import { ProductCard } from "./ProductCard";

interface FestivalBannerProps {
  month: number;
  products: RecommendedProduct[];
  isLoading: boolean;
}

const FESTIVAL_NAMES: Record<number, { name: string; description: string }> = {
  10: {
    name: "Dashain",
    description: "Culturally relevant categories receive a +0.25 seasonal score boost.",
  },
  11: {
    name: "Tihar",
    description: "Culturally relevant categories receive a +0.25 seasonal score boost.",
  },
};

export function FestivalBanner({ month, products, isLoading }: FestivalBannerProps) {
  const festival = FESTIVAL_NAMES[month];
  if (!festival) return null;

  const festivalProducts = products.filter((p) => p.is_festival_recommendation);
  if (!isLoading && festivalProducts.length === 0) return null;

  return (
    <div className="festival-banner">
      <div className="festival-banner-header">
        <h2>{festival.name} Special Picks</h2>
      </div>
      <div className="festival-banner-subtitle">{festival.description}</div>
      <div className="product-grid">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div className="product-card" key={i}>
                <div className="skeleton" />
              </div>
            ))
          : festivalProducts.slice(0, 6).map((product) => (
              <ProductCard key={product.product_id} product={product} showScores={true} />
            ))}
      </div>
    </div>
  );
}
