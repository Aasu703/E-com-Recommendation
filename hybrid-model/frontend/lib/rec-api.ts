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
  image_url?: string | null;
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
  image_url?: string | null;
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

export interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  preferred_categories: string[];
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

/* ------------------------------------------------------------------ */
/*  Fetch helper                                                       */
/* ------------------------------------------------------------------ */

let authToken: string | null = null;

/** Set (or clear) the bearer token attached to every subsequent request. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
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

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductListParams {
  category?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort?: "price_asc" | "price_desc" | "rating" | "newest";
  page?: number;
  limit?: number;
}

/** Full catalogue: filterable, searchable, sortable, paginated. */
export async function getProducts(params: ProductListParams = {}): Promise<ProductListResponse> {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.q) search.set("q", params.q);
  if (params.min_price != null) search.set("min_price", String(params.min_price));
  if (params.max_price != null) search.set("max_price", String(params.max_price));
  if (params.in_stock != null) search.set("in_stock", String(params.in_stock));
  if (params.sort) search.set("sort", params.sort);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  return fetchJson(`/api/v1/products?${search.toString()}`);
}

/** Unique category list, sourced from the catalog (never hardcoded independently). */
export async function getCategories(): Promise<string[]> {
  return fetchJson("/api/v1/products/categories");
}

/** Health check endpoint. */
export async function getHealth(): Promise<HealthResponse> {
  return fetchJson("/health");
}

/** Log a user interaction to the backend */
export async function logInteraction(userId: string, productId: string, interactionType: string = "view") {
  return fetchJson(`/api/v1/recommend/interact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      product_id: productId,
      interaction_type: interactionType,
    }),
  });
}

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  preferred_categories: string[];
}

/** Register a new real account; auto-authenticates on success. */
export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  return fetchJson("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Log in with email + password. */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  return fetchJson("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

/** Fetch the currently authenticated user's profile. */
export async function fetchMe(): Promise<UserProfile> {
  return fetchJson("/api/v1/auth/me");
}

/* ------------------------------------------------------------------ */
/*  Account (preferences + orders) — auth required                    */
/* ------------------------------------------------------------------ */

export interface OrderItem {
  product_id: string;
  name: string;
  price_npr: number;
  quantity: number;
}

export interface Order {
  order_id: string;
  items: OrderItem[];
  total: number;
  placed_at: string;
}

export async function getPreferences(): Promise<{ preferred_categories: string[] }> {
  return fetchJson("/api/v1/account/preferences");
}

export async function updatePreferences(preferred_categories: string[]): Promise<{ preferred_categories: string[] }> {
  return fetchJson("/api/v1/account/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferred_categories }),
  });
}

export async function getOrders(): Promise<{ orders: Order[] }> {
  return fetchJson("/api/v1/account/orders");
}

export async function placeOrder(items: OrderItem[], total: number): Promise<Order> {
  return fetchJson("/api/v1/account/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, total }),
  });
}
