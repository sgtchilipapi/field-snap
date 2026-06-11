import postgres from "postgres";
import { databaseEnv } from "@/lib/server/env";

declare global {
  // eslint-disable-next-line no-var
  var __fylerrSqlClient: ReturnType<typeof postgres> | undefined;
}

export const db = globalThis.__fylerrSqlClient ??
  postgres(databaseEnv.DATABASE_URL, {
    max: 1,
    prepare: false
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__fylerrSqlClient = db;
}
