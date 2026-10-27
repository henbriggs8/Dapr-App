import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { generateKeyPairSync, sign } from "node:crypto";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import * as schema from "../shared/schema";
import { asapAvailabilityRequestSchema } from "./asap-availability";
import { publishCapacityRequestSchema } from "./time-slot-capacity";

// Captured from the previous staging commit before upgrading libraries.
// These are synthetic contracts, not production records; no DB is opened.
const baseline = JSON.parse(readFileSync(new URL("./test/fixtures/dependency-compatibility.json", import.meta.url), "utf8"));
const schemas: Record<string, any> = { ...schema, asapAvailabilityRequestSchema, publishCapacityRequestSchema };

test("dependency upgrades preserve 252 captured validation outcomes and parsed values", () => {
  for (const fixture of baseline.cases) {
    assert.ok(schemas[fixture.schema]._zod, `${fixture.schema} must use the patched Zod 4 implementation`);
    const parsed = schemas[fixture.schema].safeParse(fixture.input);
    const actual = parsed.success ? { success: true, data: parsed.data }
      : { success: false, paths: parsed.error.issues.map((issue: any) => issue.path.join(".")).sort() };
    assert.deepEqual(actual, fixture.expected, `${fixture.schema}: ${fixture.label}`);
  }
});

test("upgraded pg adapter retains transaction commit, rollback and release using a fake client", async () => {
  const statements: { text: string; params: unknown[] }[] = [];
  let releases = 0;
  const client = {
    async query(config: { text: string }, params: unknown[]) {
      statements.push({ text: config.text, params });
      return { rows: config.text.startsWith("update ") ? [[12, 9685]] : [], rowCount: 1 };
    },
    release() { releases += 1; },
  };
  class FakePool { async connect() { return client; } }
  const db = drizzle(new FakePool() as any);
  const updated = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"fixture-lock"}))`);
    await tx.select({ id: schema.bookings.id }).from(schema.bookings).where(eq(schema.bookings.id, 12)).for("update");
    return tx.update(schema.bookings).set({ providerEarnings: 9685 }).where(eq(schema.bookings.id, 12))
      .returning({ id: schema.bookings.id, providerEarnings: schema.bookings.providerEarnings });
  });
  assert.deepEqual(updated, [{ id: 12, providerEarnings: 9685 }]);
  assert.equal(statements[0].text, "begin");
  assert.match(statements[1].text, /pg_advisory_xact_lock/);
  assert.match(statements[2].text, /for update$/);
  assert.deepEqual(statements[3].params, [9685, 12]);
  assert.equal(statements.at(-1)?.text, "commit");
  await assert.rejects(() => db.transaction(async () => { throw new Error("fixture rollback"); }), /fixture rollback/);
  assert.equal(statements.at(-1)?.text, "rollback");
  assert.equal(releases, 2);
});

test("Drizzle upgrade preserves table definitions and normal query compilation without a database", () => {
  const tables: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    try {
      const table = getTableConfig(value as any);
      tables[key] = { name: table.name, columns: table.columns.map(column => ({
        name: column.name, type: column.getSQLType(), notNull: column.notNull,
        hasDefault: column.hasDefault, primary: column.primary,
      })) };
    } catch { /* Non-table exports. */ }
  }
  assert.deepEqual(tables, baseline.tables);
  const db = drizzle.mock();
  const compiled = {
    select: db.select({ id: schema.bookings.id, status: schema.bookings.status }).from(schema.bookings)
      .where(and(eq(schema.bookings.userId, 7), eq(schema.bookings.isPaid, true))).toSQL(),
    bookingUpdate: db.update(schema.bookings).set({ status: "completed", providerEarnings: 9685 })
      .where(eq(schema.bookings.id, 12)).returning({ id: schema.bookings.id }).toSQL(),
    providerApproval: db.update(schema.users).set({ isProvider: true }).where(eq(schema.users.id, 9)).toSQL(),
    advisoryLock: new PgDialect().sqlToQuery(sql`select pg_advisory_xact_lock(hashtext(${"provider-approval:9"}))`),
  };
  assert.deepEqual(JSON.parse(JSON.stringify(compiled)), baseline.compiled);
});

test("patched Drizzle escapes embedded PostgreSQL identifier delimiters", () => {
  const dialect = new PgDialect();
  assert.equal(dialect.escapeName('field"; DROP TABLE users;--'), '"field""; DROP TABLE users;--"');
  assert.deepEqual(dialect.sqlToQuery(sql`select ${sql.identifier('field"name')}`), {
    sql: 'select "field""name"', params: [],
  });
});

test("Zod 4 form resolver preserves booking values, field errors and required messages", async () => {
  const fixture = baseline.cases.find((item: any) => item.schema === "bookingFormSchema" && item.label === "valid");
  const resolver = zodResolver(schema.bookingFormSchema);
  const options = { fields: {}, shouldUseNativeValidation: false, criteriaMode: "all" as const };
  const valid = await resolver(fixture.input, undefined, options);
  assert.deepEqual(valid.errors, {});
  assert.deepEqual(valid.values, fixture.expected.data);
  const invalid = await resolver({ ...fixture.input, serviceId: undefined, timeSlotId: undefined, serviceLocationType: undefined }, undefined, options);
  assert.equal(invalid.errors.serviceId?.message, "Service ID is required");
  assert.equal(invalid.errors.timeSlotId?.message, "Time slot ID is required");
  assert.equal(invalid.errors.serviceLocationType?.message, "Please select a location type");
});

test("patched Zod rejects oversized constrained arrays before traversing elements", () => {
  const input = Array(10_000).fill(42);
  Object.defineProperty(input, "0", { get() { throw new Error("Oversized collection was traversed"); } });
  const result = z.array(z.string()).max(2).safeParse(input);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues.length, 1);
    assert.equal(result.error.issues[0].code, "too_big");
  }
});

test("Clerk SDK preserves offline signed-token verification and rejects invalid credentials", async () => {
  const { clerkClient } = await import("@clerk/clerk-sdk-node");
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: "user_fixture", sid: "sess_fixture", iss: "https://fixture.clerk.accounts.dev",
    azp: "https://dapr-staging.invalid", iat: now - 10, nbf: now - 10, exp: now + 300 };
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "fixture" })).toString("base64url");
  const token = (payload: typeof claims) => {
    const text = `${header}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
    return `${text}.${sign("RSA-SHA256", Buffer.from(text), privateKey).toString("base64url")}`;
  };
  const options = { jwtKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    issuer: claims.iss, authorizedParties: [claims.azp] };
  const verified = await clerkClient.verifyToken(token(claims), options);
  assert.equal(verified.sub, claims.sub);
  assert.equal(verified.sid, claims.sid);
  await assert.rejects(() => clerkClient.verifyToken(token({ ...claims, exp: now - 300 }), options));
  await assert.rejects(() => clerkClient.verifyToken(token({ ...claims, azp: "https://evil.invalid" }), options));
  const parts = token(claims).split(".");
  parts[1] = Buffer.from(JSON.stringify({ ...claims, sub: "user_other" })).toString("base64url");
  await assert.rejects(() => clerkClient.verifyToken(parts.join("."), options));
});

test("Clerk's resolved cookie dependency prevents inherited cookie attribute injection", async () => {
  const require = createRequire(import.meta.url);
  const clerkShared = require.resolve("@clerk/shared");
  const cookiePath = require.resolve("js-cookie", { paths: [dirname(clerkShared)] });
  const Cookies = require(cookiePath);
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  const document = { cookie: "" };
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  try {
    const instance = Cookies.withAttributes({ domain: "fixture.test", secure: true, sameSite: "Strict" });
    instance.set("session", "synthetic-fixture", JSON.parse('{"__proto__":{"domain":"evil.test","secure":false,"samesite":"None"}}'));
    assert.match(document.cookie, /domain=fixture\.test/);
    assert.match(document.cookie, /; secure(?:;|$)/);
    assert.match(document.cookie, /sameSite=Strict/);
    assert.doesNotMatch(document.cookie, /evil\.test|None|__proto__/);
    instance.set("normal", "space and + slash/", { path: "/staging" });
    assert.match(document.cookie, /; path=\/staging/);
    assert.equal(instance.get("normal"), "space and + slash/");
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
