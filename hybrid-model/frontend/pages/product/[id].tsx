/**
 * Product Detail Page — shows product information and similar products.
 */

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSimilarProducts } from "../../hooks/useRecommendations";
import { RecommendationGrid } from "../../components/recommendations/RecommendationGrid";

export default function ProductDetailPage() {
  const router = useRouter();
  const productId = String(router.query.id ?? "P0001");

  const { recommendations, seedName, isLoading } = useSimilarProducts(productId, 8);

  return (
    <>
      <Head>
        <title>{seedName || productId} — Similar Products</title>
        <meta name="description" content={`Content-based similar products for ${seedName || productId}`} />
      </Head>

      <main className="page product-detail">
        <Link href="/" className="back-link">
          ← Back to Dashboard
        </Link>

        <h1>{seedName || productId}</h1>
        <div className="product-detail-meta">
          <span>Product ID: {productId}</span>
          <span>·</span>
          <span>Content-Based Similarity (TF-IDF + Cosine)</span>
        </div>

        <RecommendationGrid
          title="Similar Products"
          subtitle="Found via TF-IDF cosine similarity on product metadata (description, tags, category, brand)"
          products={recommendations as any}
          isLoading={isLoading}
          showScores={false}
        />
      </main>
    </>
  );
}
