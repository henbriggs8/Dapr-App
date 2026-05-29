import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import App from "./App";
import { SplashScreen } from "./components/splash-screen";
import { setClerkTokenGetter } from "@/lib/queryClient";
import "./index.css";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Production Clerk keys need clerk.<domain> subdomain. Instead, proxy through
// our own server so this works on any domain (Replit dev, iOS, production).
// Must be an absolute URL — Clerk uses it to construct the clerk.browser.js script src.
const CLERK_PROXY_URL = (() => {
  if (typeof window === 'undefined') return '/clerk-proxy';
  if (window.location.protocol === 'capacitor:') {
    return `${import.meta.env.VITE_API_BASE_URL || 'https://dapper-pros.replit.app'}/clerk-proxy`;
  }
  return `${window.location.origin}/clerk-proxy`;
})();

// Registers the Clerk token getter with queryClient so native API calls
// can include Authorization: Bearer <token> headers automatically.
function ClerkTokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setClerkTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

function Root() {
  const alreadyShown = sessionStorage.getItem('splash_shown') === 'true';
  const [showSplash, setShowSplash] = useState(!alreadyShown);

  if (showSplash) {
    return <SplashScreen onComplete={() => {
      sessionStorage.setItem('splash_shown', 'true');
      setShowSplash(false);
    }} />;
  }

  return <App />;
}

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      {CLERK_PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} proxyUrl={CLERK_PROXY_URL}>
          <ClerkTokenBridge />
          <Root />
        </ClerkProvider>
      ) : (
        <Root />
      )}
    </StrictMode>
  );
}
