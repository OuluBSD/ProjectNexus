import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, test } from "node:test";
import { auditRoutes } from "../routes/audit";
import { createSession, store } from "../services/mockStore";

type AuditRow = {
  id: string;
  eventType: string;
  createdAt: Date;
  path?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown> | null;
};

class FakeBuilder {
  public limitValue: number | undefined;
  public whereClause: unknown;
  public orderings: unknown[] = [];

  constructor(private readonly rows: AuditRow[]) {}

  select() {
    return this;
  }

  from() {
    return this;
  }

  orderBy(...orderings: unknown[]) {
    this.orderings = orderings;
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  where(clause: unknown) {
    this.whereClause = clause;
    return this;
  }

  then(resolve: (value: AuditRow[]) => void, reject?: (err: unknown) => void) {
    try {
      const output = typeof this.limitValue === "number" ? this.rows.slice(0, this.limitValue) : this.rows;
      resolve(output);
    } catch (err) {
      reject?.(err);
    }
  }
}

class FakeDb {
  public lastBuilder: FakeBuilder | undefined;

  constructor(private readonly rows: AuditRow[]) {}

  select() {
    this.lastBuilder = new FakeBuilder(this.rows);
    return this.lastBuilder;
  }
}

function flattenSql(input: unknown): string {
  if (!input) return "";
  if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
    return String(input);
  }
  if (Array.isArray(input)) {
    return input.map(flattenSql).join("");
  }
  if (typeof input === "object" && "queryChunks" in (input as Record<string, unknown>)) {
    return ((input as { queryChunks: unknown[] }).queryChunks ?? []).map(flattenSql).join("");
  }
  if (typeof input === "object" && "value" in (input as Record<string, unknown>)) {
    return flattenSql((input as { value: unknown }).value);
  }
  if (typeof input === "object" && "name" in (input as Record<string, unknown>)) {
    return flattenSql((input as { name: unknown }).name);
  }
  return "";
}

afterEach(() => {
  store.sessions.clear();
});

test("marks hasMore=false when result count equals requested page size", async () => {
  const rows: AuditRow[] = [
    { id: "a", eventType: "fs:read", createdAt: new Date("2024-01-01T00:00:00Z") },
    { id: "b", eventType: "terminal:input", createdAt: new Date("2024-01-01T00:00:01Z") },
  ];
  const app = Fastify({ logger: false }) as FastifyInstance & { db: FakeDb };
  app.db = new FakeDb(rows);
  await app.register(auditRoutes);
  await app.ready();

  const session = createSession("audit-user");
  const res = await app.inject({
    method: "GET",
    url: "/audit/events?limit=2",
    headers: { "x-session-token": session.token },
  });

  assert.equal(res.statusCode, 200);
  const payload = res.json() as { events: AuditRow[]; paging: { hasMore: boolean; nextCursor?: string } };
  assert.equal(payload.events.length, 2);
  assert.equal(payload.paging.hasMore, false);
  assert.ok(!payload.paging.nextCursor);
  await app.close();
});

test("uses trimmed rows for cursor and hasMore when more data exists", async () => {
  const rows: AuditRow[] = [
    { id: "a", eventType: "fs:read", createdAt: new Date("2024-01-01T00:00:00Z") },
    { id: "b", eventType: "fs:write", createdAt: new Date("2024-01-01T00:00:01Z") },
    { id: "c", eventType: "terminal:input", createdAt: new Date("2024-01-01T00:00:02Z") },
  ];
  const app = Fastify({ logger: false }) as FastifyInstance & { db: FakeDb };
  app.db = new FakeDb(rows);
  await app.register(auditRoutes);
  await app.ready();

  const session = createSession("audit-user");
  const res = await app.inject({
    method: "GET",
    url: "/audit/events?limit=2",
    headers: { "x-session-token": session.token },
  });

  assert.equal(res.statusCode, 200);
  const payload = res.json() as { events: AuditRow[]; paging: { hasMore: boolean; nextCursor?: string } };
  assert.equal(payload.events.length, 2);
  assert.equal(payload.paging.hasMore, true);
  assert.equal(payload.paging.nextCursor, `${rows[1].createdAt.toISOString()}|${rows[1].id}`);
  await app.close();
});

test("builds filter clauses for project, type, user, and path", async () => {
  const rows: AuditRow[] = [
    { id: "a", eventType: "fs:read", createdAt: new Date("2024-01-01T00:00:00Z"), projectId: "proj-1", userId: "u1", path: "/a.txt" },
    { id: "b", eventType: "fs:write", createdAt: new Date("2024-01-01T00:00:01Z"), projectId: "proj-2", userId: "u2", path: "/b.txt" },
  ];
  const app = Fastify({ logger: false }) as FastifyInstance & { db: FakeDb };
  app.db = new FakeDb(rows);
  await app.register(auditRoutes);
  await app.ready();

  const session = createSession("audit-user");
  const res = await app.inject({
    method: "GET",
    url: "/audit/events?projectId=proj-1&eventType=fs:read&userId=u1&pathContains=.txt&ipAddress=127.0.0.1",
    headers: { "x-session-token": session.token },
  });

  assert.equal(res.statusCode, 200);
  const whereText = flattenSql(app.db.lastBuilder?.whereClause);
  assert.ok(whereText.includes("project_id"));
  assert.ok(whereText.includes("proj-1"));
  assert.ok(whereText.includes("event_type"));
  assert.ok(whereText.includes("fs:read"));
  assert.ok(whereText.includes("user_id"));
  assert.ok(whereText.includes("u1"));
  assert.ok(whereText.includes("ip_address"));
  assert.ok(whereText.includes("127.0.0.1"));
  assert.ok(whereText.toLowerCase().includes("like"));
  assert.ok(whereText.includes(".txt"));
  await app.close();
});

test("uses ascending order when sort=asc is supplied", async () => {
  const rows: AuditRow[] = [
    { id: "a", eventType: "fs:read", createdAt: new Date("2024-01-01T00:00:00Z") },
  ];
  const app = Fastify({ logger: false }) as FastifyInstance & { db: FakeDb };
  app.db = new FakeDb(rows);
  await app.register(auditRoutes);
  await app.ready();

  const session = createSession("audit-user");
  const res = await app.inject({
    method: "GET",
    url: "/audit/events?sort=asc",
    headers: { "x-session-token": session.token },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(app.db.lastBuilder?.orderings.length, 2);
  const [createdOrder, idOrder] = app.db.lastBuilder?.orderings ?? [];
  const createdOrderText = flattenSql(createdOrder);
  const idOrderText = flattenSql(idOrder);
  assert.ok(createdOrderText.toLowerCase().includes("asc"));
  assert.ok(idOrderText.toLowerCase().includes("asc"));
  await app.close();
});
