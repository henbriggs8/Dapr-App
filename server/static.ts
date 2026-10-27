import express, { type Express } from "express";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function log(message: string, source = "express") {
  console.log(`${new Date().toLocaleTimeString("en-US")} [${source}] ${message}`);
}
export function serveStatic(app: Express) {
  const distPath = resolve(dirname(fileURLToPath(import.meta.url)), "public");
  if (!existsSync(distPath)) throw new Error("Missing built frontend; run npm run build");
  app.use(express.static(distPath));
  app.use("*", (_req, res) => res.sendFile(resolve(distPath, "index.html")));
}
