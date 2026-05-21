import { db } from "@/lib/server/db/client";

export type DatabaseChecker = () => Promise<void>;

export async function defaultDatabaseCheck() {
  await db`select 1`;
}

export async function checkDatabaseConnectivity(check: DatabaseChecker = defaultDatabaseCheck) {
  try {
    await check();

    return {
      ok: true as const
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unknown database error"
    };
  }
}
