import useSWR from "swr";
import { getPopularProducts, getRecommendationsForUser, getSimilarProducts } from "../lib/rec-api";

export function useUserRecommendations(userId: string, topK = 10, month?: number) {
  const { data, error, isLoading } = useSWR(["user", userId, topK, month], () => getRecommendationsForUser(userId, topK, month));
  return { recommendations: data?.recommendations ?? [], meta: data, isLoading, isError: error };
}

export function useSimilarProducts(productId: string, topK = 8) {
  const { data, error, isLoading } = useSWR(["similar", productId, topK], () => getSimilarProducts(productId, topK));
  return { recommendations: data?.recommendations ?? [], isLoading, isError: error };
}

export function usePopularProducts(topK = 10) {
  const { data, error, isLoading } = useSWR(["popular", topK], () => getPopularProducts(topK));
  return { recommendations: data?.recommendations ?? [], isLoading, isError: error };
}
