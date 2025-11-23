import crypto from "node:crypto";
import { eq, lt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@nexus/shared/db/schema";
import type { Session } from "../types";

export type Database = NodePgDatabase<typeof schema>;

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const PBKDF2_ITERATIONS = 120000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";

function mapSession(
  sessionRow: typeof schema.sessions.$inferSelect,
  userRow: typeof schema.users.$inferSelect,
): Session {
  return { token: sessionRow.token, userId: userRow.id, username: userRow.username };
}

function legacyHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashSecret(secret: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto
    .pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString("hex");
  return `pbkdf2_${PBKDF2_DIGEST}$${PBKDF2_ITERATIONS}$${salt}$${derived}`;
}

function verifySecret(secret: string, stored?: string | null) {
  if (!stored) return false;
  if (stored.startsWith("pbkdf2_")) {
    const [, iterations, salt, hash] = stored.split("$");
    if (!iterations || !salt || !hash) return false;
    const derived = crypto
      .pbkdf2Sync(secret, salt, Number(iterations), PBKDF2_KEYLEN, PBKDF2_DIGEST)
      .toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  }
  // Legacy sha256 support
  return legacyHash(secret) === stored;
}

export async function getUserByUsername(db: Database, username: string) {
  const [row] = await db.select().from(schema.users).where(eq(schema.users.username, username));
  return row ?? null;
}

export async function createUser(db: Database, username: string, password?: string) {
  const [row] = await db
    .insert(schema.users)
    .values({ username, passwordHash: password ? hashSecret(password) : undefined })
    .returning();
  return row;
}

export async function updateUserPassword(db: Database, userId: string, password: string) {
  await db
    .update(schema.users)
    .set({ passwordHash: hashSecret(password) })
    .where(eq(schema.users.id, userId));
}

export async function updateUserKeyfile(db: Database, userId: string, token: string) {
  await db.update(schema.users).set({ keyfilePath: hashSecret(token) }).where(eq(schema.users.id, userId));
}

export async function createSession(db: Database, userId: string) {
  const [row] = await db
    .insert(schema.sessions)
    .values({
      userId,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    })
    .returning();
  return row;
}

export async function deleteSession(db: Database, token: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
}

export async function purgeExpiredSessions(db: Database) {
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}

export async function getSessionWithUser(db: Database, token: string): Promise<Session | null> {
  const [row] = await db
    .select({
      session: schema.sessions,
      user: schema.users,
    })
    .from(schema.sessions)
    .leftJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.token, token));

  if (!row?.session || !row.user) return null;
  if (row.session.expiresAt && row.session.expiresAt.getTime() < Date.now()) {
    await deleteSession(db, token);
    return null;
  }
  return mapSession(row.session, row.user);
}

export function verifyPassword(password: string, passwordHash?: string | null) {
  if (!passwordHash) return true;
  return verifySecret(password, passwordHash);
}

export function verifyKeyfile(token: string, keyfileHash?: string | null) {
  if (!keyfileHash) return false;
  return verifySecret(token, keyfileHash);
}
