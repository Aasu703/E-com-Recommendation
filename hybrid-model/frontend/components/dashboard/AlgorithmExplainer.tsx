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
          <h2>How the Hybrid Model Works</h2>
          <div className="section-subtitle">
            Weighted blend of collaborative and content-based filtering
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
          <h3>Collaborative Filtering (SVD)</h3>
          <p>
            SVD on the user-item interaction matrix with k=20 latent factors,
            mean-centering and popularity fallback for cold-start users.
          </p>
        </div>

        <div className="algorithm-card">
          <h3>Content-Based Filtering (TF-IDF)</h3>
          <p>
            TF-IDF vectors over product metadata (description, tags, category,
            brand) with up to 3,000 features and bigrams, matched by cosine
            similarity to the user&apos;s last interaction.
          </p>
        </div>

        <div className="algorithm-card">
          <h3>Adaptive Alpha (α)</h3>
          <p>
            Balances CF vs CB via α = U_c / (U_c + γ). New users get more
            content-based picks; active users get more collaborative ones. New
            arrivals further halve alpha to favour discovery.
          </p>
        </div>

        <div className="algorithm-card">
          <h3>Festival-Aware Boosting</h3>
          <p>
            During Dashain (10) and Tihar (11), culturally relevant categories
            get a +0.25 boost. New arrivals get a +0.08 freshness boost
            year-round.
          </p>
        </div>
      </div>
    </div>
  );
}
