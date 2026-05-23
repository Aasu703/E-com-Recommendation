const REC_API_BASE = process.env.NEXT_PUBLIC_REC_API_URL ?? "http://localhost:8000";

export interface RecommendedProduct {
  product_id: string;
  name: string;
  category: string;
  brand: string;
  price_npr: number;
  price_formatted: string;
  avg_rating: number | null;
  in_stock: boolean;
  is_new_arrival: boolean;
  hybrid_score: number;
  is_festival_recommendation: boolean;
}

export interface RecommendationResponse {
  user_id: string;
  recommendations: RecommendedProduct[];
  model_version: string;
  cached: boolean;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${REC_API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getRecommendationsForUser(userId: string, topK = 10): Promise<RecommendationResponse> {
  return getJson(`/api/v1/recommend/user/${userId}?top_k=${topK}`);
}

export async function getSimilarProducts(productId: string, topK = 8): Promise<RecommendationResponse> {
  const res: any = await getJson(`/api/v1/recommend/product/${productId}/similar?top_k=${topK}`);
  return { user_id: productId, recommendations: res.similar_products, model_version: "1.0.0", cached: res.cached };
}

export async function getPopularProducts(topK = 10): Promise<RecommendationResponse> {
  return getJson(`/api/v1/recommend/popular?top_k=${topK}`);
}
