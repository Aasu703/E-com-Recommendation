import { useUserRecommendations } from "../../hooks/useRecommendations";
import { Skeleton } from "../ui/Skeleton";
import { RecommendationCard } from "./RecommendationCard";

export function ProductCarousel({ userId, title }: { userId: string; title: string }) {
  const { recommendations, isLoading } = useUserRecommendations(userId, 10);
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="scroll">
        {isLoading ? [1, 2, 3].map((i) => <div className="card" key={i}><Skeleton /></div>) : recommendations.map((p) => <RecommendationCard key={p.product_id} product={p} />)}
      </div>
    </section>
  );
}
