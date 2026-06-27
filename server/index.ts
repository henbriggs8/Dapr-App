import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import https from "https";
import http from "http";
import zlib from "zlib";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

// ── Startup configuration warnings ────────────────────────────────────────────
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn(
    '[WARN] STRIPE_WEBHOOK_SECRET is not set. ' +
    'The Stripe webhook endpoint (/api/webhooks/stripe) will not verify signatures and will reject all events. ' +
    'The frontend /api/bookings/:id/verify-payment fallback remains active, but the webhook MUST be set in production ' +
    'to reliably mark bookings as paid. Set STRIPE_WEBHOOK_SECRET in your environment variables.'
  );
}

const app = express();
// Stripe webhook must receive raw body for signature verification — mount BEFORE express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve root-level public/ folder as static (includes .well-known for Apple Pay verification)
app.use(express.static(path.resolve(process.cwd(), "public")));

// ── Clerk Frontend API proxy ────────────────────────────────────────────────
// Production Clerk keys require clerk.<domain> subdomain to exist. Since that
// can't be configured on *.replit.dev or capacitor://localhost, we proxy all
// Clerk requests through /clerk-proxy on the same Express server.
const clerkPk = process.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const clerkFrontendApi = (() => {
  try {
    // Format: pk_live_<BASE64> or pk_test_<BASE64>
    // Base64 is URL-safe and may contain underscores, so slice after the 2nd underscore
    const prefix = clerkPk.startsWith('pk_live_') ? 'pk_live_' : clerkPk.startsWith('pk_test_') ? 'pk_test_' : null;
    if (!prefix) return '';
    const base64Part = clerkPk.slice(prefix.length);
    if (!base64Part) return '';
    return Buffer.from(base64Part, 'base64').toString('utf8').replace(/\$$/, '');
  } catch { return ''; }
})();

console.log('[Clerk proxy] decoded frontend API:', clerkFrontendApi || '(empty — key missing or undecodable)');

