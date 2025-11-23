import { z } from "zod";

export const statusSchema = z.object({
  status: z.enum(["in_progress", "waiting", "done", "blocked", "idle"]).default("in_progress"),
  progress: z.number().min(0).max(1).optional(),
  focus: z.string().min(1).optional(),
  summary: z.string().optional(),
  issues: z.array(z.string()).optional(),
  meta: z.record(z.any()).optional(),
});

export type StatusPayload = z.infer<typeof statusSchema>;

export function parseStatusPayload(payload: unknown, opts?: { requireProgress?: boolean }): StatusPayload {
  const parsed = statusSchema.parse(payload);
  if (opts?.requireProgress && parsed.progress === undefined) {
    throw new Error("progress is required when JSON-before-stop is enabled");
  }
  return parsed;
}
