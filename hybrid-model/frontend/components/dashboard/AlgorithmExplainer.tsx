/**
 * AlgorithmExplainer — visual breakdown of the hybrid recommendation algorithm.
 *
 * Explains each component of the system:
 *  - Collaborative Filtering (SVD)
 *  - Content-Based Filtering (TF-IDF + Cosine Similarity)
 *  - Adaptive Alpha (cold-start handling)
 *  - Festival-Aware Boosting (Dashain/Tihar)
 */

export function AlgorithmExplainer() {
  return (
    <div className="algorithm-section">
      <div className="section-header">
        <div>
          <h2>🧠 How the Hybrid Model Works</h2>
          <div className="section-subtitle">
            Weighted hybrid approach combining collaborative and content-based filtering
          </div>
        </div>
      </div>

      <div className="formula-box">
        Score(u, i) = α · CF(u, i) + (1 − α) · CB(u, i) + Freshness + FestivalBoost
        <br />
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          where α = U_c / (U_c + γ) &nbsp;|&nbsp; γ = 3 (cold-start threshold)
        </span>
      </div>

      <div className="algorithm-grid" style={{ marginTop: 20 }}>
        <div className="algorithm-card">
          <div className="algorithm-card-icon" style={{ background: "var(--accent-glow)" }}>
            👥
          </div>
          <h3>Collaborative Filtering (SVD)</h3>
          <p>
            Decomposes the user-item interaction matrix using Singular Value Decomposition
            with k=20 latent factors. Captures implicit preferences from user behavior
            (views, cart, purchases). Includes mean-centering and popularity fallback for cold-start users.
          </p>
        </div>

        <div className="algorithm-card">
          <div className="algorithm-card-icon" style={{ background: "var(--info-bg)" }}>
            📄
          </div>
          <h3>Content-Based Filtering (TF-IDF)</h3>
          <p>
            Builds TF-IDF vectors from product metadata (description, tags, category, brand)
            with up to 3,000 features and bigrams. Computes pairwise cosine similarity
            to find products similar to the user's last interaction.
          </p>
        </div>

        <div className="algorithm-card">
          <div className="algorithm-card-icon" style={{ background: "var(--success-bg)" }}>
            ⚖️
          </div>
          <h3>Adaptive Alpha (α)</h3>
          <p>
            Dynamically balances CF vs CB using the saturation curve α = U_c / (U_c + γ).
            New users (few interactions) get more content-based recommendations.
            Active users get more collaborative recommendations.
            New arrivals further reduce alpha by 50% to favor discovery.
          </p>
        </div>

        <div className="algorithm-card">
          <div className="algorithm-card-icon" style={{ background: "var(--festival-bg)" }}>
            🎉
          </div>
          <h3>Festival-Aware Boosting</h3>
          <p>
            During Dashain (month 10) and Tihar (month 11), products in culturally relevant
            categories (Traditional Attire, Kitchen & Home, Handicrafts, Electronics, etc.)
            receive a +0.25 score boost. New arrivals get a +0.08 freshness boost year-round.
          </p>
        </div>
      </div>
    </div>
  );
}
