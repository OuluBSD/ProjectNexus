import assert from "node:assert/strict";
import Fastify from "fastify";
import { afterEach, test } from "node:test";
import { authRoutes, loginThrottleState } from "../routes/auth";
import * as authRepo from "../services/authRepository";
import * as schema from "@nexus/shared/db/schema";
import { validateToken } from "../utils/auth";
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
