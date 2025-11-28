/**
 * JSON file-based database with caching
 * Stores data in git repository as JSON files
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { users as usersSchema, sessions as sessionsSchema } from "@nexus/shared/db/schema";

// Types matching the database schema
export type User = typeof usersSchema.$inferSelect;
export type Session = typeof sessionsSchema.$inferSelect;
export type NewUser = typeof usersSchema.$inferInsert;
export type NewSession = typeof sessionsSchema.$inferInsert;

interface JsonDatabaseOptions {
  dataDir: string;
  maxCacheSize?: number; // Maximum number of items to cache per collection
  cacheTTL?: number; // Cache TTL in milliseconds
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * JSON-based database implementation
 * Files stored in: {dataDir}/db/{collection}.json
 * Supports caching to reduce file I/O
 */
export class JsonDatabase {
  private dataDir: string;
  private dbDir: string;
  private maxCacheSize: number;
  private cacheTTL: number;

  // Caches
  private usersCache = new Map<string, CacheEntry<User>>();
  private sessionsCache = new Map<string, CacheEntry<Session>>();
  private dirty = new Set<string>(); // Track which collections need to be written

  constructor(options: JsonDatabaseOptions) {
    this.dataDir = options.dataDir;
    this.dbDir = path.join(this.dataDir, "db");
    this.maxCacheSize = options.maxCacheSize || 1000;
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Initialize database directory structure
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.dbDir, { recursive: true });

    // Create default files if they don't exist
    const usersFile = path.join(this.dbDir, "users.json");
    const sessionsFile = path.join(this.dbDir, "sessions.json");

    try {
      await fs.access(usersFile);
    } catch {
      await fs.writeFile(usersFile, JSON.stringify([], null, 2));
    }

