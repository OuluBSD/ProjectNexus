import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { registerRoutes } from "./routes";
import { loadEnv } from "./utils/env";
import { dbPlugin } from "./plugins/db";
import gitStoragePlugin from "./plugins/gitStorage";
import { purgeExpiredSessions } from "./services/authRepository";

async function start() {
  const env = loadEnv(process.env);
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(websocket);
  await app.register(dbPlugin);
  await app.register(gitStoragePlugin);

  app.get("/health", async () => ({ status: "ok" }));
  await app.register(registerRoutes, { prefix: "/api" });

  let sessionCleanup: NodeJS.Timeout | null = null;
  app.addHook("onReady", async () => {
    if (app.db && !sessionCleanup) {
      sessionCleanup = setInterval(
        async () => {
          try {
            await purgeExpiredSessions(app.db!);
          } catch (err) {
            app.log.error({ err }, "Failed to purge expired sessions");
          }
        },
        1000 * 60 * 15
      ); // every 15 minutes
      sessionCleanup.unref?.();
    }
  });

  app.addHook("onClose", async () => {
    if (sessionCleanup) clearInterval(sessionCleanup);
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Backend running on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
