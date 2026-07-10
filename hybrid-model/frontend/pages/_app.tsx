/**
 * App wrapper — imports global styles and wraps every page in the Layout.
 */

import type { AppProps } from "next/app";
import { Layout } from "../components/layout/Layout";
<<<<<<< HEAD
import { CartProvider } from "../contexts/CartContext";
import { DemoUserProvider } from "../contexts/DemoUserContext";
import { PreferenceOnboarding } from "../components/onboarding/PreferenceOnboarding";
=======
>>>>>>> b0cbdba1f8b96ecd4f0dbb3c7b8e48fecda82efb
import "../styles.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
<<<<<<< HEAD
    <DemoUserProvider>
      <CartProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <PreferenceOnboarding />
      </CartProvider>
    </DemoUserProvider>
=======
    <Layout>
      <Component {...pageProps} />
    </Layout>
>>>>>>> b0cbdba1f8b96ecd4f0dbb3c7b8e48fecda82efb
  );
}
