import assert from "node:assert/strict";
import test from "node:test";
import { services, users } from "@shared/schema";

// No database is reachable; all initialize queries below are mocked.
process.env.DATABASE_URL = "postgresql://unit:unit@127.0.0.1:1/unused";
const { db } = await import("./db");
const { DatabaseStorage, MemStorage } = await import("./storage");

test("database startup seeds services but never reads or inserts privileged accounts", async t => {
  const inserts: unknown[] = [];
  t.mock.method(db, "select", (() => ({ from: (table: unknown) => {
    assert.notEqual(table, users, "startup must not bootstrap any identity");
    assert.equal(table, services);
    return { where: () => ({ orderBy: async () => [] }) };
  } })) as any);
  t.mock.method(db, "insert", ((table: unknown) => ({ values: async (input: unknown) => {
    assert.equal(table, services, "only service catalog startup writes are allowed");
    inserts.push(input);
  } })) as any);
  const storage = new DatabaseStorage();
  await storage.initialize();
  assert.equal(inserts.length, 4);
});

test("memory storage does not automatically create administrator or provider credentials", async t => {
  const creates: any[] = [];
  t.mock.method(MemStorage.prototype, "createUser", (async input => {
    creates.push(input);
    return { id: 1, ...input };
  }) as any);
  const storage = new MemStorage();
  await storage.initialize();
  assert.ok(creates.every(input => !input.isAdmin && !input.isProvider));
  assert.ok((await storage.getAllUsers()).every(user => !user.isAdmin && !user.isProvider));
});
