import { z } from "zod";
import path from "node:path";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().optional(),
  PROJECTS_ROOT: z
    .string()
    .default(path.join(process.cwd(), "data", "projects"))
    .transform((val) => path.resolve(val)),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv): Env {
  return envSchema.parse(source);
}
