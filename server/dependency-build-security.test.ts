import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const baseline = JSON.parse(readFileSync(new URL("./test/fixtures/dependency-build-compatibility.json", import.meta.url), "utf8"));

test("patched Vite retains browser targets, theme, development overlay and React transforms", async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false, watch: null, preTransformRequests: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    assert.deepEqual(vite.config.build.target, baseline.browserTargets);
    assert.notEqual(vite.config.server.allowedHosts, true);
    const template = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    const html = await vite.transformIndexHtml("/index.html", template);
    const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]);
    assert.deepEqual(styles, baseline.themeStyles);
    assert.match(html, /runtime-error-plugin:error/);
    const transformed = await vite.transformRequest("/src/main.tsx");
    assert.ok(transformed?.code.includes("createRoot"));
    assert.ok(transformed?.code.includes("jsx") || transformed?.code.includes("createElement"));
  } finally {
    await vite.close();
  }
});
