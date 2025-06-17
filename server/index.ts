import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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