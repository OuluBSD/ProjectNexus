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

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/login", async (request, reply) => {
    const body = request.body as { username?: string; password?: string; keyfileToken?: string };
    if (!body?.username) {
      reply.code(400).send({ error: { code: "bad_request", message: "username is required" } });
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
          return;
        }

        if (!body.password && !body.keyfileToken) {
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
