import { useSimilarProducts } from "../../hooks/useRecommendations";
import { RecommendationCard } from "./RecommendationCard";

export function SimilarItems({ productId, currentProductName, topK = 6 }: { productId: string; currentProductName: string; topK?: number }) {
  const { recommendations, isLoading } = useSimilarProducts(productId, topK);
  if (!isLoading && recommendations.length === 0) return <div className="panel">No similar products found for {currentProductName}</div>;
  return <section className="panel"><h2>Similar products</h2><div className="grid">{recommendations.map((p) => <RecommendationCard key={p.product_id} product={p} />)}</div></section>;
}
