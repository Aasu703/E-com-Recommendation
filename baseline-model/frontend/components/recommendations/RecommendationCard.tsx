import Link from "next/link";
import { RecommendedProduct } from "../../lib/rec-api";
import { Badge } from "../ui/Badge";

export function RecommendationCard({ product }: { product: RecommendedProduct }) {
  return (
    <Link href={`/product/${product.product_id}`} className={`card ${product.in_stock ? "" : "stock"}`}>
      {product.is_new_arrival && <Badge>New</Badge>}
      <h3>{product.name}</h3>
      <p className="muted">
        {product.category} - {product.brand}
      </p>
      <p className="price">{product.price_formatted}</p>
      <p className="muted">
        Rating {product.avg_rating?.toFixed(1) ?? "new"} - Score {product.hybrid_score.toFixed(2)}
      </p>
      {!product.in_stock && <strong>Out of stock</strong>}
    </Link>
  );
}
