/**
 * App wrapper — imports global styles and wraps every page in the Layout.
 */

import type { AppProps } from "next/app";
import { Layout } from "../components/layout/Layout";
import { AuthProvider } from "../contexts/AuthContext";
import { CartProvider } from "../contexts/CartContext";
import { DemoUserProvider } from "../contexts/DemoUserContext";
import { PreferenceOnboarding } from "../components/onboarding/PreferenceOnboarding";
import "../styles.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <DemoUserProvider>
        <CartProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <PreferenceOnboarding />
        </CartProvider>
      </DemoUserProvider>
    </AuthProvider>
  );
}
