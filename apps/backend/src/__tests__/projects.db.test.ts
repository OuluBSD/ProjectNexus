import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@nexus/shared/db/schema";
import { projectRoutes } from "../routes/projects";
import { createSession, store } from "../services/mockStore";

async function buildDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const migrationsFolder = path.resolve(
    new URL("../../../../packages/shared/db/migrations", import.meta.url).pathname
  );
  await migrate(db, { migrationsFolder });
  return { client, db };
}

function makeApp(db: ReturnType<typeof drizzle>) {
  const app = Fastify({ logger: false }) as FastifyInstance & { db: typeof db };
  app.db = db as any;
  return app;
}

test("projects API uses the database for list/create/update", async () => {
  const { client, db } = await buildDb();
  const app = makeApp(db);
  await app.register(projectRoutes);
  await app.ready();

  const session = createSession("db-projects");

  try {
    const [seed] = await db
      .insert(schema.projects)
      .values({ name: "DB Seed", category: "demo" })
      .returning();

    const listRes = await app.inject({
      method: "GET",
      url: "/projects",
      headers: { "x-session-token": session.token },
    });
    assert.equal(listRes.statusCode, 200);
    const listed = listRes.json() as Array<{ id: string; name: string; category?: string }>;
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, seed.id);
    assert.equal(listed[0].name, "DB Seed");

    const createRes = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { "x-session-token": session.token },
      payload: { name: "Created via API", category: "product", description: "from test" },
    });
    assert.equal(createRes.statusCode, 201);
    const createdId = (createRes.json() as { id: string }).id;
    assert.ok(createdId);

    const [createdRow] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, createdId));
    assert.ok(createdRow, "created project persisted to database");
    assert.equal(createdRow.description, "from test");

    const patchRes = await app.inject({
      method: "PATCH",
      url: `/projects/${createdId}`,
      headers: { "x-session-token": session.token },
      payload: { name: "Renamed", status: "waiting" },
    });
    assert.equal(patchRes.statusCode, 200);
    const patched = patchRes.json() as { id: string; name: string; status: string };
    assert.equal(patched.name, "Renamed");
    assert.equal(patched.status, "waiting");

    const [patchedRow] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, createdId));
    assert.equal(patchedRow?.name, "Renamed");
    assert.equal(patchedRow?.status, "waiting");
  } finally {
    await app.close();
    await client.close();
    store.sessions.delete(session.token);
  }
});

test("project details endpoint returns roadmap lists from the database", async () => {
  const { client, db } = await buildDb();
  const app = makeApp(db);
  await app.register(projectRoutes);
  await app.ready();

  const session = createSession("db-project-details");

  try {
    const [project] = await db
      .insert(schema.projects)
      .values({ name: "Details Project" })
      .returning();
    const [roadmap] = await db
      .insert(schema.roadmapLists)
      .values({ projectId: project.id, title: "Roadmap A", tags: "api,db", progress: "0.25" })
      .returning();

    const res = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/details`,
      headers: { "x-session-token": session.token },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json() as {
      project: { id: string; name: string };
      roadmapLists: Array<{ id: string; title: string; progress: number; tags: string[] }>;
    };
    assert.equal(body.project.id, project.id);
    assert.equal(body.project.name, "Details Project");
    assert.equal(body.roadmapLists.length, 1);
    assert.equal(body.roadmapLists[0].id, roadmap.id);
    assert.deepEqual(body.roadmapLists[0].tags, ["api", "db"]);
    assert.equal(body.roadmapLists[0].progress, 0.25);
  } finally {
    await app.close();
    await client.close();
    store.sessions.delete(session.token);
  }
});
