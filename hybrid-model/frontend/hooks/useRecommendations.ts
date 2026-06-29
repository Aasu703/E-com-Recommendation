/**
 * React hooks for fetching recommendation data via SWR.
 *
 * Each hook wraps a specific API call and provides:
 *  - recommendations: the product list (empty array while loading)
 *  - meta: full response metadata (model version, context, etc.)
 *  - isLoading / isError: request state
 */

import useSWR from "swr";
import {
  getHybridRecommendations,
  getBaselineRecommendations,
  getSimilarProducts,
  getPopularProducts,
  getUsers,
  getHealth,
} from "../lib/rec-api";

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

/** Globally popular products. */
export function usePopularProducts(topK = 10) {
  const { data, error, isLoading } = useSWR(
    ["popular", topK],
    () => getPopularProducts(topK),
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