if (clerkFrontendApi) {
  const clerkDomain = `https://${clerkFrontendApi.replace(/^clerk\./, '')}`;

  // ── Server-side Clerk cookie store for iOS ──────────────────────────────
  // WKWebView (Capacitor) never stores/sends cookies from cross-origin fetch
  // responses (confirmed: every iOS request arrives with "cookies: none").
  // Solution: client sends X-Proxy-Session header (stable localStorage UUID),
  // we maintain the Clerk cookie jar here and inject it into every upstream call.
  const proxySessionStore = new Map<string, string>(); // sessionId → cookie string

  const mergeIntoCookieStore = (existing: string, setCookieHeaders: string | string[]): string => {
    const map = new Map<string, string>();
    // Parse existing stored cookies
    if (existing) {
      existing.split('; ').forEach(pair => {
        const eq = pair.indexOf('=');
        if (eq > 0) map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      });
    }
    // Overlay new Set-Cookie values (first segment only = name=value)
    const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    list.forEach(sc => {
      const nameVal = sc.split(';')[0].trim();
      const eq = nameVal.indexOf('=');
      if (eq > 0) map.set(nameVal.slice(0, eq).trim(), nameVal.slice(eq + 1).trim());
    });
    return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  };

  const STRIP_HEADERS = new Set([
    'host', 'origin', 'referer',
    'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto',
    'x-real-ip', 'x-replit-user-id', 'x-replit-user-name', 'x-replit-user-roles',
    'forwarded', 'via', 'connection', 'transfer-encoding',
  ]);

  // Use https.request with agent:false to force a fresh TCP connection every time.
  // fetch/undici pools connections and Cloudflare silently closes idle ones (bytesWritten:0).
  const clerkRequest = (targetUrl: string, method: string, headers: Record<string, string>, body?: Buffer): Promise<{ status: number; headers: http.IncomingMessage['headers']; body: Buffer }> =>
    new Promise((resolve, reject) => {
      const u = new URL(targetUrl);
      const reqOpts: https.RequestOptions = {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method,
        headers,
        agent: false, // fresh connection every request — no pooling
      };
      const req = https.request(reqOpts, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 502, headers: res.headers, body: Buffer.concat(chunks) }));
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });

  const PROXY_CORS_ORIGINS = new Set([
    'capacitor://localhost',
    'ionic://localhost',
    'https://dapper-pros.replit.app',
    'https://autodapper.com',
    'https://www.autodapper.com',
  ]);

  // Apply CORS for the proxy directly — the global CORS middleware is registered
  // AFTER this handler so it never runs for /clerk-proxy responses. WKWebView
  // (Capacitor) sends Origin: capacitor://localhost and blocks any response that
  // lacks Access-Control-Allow-Origin, which is why Clerk never initialises on iOS.
  const applyProxyCors = (req: Request, res: Response) => {
    const origin = req.headers.origin || '';
    if (PROXY_CORS_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, X-Proxy-Session');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  };

  // Rewrite Set-Cookie headers from upstream Clerk responses so cookies are
  // scoped to the proxy host (dapper-pros.replit.app) rather than the Clerk
  // domain (clerk.autodapper.com). WKWebView rejects cookies whose Domain
  // attribute doesn't match the response host, so the Clerk session is lost
  // between sign-in steps → "You are signed out" error on iOS.
  // We also ensure SameSite=None; Secure so cross-origin WKWebView requests
  // (from capacitor://localhost) include the cookies on every call.
  const rewriteSetCookie = (raw: string | string[]): string[] => {
    const cookies = Array.isArray(raw) ? raw : [raw];
    return cookies.map(cookie => {
      const parts = cookie.split(';').map(p => p.trim());
      // Strip Domain (would mismatch proxy host), existing SameSite (Clerk sends
      // SameSite=Lax which blocks cross-origin fetch from capacitor://localhost),
      // and Secure (we re-add it below).
      const filtered = parts.filter(p => {
        const pl = p.toLowerCase();
        return !pl.startsWith('domain=') && !pl.startsWith('samesite=') && pl !== 'secure';
      });
      // Force SameSite=None; Secure so WKWebView includes the cookie in
      // cross-origin fetch requests (capacitor://localhost → dapper-pros.replit.app).
      return filtered.join('; ') + '; SameSite=None; Secure';
    });
  };

  app.use('/clerk-proxy', async (req: Request, res: Response) => {
    applyProxyCors(req, res);

    // Handle CORS preflight — WKWebView sends OPTIONS before every POST
    if (req.method === 'OPTIONS') {
      console.log('[Clerk proxy] OPTIONS preflight from origin:', req.headers.origin);
      res.status(204).send('');
      return;
    }

    // /npm/... paths are the clerk.browser.js bundle.
    // npm.clerk.io does not resolve from Replit's production container (ENOTFOUND),
    // so we proxy the bundle through cdn.jsdelivr.net which is publicly accessible.
    // Both hosts use the /npm/<pkg> URL convention so req.path maps directly.
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrl = req.path.startsWith('/npm/')
      ? `https://cdn.jsdelivr.net${req.path}${queryString}`
      : `https://${clerkFrontendApi}${req.path}${queryString}`;
    const logTarget = req.path.startsWith('/npm/') ? 'cdn.jsdelivr.net' : clerkFrontendApi;
    // Read the proxy session ID sent by the iOS fetch patch (localStorage UUID).
    // We use this to maintain Clerk cookies server-side since WKWebView never
    // stores or forwards cross-origin cookies from fetch responses.
    const proxySessionId = req.headers['x-proxy-session'] as string | undefined;
    const storedCookies = proxySessionId ? (proxySessionStore.get(proxySessionId) || '') : '';
    console.log(`[Clerk proxy] ${req.method} ${req.path} → ${logTarget} (origin: ${req.headers.origin || 'none'}) psid: ${proxySessionId || 'none'} stored: ${storedCookies ? 'yes' : 'no'}`);
    try {
      const forwardHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (!STRIP_HEADERS.has(k) && !k.startsWith('sec-') && !k.startsWith('x-proxy-') && typeof v === 'string') {
          forwardHeaders[k] = v;
        }
      }
      // Inject stored Clerk cookies into the upstream request so Clerk sees
      // a consistent client identity even though WKWebView sends no cookies.
      if (storedCookies) {
        forwardHeaders['cookie'] = storedCookies;
      }
      forwardHeaders['origin'] = clerkDomain;
      forwardHeaders['referer'] = clerkDomain + '/';
      forwardHeaders['connection'] = 'close';
      // For npm bundle requests, ask for plain (uncompressed) response so the
      // proxy can forward the raw bytes without any content-encoding mismatch.
      // WKWebView would get raw gzip bytes if the CDN compressed and we stripped
      // content-encoding, causing silent JS parse failure → Clerk never loads.
      if (req.path.startsWith('/npm/')) {
        forwardHeaders['accept-encoding'] = 'identity';
      }

      let bodyBuf: Buffer | undefined;
      const hasBody = !['GET', 'HEAD'].includes(req.method);
      if (hasBody) {
        const ct = (req.headers['content-type'] || '').toLowerCase();
        let bodyStr: string;
        if (ct.includes('application/x-www-form-urlencoded')) {
          bodyStr = new URLSearchParams(req.body as Record<string, string>).toString();
          forwardHeaders['content-type'] = 'application/x-www-form-urlencoded';
        } else {
          bodyStr = JSON.stringify(req.body);
          forwardHeaders['content-type'] = 'application/json';
        }
        bodyBuf = Buffer.from(bodyStr, 'utf8');
        forwardHeaders['content-length'] = String(bodyBuf.byteLength);
      }

      const upstream = await clerkRequest(targetUrl, req.method, forwardHeaders, bodyBuf);

      // Decompress the upstream body if needed — jsDelivr/CDNs ignore
      // Accept-Encoding:identity and return gzip anyway. WKWebView (iOS) receives
      // raw gzip bytes, can't parse them as JS, and throws SyntaxError \ufffd.
      // We decompress server-side so the client always gets plain text/JSON.
      let responseBody = upstream.body;
      const enc = (upstream.headers['content-encoding'] || '').toLowerCase();
      try {
        if (enc === 'gzip' || enc === 'deflate') {
          responseBody = zlib.gunzipSync(upstream.body);
        } else if (enc === 'br') {
          responseBody = zlib.brotliDecompressSync(upstream.body);
        }
      } catch (decompErr) {
        console.error('[Clerk proxy] decompression failed, forwarding raw body:', decompErr);
      }

      res.status(upstream.status);
      for (const [k, v] of Object.entries(upstream.headers)) {
        // Strip content-encoding (body is now decompressed), content-length
        // (length changed after decompression), and our own CORS header.
        if (k === 'set-cookie') {
          // Save Clerk cookies into the server-side session store so we can
          // inject them on subsequent iOS requests (WKWebView never re-sends
          // cookies it receives from cross-origin fetch responses).
          if (proxySessionId) {
            const existing = proxySessionStore.get(proxySessionId) || '';
            const merged = mergeIntoCookieStore(existing, v as string | string[]);
            proxySessionStore.set(proxySessionId, merged);
            console.log(`[Clerk proxy] session ${proxySessionId} cookies updated (${merged.split('; ').length} entries)`);
          }
          // Also rewrite domain + SameSite for web clients that DO use cookies.
          res.setHeader('set-cookie', rewriteSetCookie(v as string | string[]));
        } else if (k !== 'content-encoding' && k !== 'content-length' && k !== 'access-control-allow-origin' && v) {
          res.setHeader(k, v as string);
        }
      }
      if (upstream.status >= 400) {
        console.error('[Clerk proxy] upstream error', upstream.status, req.method, targetUrl, responseBody.toString('utf8').slice(0, 300));
      }
      res.send(responseBody);
    } catch (err) {
      console.error('[Clerk proxy] error:', err);
      res.status(502).json({ error: 'Clerk proxy error' });
    }
  });
}

