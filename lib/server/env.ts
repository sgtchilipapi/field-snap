import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url()
});

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  APP_BASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters long."),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  DRIVE_TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(32, "DRIVE_TOKEN_ENCRYPTION_KEY must be at least 32 characters long."),
  GEMINI_API_KEY: z.string().min(1),
  QUEUE_REDIS_URL: z.string().url(),
  QUEUE_PREFIX: z.string().min(1)
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type ServerEnv = z.infer<typeof envSchema>;

function toValidationErrorMessage(
  parsed: z.SafeParseError<Record<string, string | undefined>>
) {
  return parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}

export function parseDatabaseEnv(source: Record<string, string | undefined>): DatabaseEnv {
  const parsed = databaseEnvSchema.safeParse(source);

  if (parsed.success) {
    return parsed.data;
  }

  throw new Error(`Invalid environment configuration: ${toValidationErrorMessage(parsed)}`);
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = envSchema.safeParse({
    ...source,
    DRIVE_TOKEN_ENCRYPTION_KEY: source.DRIVE_TOKEN_ENCRYPTION_KEY ?? source.SESSION_SECRET
  });

  if (parsed.success) {
    return parsed.data;
  }

  throw new Error(`Invalid environment configuration: ${toValidationErrorMessage(parsed)}`);
}

export const databaseEnv = parseDatabaseEnv(process.env);
export const env = parseServerEnv(process.env);
