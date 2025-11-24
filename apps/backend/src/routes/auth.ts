import type { FastifyPluginAsync } from "fastify";
import {
  createSession as dbCreateSession,
  createUser,
  deleteSession as dbDeleteSession,
  getUserByUsername,
  purgeExpiredSessions,
  updateUserPassword,
  updateUserKeyfile,
  verifyKeyfile,
  verifyPassword,
} from "../services/authRepository";
import { createSession, store } from "../services/mockStore";
import { requireSession } from "../utils/auth";

const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOGIN_BLOCK_MS = 2 * 60 * 1000; // 2 minutes lockout after max failures
const LOGIN_MAX_FAILURES = 5;

const loginAttempts = new Map<
  string,
  { failures: number; firstAttempt: number; blockedUntil?: number }
>();

function loginAttemptKey(username: string | undefined, ip: string) {
  return `${username ?? "unknown"}|${ip}`;
}

function recordFailure(key: string) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || now - current.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { failures: 1, firstAttempt: now });
    return;
  }
  const failures = current.failures + 1;
  const blockedUntil =
    failures >= LOGIN_MAX_FAILURES ? now + LOGIN_BLOCK_MS : current.blockedUntil;
  loginAttempts.set(key, { failures, firstAttempt: current.firstAttempt, blockedUntil });
}

function isBlocked(key: string) {
  const entry = loginAttempts.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return entry.blockedUntil;
  }
  if (entry.blockedUntil && entry.blockedUntil <= now) {
    loginAttempts.delete(key);
    return null;
  }
  if (now - entry.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return null;
  }
  return null;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/login", async (request, reply) => {
    const body = request.body as { username?: string; password?: string; keyfileToken?: string };
    if (!body?.username) {
      reply.code(400).send({ error: { code: "bad_request", message: "username is required" } });
      return;
    }

    const attemptKey = loginAttemptKey(body.username, request.ip);
    const blockedUntil = isBlocked(attemptKey);
    if (blockedUntil) {
      const retryAfterMs = blockedUntil - Date.now();
      reply
        .code(429)
        .header("Retry-After", Math.ceil(retryAfterMs / 1000))
        .send({
          error: {
            code: "rate_limited",
            message: "Too many failed login attempts. Please wait before retrying.",
          },
        });
      return;
    }

    if (fastify.db) {
      try {
        await purgeExpiredSessions(fastify.db);
        const existing = await getUserByUsername(fastify.db, body.username);
        const passwordValid =
          !!existing?.passwordHash && !!body.password && verifyPassword(body.password, existing.passwordHash);
        const keyfileValid =
          !!existing?.keyfilePath && !!body.keyfileToken && verifyKeyfile(body.keyfileToken, existing.keyfilePath);

        if (existing) {
          const needsPassword = !!existing.passwordHash;
          const needsKeyfile = !!existing.keyfilePath;
          const authenticated = passwordValid || keyfileValid || (!needsPassword && !needsKeyfile);

          if (!authenticated) {
            recordFailure(attemptKey);
            reply
              .code(401)
              .send({ error: { code: "unauthorized", message: "Invalid credentials for user" } });
            return;
          }

          if (!existing.passwordHash && body.password) {
            await updateUserPassword(fastify.db, existing.id, body.password);
          }
          if (!existing.keyfilePath && body.keyfileToken) {
            await updateUserKeyfile(fastify.db, existing.id, body.keyfileToken);
          }

          const sessionRow = await dbCreateSession(fastify.db, existing.id);
          reply.send({
            token: sessionRow.token,
            user: { id: existing.id, username: existing.username },
          });
          loginAttempts.delete(attemptKey);
          return;
        }

        if (!body.password && !body.keyfileToken) {
          recordFailure(attemptKey);
          reply
            .code(400)
            .send({ error: { code: "bad_request", message: "Provide a password or keyfileToken" } });
          return;
        }

        const userRow = await createUser(fastify.db, body.username, body.password);
        if (body.keyfileToken) {
          await updateUserKeyfile(fastify.db, userRow.id, body.keyfileToken);
        }

        const sessionRow = await dbCreateSession(fastify.db, userRow.id);
        reply.send({
          token: sessionRow.token,
          user: { id: userRow.id, username: userRow.username },
        });
        loginAttempts.delete(attemptKey);
        return;
      } catch (err) {
        fastify.log.error({ err }, "Failed to login with database; falling back to memory store.");
      }
    }

    const session = createSession(body.username);
    reply.send({
      token: session.token,
      user: { id: session.userId, username: session.username },
    });
    loginAttempts.delete(attemptKey);
  });

  fastify.post("/logout", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    if (fastify.db) {
      try {
        await dbDeleteSession(fastify.db, session.token);
        reply.code(204).send();
        return;
      } catch (err) {
        fastify.log.error({ err }, "Failed to delete session in database; removing from memory.");
      }
    }

    store.sessions.delete(session.token);
    reply.code(204).send();
  });
};