// Add CORS middleware — restrict to known origins
const ALLOWED_ORIGINS = [
  'https://autodapper.com',
  'https://www.autodapper.com',
  'https://dapper-pros.replit.app',
  'capacitor://localhost',   // iOS Capacitor app
  'ionic://localhost',       // fallback for older Capacitor
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    // Same-origin or server-to-server requests — allow through
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/download/dapr-ios', (req, res) => {
  const file = `${process.cwd()}/dist/public/dapr-ios.zip`;
  res.download(file, 'dapr-ios.zip', (err) => {
    if (err) res.status(404).send('File not ready — please ask to regenerate it.');
  });
});

// ── Native iOS OAuth start page ───────────────────────────────────────────
// Opens in SFSafariViewController (system browser). Loads Clerk JS DIRECTLY
// (no proxy) so Clerk sets its __client cookie on clerk.autodapper.com in the
// SYSTEM cookie store. Without this, the proxy puts __client on the wrong domain
// and Clerk returns authorization_invalid when the OAuth callback arrives.
app.get('/native-oauth-start', (req, res) => {
  // Clerk production keys are restricted to the registered domain (autodapper.com).
  // If this request arrived on any other host (e.g. dapper-pros.replit.app), redirect
  // to autodapper.com so that Clerk JS runs with the correct Origin header.
  const host = req.hostname;
  if (host !== 'autodapper.com' && host !== 'www.autodapper.com') {
    const qs = Object.keys(req.query).length
      ? '?' + new URLSearchParams(req.query as Record<string, string>).toString()
      : '';
    res.redirect(302, `https://autodapper.com/native-oauth-start${qs}`);
    return;
  }

  const strategy = req.query.strategy === 'apple' ? 'oauth_apple' : 'oauth_google';
  const providerName = strategy === 'oauth_apple' ? 'Apple' : 'Google';
  const pk = clerkPk;
  // Callback must also be on autodapper.com so the URL is in Clerk's allowlist.
  const callbackUrl = 'https://autodapper.com/native-sso-callback';

  if (!pk) {
    res.status(500).send('<p>Clerk not configured on server</p>');
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Signing in with ${providerName}…</title>
<style>
body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;
font-family:-apple-system,sans-serif;background:#fff;color:#555;text-align:center;padding:24px;}
#msg{font-size:16px;margin-bottom:8px;}
#sub{font-size:13px;color:#999;}
</style>
</head>
<body>
<div>
  <p id="msg">Signing in with ${providerName}…</p>
  <p id="sub"></p>
</div>
<!-- Clerk JS v5 CDN: pass publishable key via data attribute so window.Clerk is
     auto-instantiated. Do NOT use "new window.Clerk(pk)" — that was v4 only. -->
<script
  data-clerk-publishable-key=${JSON.stringify(pk)}
  src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"
  type="text/javascript"
></script>
<script>
(function() {
  var msg = document.getElementById('msg');
  var sub = document.getElementById('sub');
  function showErr(e) {
    msg.textContent = 'Sign-in failed';
    sub.textContent = e && e.message ? e.message : String(e);
  }

  // window.Clerk is created by the script above; wait for the page load event
  // so Clerk has had a chance to self-initialise from data-clerk-publishable-key.
  window.addEventListener('load', async function() {
    try {
      sub.textContent = 'Initialising…';
      // Clerk v5 CDN: window.Clerk is already constructed; just call .load()
      await window.Clerk.load();

      sub.textContent = 'Redirecting to ${providerName}…';
      var si = await window.Clerk.client.signIn.create({
        strategy: ${JSON.stringify(strategy)},
        redirectUrl: ${JSON.stringify(callbackUrl)},
        actionCompleteRedirectUrl: ${JSON.stringify(callbackUrl)},
      });
      var oauthUrl = si.firstFactorVerification
        && si.firstFactorVerification.externalVerificationRedirectURL
        ? si.firstFactorVerification.externalVerificationRedirectURL.toString()
        : null;
      if (!oauthUrl) throw new Error('Clerk did not return an OAuth URL');
      window.location.href = oauthUrl;
    } catch(e) {
      showErr(e);
    }
  });
})();
</script>
</body>
</html>`);
});

// ── Native iOS OAuth callback bridge ──────────────────────────────────────
// SFSafariViewController (Capacitor Browser) blocks JS-initiated custom-scheme
// redirects on iOS 14+. Instead we use server-side session polling:
//   1. The native app generates a unique `state` and opens the Account Portal
//      with redirect_url=.../native-sso-callback?state={uuid}
//   2. Clerk redirects here after Google auth; we store the Clerk params by state
//   3. The native app polls /api/native-sso-poll/:state every 2 s
//   4. On hit, the app navigates its WKWebView to /sso-callback?{params}
//      and Clerk's AuthenticateWithRedirectCallback takes over

const nativeSsoSessions = new Map<string, { params: string; expires: number }>();
// Clean up expired sessions every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of nativeSsoSessions) {
    if (val.expires < now) nativeSsoSessions.delete(key);
  }
}, 5 * 60 * 1000);

app.get('/native-sso-callback', (req, res) => {
  const state = req.query.state as string | undefined;
  const allParams = new URLSearchParams(req.query as Record<string, string>);
  allParams.delete('state');
  const clerkParams = allParams.toString();

  if (state) {
    nativeSsoSessions.set(state, {
      params: clerkParams ? '?' + clerkParams : '',
      expires: Date.now() + 10 * 60 * 1000,
    });
    console.log(`[SSO] stored params for state=${state}`);
  }

  // Also try the custom-scheme deep link as a best-effort fallback
  // (works on iOS <14 and some configurations; polling is the reliable path)
  const deepLink = `com.autodapper.app://sso-callback${clerkParams ? '?' + clerkParams : ''}`;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Signing in…</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,sans-serif;background:#fff;color:#888;font-size:15px;text-align:center;padding:24px;}</style>
</head>
<body>
<div>
  <p style="font-size:17px;font-weight:600;color:#111;margin-bottom:8px;">Signing you in…</p>
  <p>You can close this window and return to the app.</p>
</div>
<script>
(function(){
  try { window.location.replace(${JSON.stringify(deepLink)}); } catch(e){}
  setTimeout(function(){ try { window.location.replace(${JSON.stringify(deepLink)}); } catch(e){} }, 500);
})();
</script>
</body>
</html>`);
});

// Polling endpoint — native app calls this every 2 s after opening browser
app.get('/api/native-sso-poll/:state', (req, res) => {
  const session = nativeSsoSessions.get(req.params.state);
  if (session && session.expires > Date.now()) {
    nativeSsoSessions.delete(req.params.state);
    return res.json({ params: session.params });
  }
  res.status(202).json({ waiting: true });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Add health check endpoint first
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Add a root endpoint that Replit can detect
  app.get('/ping', (_req, res) => {
    res.status(200).send('pong');
  });

  const server = registerRoutes(app);

  // Seed required data (admin user etc.) on startup
  await storage.initialize();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error('Error:', err);
    res.status(status).json({ message });
  });

  // Setup Vite middleware only after registering routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = Number(process.env.PORT) || 5000;
  const HOST = process.env.REPL_SLUG ? '0.0.0.0' : '0.0.0.0';

  // Create a promise that resolves when the server is ready
  await new Promise<void>((resolve) => {
    server.listen(PORT, HOST, () => {
      // Add explicit port availability messages
      console.log('----------------------------------------');
      console.log(`Server listening on port ${PORT}`);
      console.log('Port is now available');
      console.log('----------------------------------------');
      log(`Server running at http://${HOST}:${PORT}`);
      log('Application is ready to accept connections');
      
      // Output the URL that Replit should use for preview
      if (process.env.REPLIT_DEV_DOMAIN) {
        console.log(`Preview URL: https://${process.env.REPLIT_DEV_DOMAIN}`);
      }

      // Test the health endpoint to ensure the server is truly ready
      fetch(`http://${HOST}:${PORT}/health`)
        .then(response => response.json())
        .then(() => {
          console.log('Health check passed - server is fully operational');
          resolve();
        })
        .catch(error => {
          console.error('Health check failed:', error);
          resolve(); // Still resolve to allow the server to start
        });
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

    // Register native OAuth callback URL with Clerk's allowed redirect URL list.
    // This enables the Clerk Account Portal (accounts.autodapper.com) to redirect
    // back to our server after Google Sign-In — without needing a dashboard change.
    const clerkSk = process.env.CLERK_SECRET_KEY;
    if (clerkSk) {
      const nativeCallback = 'https://dapper-pros.replit.app/native-sso-callback';
      fetch('https://api.clerk.com/v1/redirect_urls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clerkSk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: nativeCallback }),
      })
        .then(r => r.json())
        .then((data: any) => {
          if (data?.errors?.length) {
            console.log('[Clerk] redirect URL already registered or skipped:', data.errors[0]?.long_message ?? data.errors[0]?.message);
          } else {
            console.log('[Clerk] ✓ Registered native-sso-callback as allowed redirect URL');
          }
        })
        .catch((e: any) => console.log('[Clerk] Could not register redirect URL:', e.message));
    }
  });
})().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});