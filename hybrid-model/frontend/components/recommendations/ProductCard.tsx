/**
 * ProductCard — premium card displaying a recommended product
 * with score breakdowns from the hybrid model.
 */

import Link from "next/link";
import type { RecommendedProduct } from "../../lib/rec-api";

interface ProductCardProps {
  product: RecommendedProduct;
  /** If true, show detailed score breakdown (CF, CB, alpha). */
  showScores?: boolean;
  /**
   * "vertical" (default) — the original stacked catalog-grid card.
   * "horizontal" — a compact single-row card used by the dashboard's
   * row-by-row Hybrid-vs-Baseline comparison, so many products can be
   * scanned top-to-bottom instead of read as tall side-by-side columns.
   */
  layout?: "vertical" | "horizontal";
}

export function ProductCard({ product, showScores = true, layout = "vertical" }: ProductCardProps) {
  const p = product;

  return (
    <Link
      href={`/product/${p.product_id}`}
      className={`product-card product-card-${layout} ${!p.in_stock ? "out-of-stock" : ""}`}
    >
      {/* display:contents in vertical mode (see styles.css) keeps these three
          wrapper groups invisible to layout so the original stacked order is
          unchanged; horizontal mode turns them into a row of info | meta. */}
      <div className="product-card-main">
        <div className="product-card-info">
          {/* Badges */}
          <div className="product-card-badges">
            {p.is_festival_recommendation && (
              <span className="badge badge-festival">Festival</span>
            )}
            {p.is_new_arrival && (
              <span className="badge badge-new">New</span>
            )}
            {p.freshness_boost_applied && (
              <span className="badge badge-default">Fresh</span>
            )}
            {!p.in_stock && (
              <span className="badge badge-oos">Out of Stock</span>
            )}
          </div>

          {/* Product Info */}
          <div className="product-card-name">{p.name}</div>
          <div className="product-card-category">
            {p.category}{p.brand ? ` · ${p.brand}` : ""}
          </div>
        </div>

        <div className="product-card-meta">
          {/* Rating */}
          <div className="product-card-rating">
            <span className="product-card-star">★</span>
            {p.avg_rating ? p.avg_rating.toFixed(1) : "No rating"}
          </div>

          {/* Price */}
          <div className="product-card-price">{p.price_formatted}</div>
        </div>
      </div>

      {/* Score Breakdown */}
      {showScores && (
        <div className="product-card-scores">
          <div className="score-row">
            <span className="score-label">Hybrid Score</span>
            <span className="score-value highlight">{p.hybrid_score.toFixed(3)}</span>
          </div>
          <div className="score-row">
            <span className="score-label">CF Score</span>
            <span className="score-value">{p.cf_score.toFixed(3)}</span>
          </div>
          <div className="score-row">
            <span className="score-label">CB Score</span>
            <span className="score-value">{p.cb_score.toFixed(3)}</span>
          </div>
          <div className="score-row">
            <span className="score-label">Alpha (α)</span>
            <span className="score-value">{p.alpha_used.toFixed(3)}</span>
          </div>
        </div>
      )}
    </Link>
  );
}
