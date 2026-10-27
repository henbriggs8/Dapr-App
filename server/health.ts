import type { Express } from "express";

export function registerHealthRoutes(app: Express, checkDatabase: () => Promise<boolean>, isDraining: () => boolean) {
  app.get(["/health", "/health/live"], (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(isDraining() ? 503 : 200).json({ status: isDraining() ? "draining" : "ok",
      ...(process.env.DAPR_BUILD_SHA ? { build: process.env.DAPR_BUILD_SHA } : {}) });
  });
  app.get("/health/ready", async (_req, res) => {
    let ready = false;
    if (!isDraining()) {
      try { ready = await checkDatabase(); } catch { /* Do not expose database errors/credentials. */ }
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready" });
  });
}
