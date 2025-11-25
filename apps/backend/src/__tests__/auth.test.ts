import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, test } from "node:test";
import { authRoutes, loginThrottleState } from "../routes/auth";
import * as authRepo from "../services/authRepository";
import * as schema from "@nexus/shared/db/schema";
import { requireSession, validateToken } from "../utils/auth";
import { createSession, store } from "../services/mockStore";
import { mock } from "node:test";

afterEach(() => {
  mock.restoreAll();
});

test("login blocks after repeated failures per user/IP", async () => {
  const app = Fastify({ logger: false });
  await app.register(authRoutes, { prefix: "/auth" });
  await app.ready();

  const ip = "127.0.0.1";
  const attemptKey = loginThrottleState.loginAttemptKey("throttle-user", ip);
  for (let i = 0; i < loginThrottleState.maxFailures; i++) {
    loginThrottleState.recordFailure(attemptKey);
  }

  const blocked = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { username: "throttle-user", password: "wrong" },
    remoteAddress: ip,
  });
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers["retry-after"]) >= 0);

  loginThrottleState.attempts.clear();
  await app.close();
});

test("purgeExpiredSessions issues a delete against session table", async () => {
  const calls: { table: unknown; condition: unknown }[] = [];
  const fakeDb = {
    delete(table: unknown) {
      return {
        where: (condition: unknown) => {
          calls.push({ table, condition });
          return Promise.resolve();
        },
      };
    },
  };

  await authRepo.purgeExpiredSessions(fakeDb as any);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].table, schema.sessions);
  assert.ok(calls[0].condition);
});

test("getSessionWithUser prunes expired database sessions", async () => {
  const expired = new Date(Date.now() - 1000);
  let deletedToken: string | null = null;

  const fakeDb = {
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          where: async () => [
            {
              session: { token: "expired", userId: "user-1", expiresAt: expired },
              user: { id: "user-1", username: "expired-user" },
            },
          ],
        }),
      }),
    }),
    delete: () => ({
      where: () => {
        deletedToken = "expired";
        return Promise.resolve();
      },
    }),
  };

  const session = await authRepo.getSessionWithUser(fakeDb as any, "expired");

  assert.equal(session, null);
  assert.equal(deletedToken, "expired");
});

test("successful login clears throttle attempts for the user/ip pair", async () => {
  const app = Fastify({ logger: false });
  await app.register(authRoutes, { prefix: "/auth" });
  await app.ready();

  const ip = "10.0.0.5";
  const attemptKey = loginThrottleState.loginAttemptKey("throttle-clear", ip);
  loginThrottleState.recordFailure(attemptKey);
  assert.ok(loginThrottleState.attempts.has(attemptKey));

  try {
    const ok = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "throttle-clear", password: "pw" },
      remoteAddress: ip,
    });
    assert.equal(ok.statusCode, 200);
    assert.ok(!loginThrottleState.attempts.has(attemptKey));
  } finally {
    loginThrottleState.attempts.clear();
    await app.close();
  }
});

test("validateToken purges expired sessions before resolving", async () => {
  const future = new Date(Date.now() + 60_000);
  let purged = false;
  const fakeDb = {
    delete: () => ({
      where: () => {
        purged = true;
        return Promise.resolve();
      },
    }),
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          where: async () => [
            {
              session: { token: "db-token", userId: "db-user", expiresAt: future },
              user: { id: "db-user", username: "db-user" },
            },
          ],
        }),
      }),
    }),
  };

  const fastifyLike = { db: fakeDb as any, log: { error: () => {} } } as any;
  const session = await validateToken(fastifyLike, "db-token");

  assert.ok(purged, "purgeExpiredSessions should run before lookup");
  assert.equal(session?.token, "db-token");
  assert.equal(session?.userId, "db-user");
  assert.equal(session?.username, "db-user");
});

test("throttle unblocks after block window elapses", async () => {
  const app = Fastify({ logger: false });
  await app.register(authRoutes, { prefix: "/auth" });
  await app.ready();

  const ip = "192.168.1.2";
  const attemptKey = loginThrottleState.loginAttemptKey("slow-user", ip);
  for (let i = 0; i < loginThrottleState.maxFailures; i++) {
    loginThrottleState.recordFailure(attemptKey);
  }

  try {
    const blocked = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "slow-user", password: "pw" },
      remoteAddress: ip,
    });
    assert.equal(blocked.statusCode, 429);

    const now = Date.now();
    loginThrottleState.attempts.set(attemptKey, {
      failures: loginThrottleState.maxFailures,
      firstAttempt: now - loginThrottleState.windowMs - 1000,
      blockedUntil: now - 1000,
    });

    const allowed = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "slow-user", password: "pw" },
      remoteAddress: ip,
    });
    assert.equal(allowed.statusCode, 200);
  } finally {
    loginThrottleState.attempts.clear();
    await app.close();
  }
});

