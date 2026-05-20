import { useRouter } from "next/router";
import { SimilarItems } from "../../components/recommendations/SimilarItems";

export default function ProductPage() {
  const id = String(useRouter().query.id ?? "P0001");
  return <main className="page"><h1>{id}</h1><p className="muted">Product detail demo page</p><SimilarItems productId={id} currentProductName={id} /></main>;
}
