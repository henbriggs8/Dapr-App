---
name: Clerk OAuth + Proxy cookie conflict
description: Why Google/Apple Sign In returns authorization_invalid on production when using a Clerk proxy
---

## Rule
On the production web domain (autodapper.com), the Clerk proxy must NOT be used.
Set `proxyUrl` to `undefined` for `hostname.endsWith('autodapper.com')`.

**Why:**
The proxy rewrites Clerk's `Set-Cookie` headers, stripping the `domain=` attribute so
cookies are scoped to the proxy host (`www.autodapper.com`). But Apple/Google OAuth
redirect back directly to `clerk.autodapper.com/v1/oauth_callback`, bypassing the proxy.
Clerk looks for its OAuth state cookie on `clerk.autodapper.com` — it's not there (it's on
`www.autodapper.com`) — so Clerk returns `authorization_invalid` for every OAuth provider.

This caused BOTH Google AND Apple Sign In to fail identically on production.

**How to apply:**
```javascript
// main.tsx — CLERK_PROXY_URL detection
if (window.location.protocol === 'capacitor:') return CAPACITOR_PROXY_URL;
if (window.location.hostname.endsWith('autodapper.com')) return undefined; // no proxy
return `${window.location.origin}/clerk-proxy`; // dev/Replit
```

The proxy is still needed for:
- Native iOS (Capacitor) — WKWebView can't handle cross-origin cookies
- Dev/Replit preview — *.replit.dev isn't registered in Clerk Production
