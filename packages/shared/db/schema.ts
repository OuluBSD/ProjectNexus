// Drizzle ORM style schema definition for Project Nexus (Postgres)
// This file is a draft; adjust types/enums as implementation evolves.
import {
  pgTable,
  serial,
  text,
  varchar,
  uuid,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  index,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  theme: jsonb("theme"), // arbitrary theme overrides
  status: varchar("status", { length: 32 }).default("active"),
  contentPath: text("content_path"),
  gitUrl: text("git_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const roadmapLists = pgTable("roadmap_lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  tags: varchar("tags", { length: 256 }), // comma-separated; normalize later
  progress: numeric("progress", { precision: 5, scale: 2 }).default("0"),
  status: varchar("status", { length: 32 }).default("in_progress"),
  metaChatId: uuid("meta_chat_id"), // set after meta-chat creation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 128 }).notNull(),
  goal: text("goal"),
  systemPrompt: text("system_prompt"),
  starterMessages: jsonb("starter_messages"), // [{role, content}]
  javascriptPrompt: text("javascript_prompt"),
  javascriptLogic: text("javascript_logic"),
  metadata: jsonb("metadata"),
  jsonRequired: boolean("json_required").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chats = pgTable("chats", {
  id: uuid("id").defaultRandom().primaryKey(),
  roadmapListId: uuid("roadmap_list_id")
    .references(() => roadmapLists.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  goal: text("goal"),
  templateId: uuid("template_id").references(() => templates.id),
  status: varchar("status", { length: 32 }).default("in_progress"),
  progress: numeric("progress", { precision: 5, scale: 2 }).default("0"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const metaChats = pgTable("meta_chats", {
  id: uuid("id").defaultRandom().primaryKey(),
  roadmapListId: uuid("roadmap_list_id")
    .references(() => roadmapLists.id, { onDelete: "cascade" })
    .notNull(),
  status: varchar("status", { length: 32 }).default("in_progress"),
  progress: numeric("progress", { precision: 5, scale: 2 }).default("0"),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: uuid("chat_id")
    .references(() => chats.id, { onDelete: "cascade" })
    .notNull(),
  role: varchar("role", { length: 16 }).notNull(), // user | assistant | system | status | meta
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const metaChatMessages = pgTable("meta_chat_messages", {
  id: serial("id").primaryKey(),
  metaChatId: uuid("meta_chat_id")
    .references(() => metaChats.id, { onDelete: "cascade" })
    .notNull(),
  role: varchar("role", { length: 16 }).notNull(), // user | assistant | system | status
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const snapshots = pgTable("snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  gitSha: varchar("git_sha", { length: 64 }).notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  keyfilePath: text("keyfile_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    path: text("path"),
    sessionId: varchar("session_id", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    auditProjectIdIdx: index("audit_events_project_id_idx").on(table.projectId),
    auditEventTypeIdx: index("audit_events_event_type_idx").on(table.eventType),
    auditIpIdx: index("audit_events_ip_idx").on(table.ipAddress),
    auditCreatedAtIdx: index("audit_events_created_at_idx").on(table.createdAt),
  })
);

// Server management tables for multi-server architecture
export const servers = pgTable("servers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(), // "worker" | "manager" | "ai"
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  status: varchar("status", { length: 32 }).default("offline"), // "online" | "offline" | "degraded"
  metadata: jsonb("metadata"), // Additional server config, capabilities, etc.
  lastHealthCheck: timestamp("last_health_check"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatAssignments = pgTable("chat_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatId: uuid("chat_id")
    .references(() => chats.id, { onDelete: "cascade" })
    .notNull(),
  serverId: uuid("server_id")
    .references(() => servers.id, { onDelete: "cascade" })
    .notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const projectWorkspaces = pgTable("project_workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  serverId: uuid("server_id")
    .references(() => servers.id, { onDelete: "cascade" })
    .notNull(),
  workspacePath: text("workspace_path").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
