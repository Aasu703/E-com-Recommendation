import { useEffect, useState } from "react";
import { ProductCarousel } from "../components/recommendations/ProductCarousel";
import { useUserRecommendations } from "../hooks/useRecommendations";

const API = process.env.NEXT_PUBLIC_REC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [userId, setUserId] = useState("U0001");
  const [users, setUsers] = useState<any[]>([]);
  const { recommendations, meta } = useUserRecommendations(userId, 5);

  useEffect(() => {
    fetch(`${API}/api/v1/users`)
      .then((response) => response.json())
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  return (
    <main className="page">
      <div className="hero">
        <div>
          <h1>Baseline Recommendations</h1>
          <p className="muted">Recent-product ranking without personalization.</p>
        </div>
        <p className="muted">
          v{meta?.model_version ?? "baseline-1.0.0"} - cache {String(meta?.cached ?? false)}
        </p>
      </div>

      <div className="toolbar">
        <select value={userId} onChange={(event) => setUserId(event.target.value)}>
          {users.map((user) => (
            <option key={user.user_id} value={user.user_id}>
              {user.user_id} - {user.city}
            </option>
          ))}
        </select>
      </div>

      <ProductCarousel userId={userId} title="Recent products" />

      <section className="panel">
        <h2>Baseline preview</h2>
        <div className="grid">
          {recommendations.map((product) => (
            <div key={product.product_id}>
              <strong>{product.name}</strong>
              <p className="muted">
                {product.category} - {product.price_formatted}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
