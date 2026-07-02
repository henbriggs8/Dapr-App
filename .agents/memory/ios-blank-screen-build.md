---
name: iOS Capacitor blank-screen root cause
description: Why the Capacitor iOS app can launch to a blank white/black screen on all devices, and the checks that catch it before archiving
---

## Rule
Before archiving a Capacitor iOS build for TestFlight, always verify `npm run build`
finishes with a clean exit (no unresolved-import errors) and that the resulting
`dist/public` / `ios/App/App/public` are non-empty and consistent BEFORE running
`npx cap sync ios`.

**Why:**
Vite's `emptyOutDir: true` wipes the output directory before writing new files. If a
dependency referenced in the app code isn't installed yet (e.g. a new Capacitor plugin
added in code before `npm install` was run), `npm run build` fails *after* clearing
`dist/public` but before finishing the new build. If `cap sync` runs anyway afterward,
it silently copies the empty/broken output into the iOS project — producing a blank
screen on every device (not device-specific), since there's no JS to execute at all.
This is very different from an in-app JS runtime crash, which the app's own crash
catcher / ErrorBoundary would normally render visibly instead of a truly blank screen.

**How to apply:**
- After any `npm run build`, check the file count and confirm `index.html` in
  `dist/public` matches `ios/App/App/public/index.html` before trusting a sync.
- Also confirm `ios/App/App/capacitor.config.json`'s `packageClassList` includes all
  native plugins actually imported in the app code — a missing entry there is a good
  signal that `cap sync` ran against a stale/incomplete dependency install.
- Also double-check that any WebSocket/API URL construction doesn't use
  `window.location.host` directly, since on native/Capacitor that resolves to
  `capacitor://localhost` (or undefined host), not the production API domain — use an
  explicit production API base for native builds instead.
</content>
