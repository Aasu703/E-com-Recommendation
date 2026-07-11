/**
 * RecommendationGrid — renders a grid of ProductCards with a title.
 * Shows skeleton loading placeholders while data is being fetched.
 */

import type { RecommendedProduct } from "../../lib/rec-api";
import { ProductCard } from "./ProductCard";

interface RecommendationGridProps {
  title: string;
  subtitle?: string;
  products: RecommendedProduct[];
  isLoading: boolean;
  showScores?: boolean;
}

export function RecommendationGrid({
  title,
  subtitle,
  products,
  isLoading,
  showScores = true,
}: RecommendationGridProps) {
  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <div className="section-subtitle">{subtitle}</div>}
        </div>
        <div className="section-subtitle">{products.length} products</div>
      </div>

      <div className="product-grid">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div className="product-card" key={i}>
                <div className="skeleton" />
                <div className="skeleton-text medium" style={{ marginTop: 12 }} />
                <div className="skeleton-text short" />
              </div>
            ))
          : products.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                showScores={showScores}
              />
            ))}
      </div>
    </div>
  );
}
