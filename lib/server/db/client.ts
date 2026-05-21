import postgres from "postgres";
import { env } from "@/lib/server/env";

declare global {
  // eslint-disable-next-line no-var
  var __fieldSnapSqlClient: ReturnType<typeof postgres> | undefined;
}

export const db = globalThis.__fieldSnapSqlClient ??
  postgres(env.DATABASE_URL, {
    max: 1,
    prepare: false
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__fieldSnapSqlClient = db;
}
