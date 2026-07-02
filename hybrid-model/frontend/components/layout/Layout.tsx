/**
 * Layout — wraps every page. Removed internal navbar/footer to avoid conflicts with Storefront components.
 */

import type { PropsWithChildren } from "react";
import { useHealth } from "../../hooks/useRecommendations";

export function Layout({ children }: PropsWithChildren) {
  useHealth(); // Keep fetching health in background

  return <>{children}</>;
}
