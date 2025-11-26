import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { GitStorage } from "../services/gitStorage";
import { GitSync } from "../services/gitSync";
import { loadEnv } from "../utils/env";

declare module "fastify" {
  interface FastifyInstance {
    gitStorage?: GitStorage;
    gitSync?: GitSync;
  }
}

/**
 * Git storage plugin that makes GitStorage and GitSync available on the Fastify instance
 */
const gitStoragePlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const env = loadEnv(process.env);

  // Create GitStorage instance
  const gitStorage = new GitStorage({
    projectsRoot: env.PROJECTS_ROOT,
  });

  // Register GitStorage
  fastify.decorate("gitStorage", gitStorage);

  // Create GitSync instance if database is available
  if (fastify.db) {
    const gitSync = new GitSync(fastify.db, gitStorage);
    fastify.decorate("gitSync", gitSync);

    fastify.log.info(
      { projectsRoot: env.PROJECTS_ROOT },
      "Git storage initialized with database sync"
    );
  } else {
    fastify.log.info(
      { projectsRoot: env.PROJECTS_ROOT },
      "Git storage initialized (database not available, sync disabled)"
    );
  }
};

export default fp(gitStoragePlugin, {
  name: "git-storage",
  dependencies: ["db"], // Depends on database plugin
});
