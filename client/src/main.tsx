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

// ── iOS session cookie workaround ────────────────────────────────────────────
// WKWebView (Capacitor) does NOT store or send cookies from cross-origin fetch
// responses — confirmed by production logs showing "cookies: none" on every
// request. We work around this by:
//  1. Generating a stable session ID stored in localStorage (survives reloads).
//  2. Monkey-patching window.fetch to add X-Proxy-Session to every /clerk-proxy/ call.
//  3. The server maintains a cookie jar keyed by session ID, injecting Clerk
//     cookies into upstream requests so Clerk sees a consistent client identity.
if (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') {
  const SID_KEY = 'clerk_proxy_session_id';
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SID_KEY, sid);
  }
  const proxyBase = import.meta.env.VITE_API_BASE_URL || 'https://dapper-pros.replit.app';
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    if (url.includes(proxyBase + '/clerk-proxy/') || url.includes('/clerk-proxy/')) {
      const headers = new Headers((init?.headers as HeadersInit) || {});
      headers.set('X-Proxy-Session', sid!);
      return nativeFetch(input, { ...init, headers });
    }
    return nativeFetch(input, init);
  };
  console.log('[AuthInit] iOS fetch patch applied, proxy session:', sid);
}

// ── Boot instrumentation ────────────────────────────────────────────────────
console.log('[AuthInit] app boot started');
console.log('[AuthInit] protocol:', typeof window !== 'undefined' ? window.location.protocol : 'ssr');
console.log('[AuthInit] CLERK_PUBLISHABLE_KEY present:', !!CLERK_PUBLISHABLE_KEY);
console.log('[AuthInit] proxyUrl:', CLERK_PROXY_URL);


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
