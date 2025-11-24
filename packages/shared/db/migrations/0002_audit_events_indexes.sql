CREATE INDEX IF NOT EXISTS "audit_events_project_id_idx" ON "audit_events" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_event_type_idx" ON "audit_events" ("event_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_created_at_idx" ON "audit_events" ("created_at");
