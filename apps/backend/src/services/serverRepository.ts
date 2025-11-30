/**
 * Server repository abstraction layer
 * Works with both PostgreSQL and JSON database backends
 */
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";
import * as schema from "@nexus/shared/db/schema";
import type { JsonDatabase } from "./jsonDatabase";

export type Server = typeof schema.servers.$inferSelect;
export type NewServer = typeof schema.servers.$inferInsert;

/**
 * Server repository interface
 */
export interface IServerRepository {
  listServers(): Promise<Server[]>;
  getServer(serverId: string): Promise<Server | null>;
  createServer(data: Partial<NewServer>): Promise<Server>;
  updateServer(serverId: string, data: Partial<NewServer>): Promise<Server | null>;
  deleteServer(serverId: string): Promise<boolean>;
  updateServerHealth(
    serverId: string,
    status: "online" | "offline" | "degraded"
  ): Promise<Server | null>;
}

/**
 * PostgreSQL implementation
 */
class PostgresServerRepository implements IServerRepository {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async listServers(): Promise<Server[]> {
    return this.db.select().from(schema.servers).orderBy(desc(schema.servers.createdAt));
  }

  async getServer(serverId: string): Promise<Server | null> {
    const [server] = await this.db
      .select()
      .from(schema.servers)
      .where(eq(schema.servers.id, serverId));
    return server || null;
  }

  async createServer(data: Partial<NewServer>): Promise<Server> {
    const newServer: NewServer = {
      name: data.name || "Unnamed Server",
      type: data.type || "worker",
      host: data.host || "localhost",
      port: data.port || 3002,
      status: data.status || "offline",
      metadata: data.metadata || null,
      lastHealthCheck: null,
    };

    const [created] = await this.db.insert(schema.servers).values(newServer).returning();
    return created;
  }

  async updateServer(serverId: string, data: Partial<NewServer>): Promise<Server | null> {
    const updates: Partial<NewServer> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.type !== undefined) updates.type = data.type;
    if (data.host !== undefined) updates.host = data.host;
    if (data.port !== undefined) updates.port = data.port;
    if (data.status !== undefined) updates.status = data.status;
    if (data.metadata !== undefined) updates.metadata = data.metadata;
    if (data.lastHealthCheck !== undefined) updates.lastHealthCheck = data.lastHealthCheck;

    // Always update the updatedAt timestamp
    updates.updatedAt = new Date();

    const [updated] = await this.db
      .update(schema.servers)
      .set(updates)
      .where(eq(schema.servers.id, serverId))
      .returning();

    return updated || null;
  }

  async deleteServer(serverId: string): Promise<boolean> {
    const result = await this.db.delete(schema.servers).where(eq(schema.servers.id, serverId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateServerHealth(
    serverId: string,
    status: "online" | "offline" | "degraded"
  ): Promise<Server | null> {
    const [updated] = await this.db
      .update(schema.servers)
      .set({
        status,
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.servers.id, serverId))
      .returning();

    return updated || null;
  }
}

/**
 * JSON database implementation
 */
class JsonServerRepository implements IServerRepository {
  constructor(private jsonDb: JsonDatabase) {}

  async listServers(): Promise<Server[]> {
    return this.jsonDb.listServers();
  }

  async getServer(serverId: string): Promise<Server | null> {
    return this.jsonDb.getServerById(serverId);
  }

  async createServer(data: Partial<NewServer>): Promise<Server> {
    return this.jsonDb.createServer(data);
  }

  async updateServer(serverId: string, data: Partial<NewServer>): Promise<Server | null> {
    return this.jsonDb.updateServer(serverId, data);
  }

  async deleteServer(serverId: string): Promise<boolean> {
    return this.jsonDb.deleteServer(serverId);
  }

  async updateServerHealth(
    serverId: string,
    status: "online" | "offline" | "degraded"
  ): Promise<Server | null> {
    return this.jsonDb.updateServerHealth(serverId, status);
  }
}

/**
 * Factory function to create the appropriate repository based on available database
 */
export function createServerRepository(
  db?: NodePgDatabase<typeof schema>,
  jsonDb?: JsonDatabase
): IServerRepository | null {
  if (db) {
    return new PostgresServerRepository(db);
  }
  if (jsonDb) {
    return new JsonServerRepository(jsonDb);
  }
  return null;
}
