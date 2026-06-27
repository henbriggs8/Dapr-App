import { StrictMode, useState, useEffect, Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import App from "./App";
import { SplashScreen } from "./components/splash-screen";
import { setClerkTokenGetter } from "@/lib/queryClient";
import { setBootStage } from "@/lib/boot-debug";
import "./index.css";

// ── iOS crash catcher ─────────────────────────────────────────────────────────
// Writes uncaught JS errors to the screen using raw DOM (no React needed),
// so they're visible in Xcode AND on the device screen before React boots.
(function installCrashCatcher() {
  const isDev = import.meta.env.DEV;
  function showError(msg: string) {
    console.error('[CRASH]', msg);
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;background:#fff;color:#c00;font:16px/1.6 system-ui;padding:40px 20px;z-index:99999;overflow:auto;white-space:pre-wrap;word-break:break-all;text-align:center;';
    if (isDev) {
      el.textContent = '[CRASH]\n' + msg;
    } else {
      el.innerHTML = '<strong>Something went wrong</strong><br><br>Please restart the app. If the problem persists, contact support at <a href="mailto:support@autodapr.com" style="color:#8c52ff">support@autodapr.com</a>';
    }
    document.body?.appendChild(el);
  }
  window.addEventListener('error', (e) => {
    showError((e.error?.stack ?? e.message) + '\n\n' + e.filename + ':' + e.lineno);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    showError(r?.stack ?? String(r));
  });
})();

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// The Clerk proxy is used for:
//   • Native iOS (Capacitor) — WKWebView can't handle cross-origin cookies.
//   • Dev/Replit preview — *.replit.dev isn't registered in Clerk Production.
// On the PRODUCTION domain (autodapper.com) we skip the proxy entirely.
// This is critical for OAuth (Google/Apple Sign In): Clerk stores the OAuth
// state cookie on clerk.autodapper.com, and Apple/Google redirect back there.
// If we proxied through www.autodapper.com, those cookies would be on the
// wrong domain and Clerk would return authorization_invalid at callback time.
const CLERK_PROXY_URL = (() => {
  if (typeof window === 'undefined') return undefined;
  if (window.location.protocol === 'capacitor:') {
    return `${import.meta.env.VITE_API_BASE_URL || 'https://dapper-pros.replit.app'}/clerk-proxy`;
  }
  // Production web: talk directly to clerk.autodapper.com (no proxy).
  if (window.location.hostname.endsWith('autodapper.com')) {
    return undefined;
  }
  // Dev/Replit preview: proxy is needed to reach Clerk from an unregistered domain.
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
try {
  if (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') {
    const SID_KEY = 'clerk_proxy_session_id';
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SID_KEY, sid);
    }
    const proxyBase = (import.meta.env.VITE_API_BASE_URL as string) || 'https://dapper-pros.replit.app';
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url = typeof input === 'string'
          ? input
          : (input instanceof URL ? input.href : (input as Request).url);
        if (url && (url.includes(proxyBase + '/clerk-proxy/') || url.includes('/clerk-proxy/'))) {
          const headers = new Headers((init?.headers as HeadersInit | undefined) ?? {});
          headers.set('X-Proxy-Session', sid as string);
          return nativeFetch(input, { ...init, headers });
        }
      } catch (_) {
        // fall through to native fetch on any URL-parsing error
      }
      return nativeFetch(input, init);
    };
    console.log('[AuthInit] iOS fetch patch applied, proxy session:', sid);
  }
} catch (patchErr) {
  console.error('[AuthInit] fetch patch failed (non-fatal):', patchErr);
}

// ── React ErrorBoundary ───────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#111' }}>Something went wrong</p>
          <p style={{ fontSize: 14, color: '#555', maxWidth: 280 }}>Please restart the app. If the problem persists, contact us at support@autodapr.com</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 8, padding: '12px 32px', background: '#8c52ff', color: '#fff', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Restart
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Boot instrumentation ────────────────────────────────────────────────────
setBootStage('booting', `protocol=${typeof window !== 'undefined' ? window.location.protocol : 'ssr'} key=${!!CLERK_PUBLISHABLE_KEY} proxy=${CLERK_PROXY_URL}`);


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
  setBootStage('clerk-init', `proxyUrl=${CLERK_PROXY_URL}`);
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        {CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} {...(CLERK_PROXY_URL ? { proxyUrl: CLERK_PROXY_URL } : {})}>
            <ClerkTokenBridge />
            <Root />
          </ClerkProvider>
        ) : (
          <Root />
        )}
      </ErrorBoundary>
    </StrictMode>
  );
}
