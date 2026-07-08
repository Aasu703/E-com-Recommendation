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
  logInteraction,
} from "../lib/rec-api";

export function useInteract() {
  const { mutate } = useSWRConfig();
  return async (userId: string, productId: string, interactionType: string = "view", topK: number = 8, month: number = 10) => {
    await logInteraction(userId, productId, interactionType);
    // Invalidate hybrid recommendations cache
    mutate(["hybrid", userId, topK, month]);
  };
}

/** Personalized hybrid recommendations for a user. */
export function useHybridRecommendations(userId: string, topK = 10, month?: number) {
  const { data, error, isLoading } = useSWR(
    ["hybrid", userId, topK, month],
    () => getHybridRecommendations(userId, topK, month),
  );
  return {
    recommendations: data?.recommendations ?? [],
    meta: data,
    isLoading,
    isError: !!error,
  };
}

/** Non-personalized baseline (recency) recommendations. */
export function useBaselineRecommendations(userId: string, topK = 10) {
  const { data, error, isLoading } = useSWR(
    ["baseline", userId, topK],
    () => getBaselineRecommendations(userId, topK),
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
