/**
 * React hooks for fetching recommendation data via SWR.
 *
 * Each hook wraps a specific API call and provides:
 *  - recommendations: the product list (empty array while loading)
 *  - meta: full response metadata (model version, context, etc.)
 *  - isLoading / isError: request state
 */

import useSWR, { useSWRConfig } from "swr";
import {
  getHybridRecommendations,
  getBaselineRecommendations,
  getSimilarProducts,
  getPopularProducts,
  getUsers,
  getHealth,
  getProductById,
  getPreferences,
  getOrders,
  getProducts,
  getCategories,
  logInteraction,
  type ProductListParams,
} from "../lib/rec-api";

export function useInteract() {
  const { mutate } = useSWRConfig();
  return async (userId: string, productId: string, interactionType: string = "view", topK: number = 8, month: number = 10) => {
    await logInteraction(userId, productId, interactionType);
    // Invalidate hybrid recommendations cache
    mutate(["hybrid", userId, topK, month]);
  };
}

/** Personalized hybrid recommendations for a user (pass null for guests — skips the request). */
export function useHybridRecommendations(userId: string | null, topK = 10, month?: number) {
  const { data, error, isLoading } = useSWR(
    userId ? ["hybrid", userId, topK, month] : null,
    () => getHybridRecommendations(userId as string, topK, month),
  );
  return {
    recommendations: data?.recommendations ?? [],
    meta: data,
    isLoading,
    isError: !!error,
  };
}

/** Non-personalized baseline (recency) recommendations (pass null for guests — skips the request). */
export function useBaselineRecommendations(userId: string | null, topK = 10) {
  const { data, error, isLoading } = useSWR(
    userId ? ["baseline", userId, topK] : null,
    () => getBaselineRecommendations(userId as string, topK),
  );
  return {
    recommendations: data?.recommendations ?? [],
    meta: data,
    isLoading,
    isError: !!error,
  };
}

/** Content-based similar products for a seed product. */
export function useSimilarProducts(productId: string, topK = 8) {
  const { data, error, isLoading } = useSWR(
    ["similar", productId, topK],
    () => getSimilarProducts(productId, topK),
  );
  return {
    recommendations: data?.similar_products ?? [],
    seedName: data?.seed_product_name ?? "",
    isLoading,
    isError: !!error,
  };
}

/** Globally popular products, optionally filtered to a single category. */
export function usePopularProducts(topK = 10, category?: string) {
  const { data, error, isLoading } = useSWR(
    ["popular", topK, category],
    () => getPopularProducts(topK, category),
  );
  return {
    recommendations: data?.recommendations ?? [],
    isLoading,
    isError: !!error,
  };
}

/** All users for demo selector. */
export function useUsers(limit = 300) {
  const { data, error, isLoading } = useSWR(
    ["users", limit],
    () => getUsers(limit),
  );
  return {
    users: data ?? [],
    isLoading,
    isError: !!error,
  };
}

/** System health. */
export function useHealth() {
  const { data, error, isLoading } = useSWR("health", getHealth);
  return { health: data, isLoading, isError: !!error };
}

/** A single product by id (for the product detail page). */
export function useProduct(productId: string) {
  const { data, error, isLoading } = useSWR(
    productId ? ["product", productId] : null,
    () => getProductById(productId),
  );
  return { product: data, isLoading, isError: !!error };
}

/** The current user's preferred categories (account page). */
export function useAccountPreferences(enabled: boolean) {
  const { data, error, isLoading, mutate } = useSWR(enabled ? "account-preferences" : null, getPreferences);
  return { preferredCategories: data?.preferred_categories ?? [], isLoading, isError: !!error, mutate };
}

/** The current user's order history (account page). */
export function useAccountOrders(enabled: boolean) {
  const { data, error, isLoading } = useSWR(enabled ? "account-orders" : null, getOrders);
  return { orders: data?.orders ?? [], isLoading, isError: !!error };
}

/** Filterable/searchable/sortable/paginated catalogue (products page). */
export function useProducts(params: ProductListParams) {
  const { data, error, isLoading } = useSWR(["products", params], () => getProducts(params));
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
  };
}

/** Unique category list for filter UI. */
export function useCategories() {
  const { data, error, isLoading } = useSWR("categories", getCategories);
  return { categories: data ?? [], isLoading, isError: !!error };
}
