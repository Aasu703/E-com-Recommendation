import { useState, useEffect } from 'react';
import { useSimilarProducts } from './useRecommendations';

export function useUserAnalyzer() {
  const [lastInteractedId, setLastInteractedId] = useState<string | null>(null);

  useEffect(() => {
    // Check purchases or viewed items
    const purchases = JSON.parse(localStorage.getItem('user_purchases') || '[]');
    if (purchases.length > 0) {
      // Get the most recent purchase
      setLastInteractedId(purchases[purchases.length - 1]);
    }
  }, []);

  // Fetch similar products based on the last interaction
  // We'll skip fetching if there is no interaction by passing a dummy ID or handling it.
  const { recommendations, seedName, isLoading } = useSimilarProducts(
    lastInteractedId || "P0001", // Fallback to P0001 if empty
    4
  );

  return {
    hasHistory: lastInteractedId !== null,
    analyzedProducts: recommendations,
    seedName,
    isLoading
  };
}
