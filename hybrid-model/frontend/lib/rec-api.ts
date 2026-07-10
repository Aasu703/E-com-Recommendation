/**
 * API client for the Nepali E-Commerce Recommendation backend.
 *
 * Provides typed fetch wrappers for:
 *  - Hybrid recommendations (personalized)
 *  - Baseline recommendations (non-personalized, recency-based)
 *  - Content-based similar products
 *  - Globally popular products
 */

const API_BASE = process.env.NEXT_PUBLIC_REC_API_URL ?? "http://localhost:8000";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RecommendedProduct {
  product_id: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  price_npr: number;
  price_formatted: string;
  avg_rating: number | null;
  in_stock: boolean;
  is_new_arrival: boolean;
  hybrid_score: number;
  cf_score: number;
  cb_score: number;
  alpha_used: number;
  is_festival_recommendation: boolean;
  freshness_boost_applied: boolean;
}

export interface RecommendationResponse {
  user_id: string;
  recommendations: RecommendedProduct[];
  model_version: string;
  context: Record<string, unknown>;
  generated_at: string;
  cached: boolean;
}

export interface SimilarProductsResponse {
  product_id: string;
  seed_product_name: string;
  similar_products: RecommendedProduct[];
  generated_at: string;
  cached: boolean;
}

export interface Product {
  product_id: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  description: string;
  price_npr: number;
  avg_rating: number | null;
  rating_count: number;
  tags: string;
  is_new_arrival: boolean;
  in_stock: boolean;
}

export interface User {
  user_id: string;
  name: string;
  city: string;
  age: number;
  gender: string;
  user_type: string;
  preferred_categories: string;
  joined_date: string;
  is_verified: boolean;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  redis_connected: boolean;
  db_connected: boolean;
  uptime_seconds: number;
  model_version: string;
}

/* ------------------------------------------------------------------ */
/*  Fetch helper                                                       */
/* ------------------------------------------------------------------ */

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  API functions                                                      */
/* ------------------------------------------------------------------ */

/** Personalized hybrid recommendations for a user. */
export async function getHybridRecommendations(
  userId: string,
  topK = 10,
  month?: number,
): Promise<RecommendationResponse> {
  const params = new URLSearchParams({ top_k: String(topK) });
  if (month) params.set("month", String(month));
  return fetchJson(`/api/v1/recommend/user/${userId}?${params}`);
}

/** Non-personalized baseline (recency) recommendations. */
export async function getBaselineRecommendations(
  userId: string,
  topK = 10,
): Promise<RecommendationResponse> {
  return fetchJson(`/api/v1/recommend/baseline/user/${userId}?top_k=${topK}`);
}

/** Content-based similar products for a seed product. */
export async function getSimilarProducts(
  productId: string,
  topK = 8,
): Promise<SimilarProductsResponse> {
  return fetchJson(`/api/v1/recommend/product/${productId}/similar?top_k=${topK}`);
}

/** Globally popular products, optionally filtered to a single category. */
export async function getPopularProducts(
  topK = 10,
  category?: string,
): Promise<RecommendationResponse> {
  const params = new URLSearchParams({ top_k: String(topK) });
  if (category) params.set("category", category);
  return fetchJson(`/api/v1/recommend/popular?${params}`);
}

/** List all users for the demo selector. */
export async function getUsers(limit = 300): Promise<User[]> {
  return fetchJson(`/api/v1/users?limit=${limit}`);
}

/** Fetch a single product by id. */
export async function getProductById(productId: string): Promise<Product> {
  return fetchJson(`/api/v1/products/${productId}`);
}

/** Health check endpoint. */
export async function getHealth(): Promise<HealthResponse> {
  return fetchJson("/health");
}

/** Log a user interaction to the backend */
export async function logInteraction(userId: string, productId: string, interactionType: string = "view") {
  const res = await fetch(`${API_BASE}/api/v1/recommend/interact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      user_id: userId,
      product_id: productId,
      interaction_type: interactionType
    })
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}
