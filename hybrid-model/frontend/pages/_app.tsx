/**
 * App wrapper — imports global styles and wraps every page in the Layout.
 */

import type { AppProps } from "next/app";
import { Layout } from "../components/layout/Layout";
import "../styles.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