test("login purges expired sessions before creating a db session", async () => {
  const calls: string[] = [];
  const db = {
    delete: () => {
      calls.push("delete:sessions");
      return { where: async () => calls.push("delete.where") };
    },
    select: () => ({
      from: () => ({
        where: async () => {
          calls.push("select.users");
          return [];
        },
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: any) => ({
        returning: async () => {
          if (table === schema.users) {
            calls.push("insert.users");
            return [
              { id: "db-user", username: values.username, passwordHash: values.passwordHash },
            ];
          }
          calls.push("insert.sessions");
          return [
            {
              token: "db-token",
              userId: values.userId ?? "db-user",
              expiresAt: new Date(Date.now() + 1000),
              createdAt: new Date(),
            },
          ];
        },
      }),
    }),
    update: () => ({
      set: () => ({ where: async () => {} }),
    }),
  };

  const app = Fastify({ logger: false }) as FastifyInstance & { db: typeof db };
  app.decorate("db", db);
  await app.register(authRoutes, { prefix: "/auth" });
  await app.ready();

  try {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "db-user", password: "pw" },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(calls[0], "delete:sessions");
    assert.ok(calls.includes("insert.sessions"));
  } finally {
    loginThrottleState.attempts.clear();
    await app.close();
  }
});

test("blocked login short-circuits before hitting the database", async () => {
  const attemptKey = loginThrottleState.loginAttemptKey("blocked-user", "127.0.0.9");
  loginThrottleState.attempts.set(attemptKey, {
    failures: loginThrottleState.maxFailures,
    firstAttempt: Date.now(),
    blockedUntil: Date.now() + loginThrottleState.blockMs,
  });

  const dbCalls: string[] = [];
  const db = {
    delete: () => {
      dbCalls.push("delete");
      return { where: async () => {} };
    },
    select: () => {
      dbCalls.push("select");
      return { from: () => ({ where: async () => [] }) };
    },
  };

  const app = Fastify({ logger: false }) as FastifyInstance & { db: typeof db };
  app.decorate("db", db);
  await app.register(authRoutes, { prefix: "/auth" });
  await app.ready();

  try {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "blocked-user", password: "pw" },
      remoteAddress: "127.0.0.9",
    });
    assert.equal(res.statusCode, 429);
    assert.equal(dbCalls.length, 0);
  } finally {
    loginThrottleState.attempts.clear();
    await app.close();
  }
});

test("requireSession returns 401 when no authorization is provided", async () => {
  const app = Fastify({ logger: false });
  app.get("/secure", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    return { ok: true };
  });
  await app.ready();

  const res = await app.inject({ method: "GET", url: "/secure" });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.json(), {
    error: { code: "unauthorized", message: "Missing or invalid session" },
  });

  await app.close();
});

test("requireSession falls back to memory sessions when database lookup fails", async () => {
  const app = Fastify({ logger: false });
  const session = createSession("fallback-user");

  app.decorate("db", {
    delete: () => {
      throw new Error("db offline");
    },
  });
  app.get("/secure", async (request, reply) => {
    const resolved = await requireSession(request, reply);
    if (!resolved) return;
    return { token: resolved.token, username: resolved.username };
  });
  await app.ready();

  try {
    const res = await app.inject({
      method: "GET",
      url: "/secure",
      headers: { authorization: `Bearer ${session.token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { token: session.token, username: session.username });
  } finally {
    store.sessions.delete(session.token);
    await app.close();
  }
});

test("validateToken uses memory store when database returns no session", async () => {
  const session = createSession("memory-user");
  const errors: unknown[] = [];

  const fastifyLike = {
    db: {
      delete: () => {
        throw new Error("db offline");
      },
    },
    log: { error: (err: unknown) => errors.push(err) },
  } as any;
  const resolved = await validateToken(fastifyLike, session.token);

  assert.ok(errors.length >= 1, "database failure should be logged before falling back");
  assert.equal(resolved?.token, session.token);
  assert.equal(resolved?.username, session.username);
  store.sessions.delete(session.token);
});

test("GET /auth/session requires a valid session token", async () => {
  const app = Fastify({ logger: false });
  await app.register(authRoutes, { prefix: "/auth" });
  await app.ready();

  try {
    const res = await app.inject({ method: "GET", url: "/auth/session" });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), {
      error: { code: "unauthorized", message: "Missing or invalid session" },
    });
  } finally {
    await app.close();
  }
});

test("GET /auth/session returns the authenticated session", async () => {
  const app = Fastify({ logger: false });
  await app.register(authRoutes, { prefix: "/auth" });
  await app.ready();
  const session = createSession("session-user");

  try {
    const res = await app.inject({
      method: "GET",
      url: "/auth/session",
      headers: { authorization: `Bearer ${session.token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), {
      token: session.token,
      user: { id: session.userId, username: session.username },
    });
  } finally {
    store.sessions.delete(session.token);
    await app.close();
  }
});
