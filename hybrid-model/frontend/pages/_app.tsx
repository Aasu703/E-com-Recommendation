/**
 * App wrapper — imports global styles and wraps every page in the Layout.
 */

import type { AppProps } from "next/app";
import { Layout } from "../components/layout/Layout";
import { CartProvider } from "../contexts/CartContext";
import { AuthProvider } from "../contexts/AuthContext";
import { CartGateProvider } from "../contexts/CartGateContext";
import { AuthGateModal } from "../components/auth/AuthGateModal";
import "../styles.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <CartProvider>
        <CartGateProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <AuthGateModal />
        </CartGateProvider>
      </CartProvider>
    </AuthProvider>
  );
}
