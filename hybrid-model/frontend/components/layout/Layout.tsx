/**
<<<<<<< HEAD
 * Layout — wraps every page. Removed internal navbar/footer to avoid conflicts with Storefront components.
=======
 * Layout — wraps every page with a consistent navbar and footer.
>>>>>>> b0cbdba1f8b96ecd4f0dbb3c7b8e48fecda82efb
 */

import type { PropsWithChildren } from "react";
import { useHealth } from "../../hooks/useRecommendations";

export function Layout({ children }: PropsWithChildren) {
<<<<<<< HEAD
  useHealth(); // Keep fetching health in background

  return <>{children}</>;
=======
  const { health } = useHealth();

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-inner">
          <a href="/" className="navbar-brand">
            <span className="navbar-brand-icon">🛒</span>
            Nepali E-Commerce RecSys
          </a>
          <div className="navbar-meta">
            <span className="navbar-status">
              <span className="status-dot" />
              Model {health?.model_loaded ? "Active" : "Loading"}
            </span>
            <span>v{health?.model_version ?? "1.0.0"}</span>
          </div>
        </div>
      </nav>

      {children}

      <footer className="footer">
        Hybrid Recommendation System — Final Year Thesis Project © {new Date().getFullYear()}
      </footer>
    </div>
  );
>>>>>>> b0cbdba1f8b96ecd4f0dbb3c7b8e48fecda82efb
}
