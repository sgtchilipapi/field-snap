import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  APP_BASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters long."),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  QUEUE_REDIS_URL: z.string().url(),
  QUEUE_PREFIX: z.string().min(1)
});

export type ServerEnv = z.infer<typeof envSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = envSchema.safeParse(source);

  if (parsed.success) {
    return parsed.data;
  }

  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parseServerEnv(process.env);