    try {
      await fs.access(sessionsFile);
    } catch {
      await fs.writeFile(sessionsFile, JSON.stringify([], null, 2));
    }
  }

  /**
   * Read users from file with caching
   */
  private async readUsers(): Promise<User[]> {
    const filePath = path.join(this.dbDir, "users.json");
    try {
      const content = await fs.readFile(filePath, "utf-8");

      if (!content.trim()) {
        return []; // Return empty array if file is empty
      }

      let rawUsers: any[];
      try {
        rawUsers = JSON.parse(content) as any[];
      } catch (parseError) {
        console.error(`Error parsing JSON from ${filePath}:`, parseError);
        console.error(`Content that failed to parse:`, content.substring(0, 100) + "...");
        throw new Error(
          `Invalid JSON in ${filePath}: ${parseError instanceof Error ? parseError.message : "Unknown error"}`
        );
      }

      // Convert date strings to Date objects
      const users = rawUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      })) as User[];

      // Update cache
      for (const user of users) {
        this.usersCache.set(user.username, {
          data: user,
          timestamp: Date.now(),
        });
      }

      return users;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return [];
      }
      throw err;
    }
  }

  /**
   * Write users to file
   */
  private async writeUsers(users: User[]): Promise<void> {
    const filePath = path.join(this.dbDir, "users.json");
    await fs.writeFile(filePath, JSON.stringify(users, null, 2));
    this.dirty.delete("users");
  }

  /**
   * Read sessions from file with caching
   */
  private async readSessions(): Promise<Session[]> {
    const filePath = path.join(this.dbDir, "sessions.json");
    try {
      const content = await fs.readFile(filePath, "utf-8");

      if (!content.trim()) {
        return []; // Return empty array if file is empty
      }

      let rawSessions: any[];
      try {
        rawSessions = JSON.parse(content) as any[];
      } catch (parseError) {
        console.error(`Error parsing JSON from ${filePath}:`, parseError);
        console.error(`Content that failed to parse:`, content.substring(0, 100) + "...");
        throw new Error(
          `Invalid JSON in ${filePath}: ${parseError instanceof Error ? parseError.message : "Unknown error"}`
        );
      }

      // Convert date strings to Date objects
      const sessions = rawSessions.map((s) => ({
        ...s,
        expiresAt: s.expiresAt ? new Date(s.expiresAt) : null,
        createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
      })) as Session[];

      // Update cache
      for (const session of sessions) {
        this.sessionsCache.set(session.token, {
          data: session,
          timestamp: Date.now(),
        });
      }

      return sessions;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return [];
      }
      throw err;
    }
  }

  /**
   * Write sessions to file
   */
  private async writeSessions(sessions: Session[]): Promise<void> {
    const filePath = path.join(this.dbDir, "sessions.json");
    await fs.writeFile(filePath, JSON.stringify(sessions, null, 2));
    this.dirty.delete("sessions");
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTTL;
  }

  /**
   * Trim cache if it exceeds max size (LRU eviction)
   */
  private trimCache<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size <= this.maxCacheSize) return;

    // Sort by timestamp and remove oldest entries
    const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, cache.size - this.maxCacheSize);

    for (const [key] of toRemove) {
      cache.delete(key);
    }
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  async getUserByUsername(username: string): Promise<User | null> {
    // Check cache first
    const cached = this.usersCache.get(username);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Read from file
    const users = await this.readUsers();
    const user = users.find((u) => u.username === username);

    if (user) {
      this.usersCache.set(username, { data: user, timestamp: Date.now() });
      this.trimCache(this.usersCache);
    }

    return user || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const users = await this.readUsers();
    return users.find((u) => u.id === id) || null;
  }

  async createUser(data: NewUser): Promise<User> {
    const users = await this.readUsers();

    // Check if user already exists
    if (users.some((u) => u.username === data.username)) {
      throw new Error(`User already exists: ${data.username}`);
    }

    const user: User = {
      id: crypto.randomUUID(),
      username: data.username,
      passwordHash: data.passwordHash || null,
      keyfilePath: data.keyfilePath || null,
      isAdmin: data.isAdmin || false,
      createdAt: new Date(),
    };

    users.push(user);
    await this.writeUsers(users);

    // Update cache
    this.usersCache.set(user.username, { data: user, timestamp: Date.now() });
    this.trimCache(this.usersCache);

    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const users = await this.readUsers();
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) {
      throw new Error(`User not found: ${id}`);
    }

    const updated = { ...users[index], ...data };
    users[index] = updated;

    await this.writeUsers(users);

    // Update cache
    this.usersCache.set(updated.username, { data: updated, timestamp: Date.now() });

    return updated;
  }

  async deleteUser(username: string): Promise<void> {
    const users = await this.readUsers();
    const filtered = users.filter((u) => u.username !== username);

    if (filtered.length === users.length) {
      throw new Error(`User not found: ${username}`);
    }

    await this.writeUsers(filtered);
    this.usersCache.delete(username);
  }

  async listUsers(): Promise<User[]> {
    return await this.readUsers();
  }

  // ============================================================================
  // Session Operations
  // ============================================================================

  async getSession(token: string): Promise<Session | null> {
    // Check cache first
    const cached = this.sessionsCache.get(token);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Read from file
    const sessions = await this.readSessions();
    const session = sessions.find((s) => s.token === token);

    if (session) {
      this.sessionsCache.set(token, { data: session, timestamp: Date.now() });
      this.trimCache(this.sessionsCache);
    }

    return session || null;
  }

  async createSession(data: NewSession): Promise<Session> {
    const sessions = await this.readSessions();

    const session: Session = {
      id: crypto.randomUUID(),
      userId: data.userId,
      token: data.token || crypto.randomUUID(),
      expiresAt: data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
    };

    sessions.push(session);
    await this.writeSessions(sessions);

    // Update cache
    this.sessionsCache.set(session.token, { data: session, timestamp: Date.now() });
    this.trimCache(this.sessionsCache);

    return session;
  }

  async deleteSession(token: string): Promise<void> {
    const sessions = await this.readSessions();
    const filtered = sessions.filter((s) => s.token !== token);

    await this.writeSessions(filtered);
    this.sessionsCache.delete(token);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    const sessions = await this.readSessions();
    const filtered = sessions.filter((s) => s.userId !== userId);

    await this.writeSessions(filtered);

    // Clear cache entries for deleted sessions
    for (const session of sessions) {
      if (session.userId === userId) {
        this.sessionsCache.delete(session.token);
      }
    }
  }

  async purgeExpiredSessions(): Promise<void> {
    const sessions = await this.readSessions();
    const now = new Date();
    const active = sessions.filter((s) => s.expiresAt && s.expiresAt > now);

    if (active.length !== sessions.length) {
      await this.writeSessions(active);

      // Clear cache for expired sessions
      const expired = sessions.filter((s) => !s.expiresAt || s.expiresAt <= now);
      for (const session of expired) {
        this.sessionsCache.delete(session.token);
      }
    }
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.usersCache.clear();
    this.sessionsCache.clear();
  }

  /**
   * Flush dirty data to disk
   */
  async flush(): Promise<void> {
    // Currently writes happen immediately, but this could be used
    // for batch writes if we implement delayed writes
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      users: {
        size: this.usersCache.size,
        maxSize: this.maxCacheSize,
      },
      sessions: {
        size: this.sessionsCache.size,
        maxSize: this.maxCacheSize,
      },
      ttl: this.cacheTTL,
    };
  }
}
