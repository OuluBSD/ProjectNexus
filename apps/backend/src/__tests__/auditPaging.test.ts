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
  private limitValue: number | undefined;

  constructor(private readonly rows: AuditRow[]) {}

  select() {
    return this;
  }

  from() {
    return this;
  }

  orderBy() {
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  where() {
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
  constructor(private readonly rows: AuditRow[]) {}

  select() {
    return new FakeBuilder(this.rows);
  }
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
