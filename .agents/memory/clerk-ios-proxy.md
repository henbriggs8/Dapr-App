---
name: Clerk iOS proxy bugs
description: Three bugs that caused Clerk to never initialize in WKWebView (Capacitor iOS) — DNS, gzip, and CORS.
---

## The three bugs

### 1. CORS applied too late
Express registered the global CORS middleware AFTER the `/clerk-proxy` handler, so proxy responses never got `Access-Control-Allow-Origin: capacitor://localhost`. Fixed by calling `applyProxyCors()` directly inside the proxy handler before sending any response.

### 2. npm.clerk.io unreachable from Replit production
`getaddrinfo ENOTFOUND npm.clerk.io` — Replit's production container cannot resolve this domain. Fixed by routing `/npm/` bundle requests to `https://cdn.jsdelivr.net` instead (same URL path convention: `/npm/@clerk/clerk-js@5/dist/...`).

### 3. jsDelivr returns gzip, proxy stripped content-encoding
jsDelivr ignores `Accept-Encoding: identity` and returns gzip-compressed content. The proxy stripped the `content-encoding` header before forwarding, so WKWebView received raw gzip bytes with no hint to decompress → SyntaxError `\ufffd` at clerk.browser.js:1:0 → Clerk never executed.

**Fix:** Server-side decompression using `zlib.gunzipSync` / `zlib.brotliDecompressSync` before forwarding. Also strip `content-length` from forwarded headers (length changes after decompression).

## How to apply
Any future change to the Clerk proxy in `server/index.ts` must preserve:
- `applyProxyCors(req, res)` called at the top of the `/clerk-proxy` handler
- `/npm/` requests routed to `cdn.jsdelivr.net` (not `npm.clerk.io`)
- Server-side decompression of gzip/br responses before `res.send()`
- `content-encoding` and `content-length` both stripped from forwarded upstream headers
