#!/usr/bin/env node
// Icon-system guard.
//
// Enforces that every lucide-react icon in this codebase is rendered through the
// shared <Icon> wrapper at client/src/components/ui/icon.tsx, and that no
// caller bypasses the locked size scale (xs/sm/md/lg/xl) by passing
// Tailwind w-N / h-N classes through className.
//
// Reasons a file is exempt:
//   - The wrapper itself: client/src/components/ui/icon.tsx
//   - Vendored shadcn/ui pieces: client/src/components/ui/* (these are
//     vendored library code; we don't rewrite their internals)
//
// Run:  node scripts/check-icons.mjs
// Exit codes: 0 = clean, 1 = violations found.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "client", "src");

const WRAPPER_FILE = join("client", "src", "components", "ui", "icon.tsx");
const VENDORED_SHADCN_PREFIX = join("client", "src", "components", "ui") + sep;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (st.isFile() && /\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

function isExempt(relPath) {
  if (relPath === WRAPPER_FILE) return true;
  if (relPath.startsWith(VENDORED_SHADCN_PREFIX)) return true;
  return false;
}

// Pull the names imported from "lucide-react" in a file. Type-only imports and
// the `LucideIcon` type are excluded — only runtime component imports count.
// Also returns any namespace import (`import * as X from "lucide-react"`)
// detected, so callers can flag it as a hard violation: namespace imports
// bypass the wrapper by construction (you'd write `<X.Camera ...>`).
function lucideImportInfo(source) {
  const names = new Set();
  let namespaceLocal = null;

  // Named imports
  const reNamed = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']lucide-react["']/g;
  let m;
  while ((m = reNamed.exec(source)) !== null) {
    const isTypeOnlyImport = /import\s+type\s+\{/.test(m[0]);
    for (const raw of m[1].split(",")) {
      let part = raw.trim();
      if (!part) continue;
      // Drop inline `type X` markers
      if (/^type\s+/.test(part)) continue;
      // Honor aliases: `Foo as Bar` -> we care about the local name `Bar`
      const asMatch = part.match(/^(\w+)\s+as\s+(\w+)$/);
      const localName = asMatch ? asMatch[2] : part;
      // Skip the type export
      if (localName === "LucideIcon") continue;
      if (isTypeOnlyImport) continue;
      names.add(localName);
    }
  }

  // Namespace import: `import * as X from "lucide-react"`
  const reNs = /import\s+\*\s+as\s+(\w+)\s+from\s+["']lucide-react["']/;
  const ns = source.match(reNs);
  if (ns) namespaceLocal = ns[1];

  return { names, namespaceLocal };
}

// Find <X ...> JSX opening tags (self-closing or not) for a given component name.
function findJsxOpenings(source, name) {
  // Match <Name followed by space, /, > or newline. Skip </Name (closing tag).
  const re = new RegExp(`<${name}(?=[\\s/>\\n])`, "g");
  const hits = [];
  let m;
  while ((m = re.exec(source)) !== null) {
    // Skip closing tags: would have been `</Name` so the char before `<` is
    // already accounted for by the regex anchor — `<Name` only matches opening.
    hits.push(m.index);
  }
  return hits;
}

// Extract the className value (string-literal or template-literal) from the
// JSX opening tag that starts at `start`. Returns null if no className or if
// it's a {...} expression we can't statically inspect.
function extractClassName(source, start) {
  // Find end of opening tag: first unescaped `>` after `start` that is not
  // inside braces or strings. Cheap parser: track {} depth and quotes.
  let i = start;
  let depth = 0;
  let inStr = null;
  while (i < source.length) {
    const c = source[i];
    if (inStr) {
      if (c === "\\") { i += 2; continue; }
      if (c === inStr) inStr = null;
    } else {
      if (c === '"' || c === "'" || c === "`") inStr = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    i++;
  }
  const tag = source.slice(start, i);
  // className="..."  or  className='...'  or  className={`...`}
  const lit = tag.match(/className\s*=\s*(["'`])([^"'`]*)\1/);
  if (lit) return lit[2];
  const tpl = tag.match(/className\s*=\s*\{`([^`]*)`\}/);
  if (tpl) return tpl[1];
  return null;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

const SIZE_CLASS_RE = /\b[wh]-(?:\d+(?:\.\d+)?|\[[^\]]+\])\b/;

const directLucideViolations = [];
const namespaceViolations = [];
const sizeClassViolations = [];

for (const abs of walk(SRC)) {
  const rel = relative(ROOT, abs);
  if (isExempt(rel)) continue;

  const source = readFileSync(abs, "utf8");

  // Rule 1: no direct lucide JSX outside the wrapper.
  const { names: lucideNames, namespaceLocal } = lucideImportInfo(source);
  for (const name of lucideNames) {
    for (const idx of findJsxOpenings(source, name)) {
      directLucideViolations.push({
        file: rel,
        line: lineOf(source, idx),
        name,
      });
    }
  }
  // Rule 1b: namespace imports of lucide-react are always a violation —
  // they bypass the wrapper by construction (`<Lucide.Camera ... />`).
  if (namespaceLocal) {
    const idx = source.search(
      new RegExp(`import\\s+\\*\\s+as\\s+${namespaceLocal}\\s+from\\s+["']lucide-react["']`),
    );
    namespaceViolations.push({
      file: rel,
      line: lineOf(source, Math.max(idx, 0)),
      local: namespaceLocal,
    });
  }

  // Rule 2: <Icon ...> may not carry w-N / h-N sizing in className.
  for (const idx of findJsxOpenings(source, "Icon")) {
    const cls = extractClassName(source, idx);
    if (cls && SIZE_CLASS_RE.test(cls)) {
      const offending = cls.match(SIZE_CLASS_RE)[0];
      sizeClassViolations.push({
        file: rel,
        line: lineOf(source, idx),
        offending,
      });
    }
  }
}

const total =
  directLucideViolations.length +
  namespaceViolations.length +
  sizeClassViolations.length;

if (total === 0) {
  console.log("✓ icons OK — no direct lucide JSX, no size-class bypasses");
  process.exit(0);
}

console.error("✗ icon-system check failed\n");

if (directLucideViolations.length) {
  console.error(
    "Direct lucide-react JSX is not allowed outside the shared wrapper.",
  );
  console.error(
    "Render the icon through <Icon icon={Foo} size=\"sm\" /> from",
  );
  console.error("@/components/ui/icon instead.\n");
  for (const v of directLucideViolations) {
    console.error(`  ${v.file}:${v.line}  <${v.name} ... />`);
  }
  console.error("");
}

if (namespaceViolations.length) {
  console.error(
    "Namespace imports of lucide-react are not allowed — they bypass the",
  );
  console.error(
    "wrapper by construction. Use named imports + <Icon icon={...} /> instead.\n",
  );
  for (const v of namespaceViolations) {
    console.error(
      `  ${v.file}:${v.line}  import * as ${v.local} from "lucide-react"`,
    );
  }
  console.error("");
}

if (sizeClassViolations.length) {
  console.error(
    "<Icon> callsites must use the size prop (xs/sm/md/lg/xl) — not",
  );
  console.error(
    "Tailwind w-N / h-N classes (those override the locked SVG size).\n",
  );
  for (const v of sizeClassViolations) {
    console.error(
      `  ${v.file}:${v.line}  className contains "${v.offending}"`,
    );
  }
  console.error("");
}

console.error(`${total} violation(s). See client/src/components/ui/icon.tsx.`);
process.exit(1);
