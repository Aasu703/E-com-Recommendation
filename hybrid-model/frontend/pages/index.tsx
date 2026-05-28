import { useEffect, useState } from "react";
import { FestivalPicks } from "../components/recommendations/FestivalPicks";
import { ProductCarousel } from "../components/recommendations/ProductCarousel";
import { useUserRecommendations } from "../hooks/useRecommendations";

const API = process.env.NEXT_PUBLIC_REC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [userId, setUserId] = useState("U0001");
  const [month, setMonth] = useState(10);
  const [users, setUsers] = useState<any[]>([]);
  const { recommendations, meta } = useUserRecommendations(userId, 5, month);
  useEffect(() => { fetch(`${API}/api/v1/users`).then((r) => r.json()).then(setUsers).catch(() => setUsers([])); }, []);
  return (
    <main className="page">
      <div className="hero"><div><h1>Nepali E-Commerce Recommendations</h1><p className="muted">Hybrid AI picks with festival-aware ranking.</p></div><p className="muted">v{meta?.model_version ?? "1.0.0"} • cache {String(meta?.cached ?? false)}</p></div>
      <div className="toolbar">
        <select value={userId} onChange={(e) => setUserId(e.target.value)}>{users.map((u) => <option key={u.user_id} value={u.user_id}>{u.user_id} • {u.city}</option>)}</select>
        <label>Month <input type="range" min="1" max="12" value={month} onChange={(e) => setMonth(Number(e.target.value))} /> {month}{month === 10 ? " = Dashain" : month === 11 ? " = Tihar" : ""}</label>
      </div>
      <FestivalPicks userId={userId} month={month} />
      <ProductCarousel userId={userId} title="Picks for you" month={month} />
      <section className="panel"><h2>Hybrid preview</h2><div className="grid">{recommendations.map((p) => <div key={p.product_id}><strong>{p.name}</strong><p className="muted">{p.category} • {p.price_formatted}</p></div>)}</div></section>
    </main>
  );
}
