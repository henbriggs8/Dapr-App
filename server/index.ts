import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

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

  const STRIP_HEADERS = new Set([
    'host', 'origin', 'referer',
    'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto',
    'x-real-ip', 'x-replit-user-id', 'x-replit-user-name', 'x-replit-user-roles',
    'forwarded', 'via', 'connection',
  ]);

  // Retry once on stale keep-alive socket errors (bytesWritten: 0)
  const fetchWithRetry = async (url: string, opts: RequestInit, attempts = 2): Promise<globalThis.Response> => {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fetch(url, opts);
      } catch (err: any) {
        const isSocket = err?.cause?.code === 'UND_ERR_SOCKET';
        if (isSocket && i < attempts - 1) continue;
        throw err;
      }
    }
    throw new Error('unreachable');
  };

  app.use('/clerk-proxy', async (req: Request, res: Response) => {
    const targetUrl = `https://${clerkFrontendApi}${req.path}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;
    try {
      const forwardHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (!STRIP_HEADERS.has(k) && !k.startsWith('sec-') && typeof v === 'string') {
          forwardHeaders[k] = v;
        }
      }
      forwardHeaders['origin'] = clerkDomain;
      forwardHeaders['referer'] = clerkDomain + '/';
      forwardHeaders['connection'] = 'close'; // Prevent stale keep-alive reuse

      const hasBody = !['GET', 'HEAD'].includes(req.method);
      let body: string | undefined;
      if (hasBody) {
        const ct = (req.headers['content-type'] || '').toLowerCase();
        if (ct.includes('application/x-www-form-urlencoded')) {
          body = new URLSearchParams(req.body as Record<string, string>).toString();
          forwardHeaders['content-type'] = 'application/x-www-form-urlencoded';
        } else {
          body = JSON.stringify(req.body);
          forwardHeaders['content-type'] = 'application/json';
        }
        forwardHeaders['content-length'] = String(Buffer.byteLength(body));
      }

      const upstream = await fetchWithRetry(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body,
      });

      res.status(upstream.status);
      upstream.headers.forEach((v, k) => { if (k !== 'content-encoding') res.setHeader(k, v); });
      const buf = await upstream.arrayBuffer();
      if (upstream.status >= 400) {
        console.error('[Clerk proxy] upstream error', upstream.status, req.method, targetUrl, Buffer.from(buf).toString('utf8').slice(0, 300));
      }
      res.send(Buffer.from(buf));
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
  });
})().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});