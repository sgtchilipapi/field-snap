import { checkDatabaseConnectivity } from "@/lib/server/db/health";
import { logError } from "@/lib/server/logger";

export async function getHealthSnapshot() {
  const database = await checkDatabaseConnectivity();

  if (!database.ok) {
    logError("Health check failed", new Error(database.error));
  }

  return {
    ok: database.ok,
    service: "Field-Snap",
    database: database.ok ? "ok" : "error",
    timestamp: new Date().toISOString(),
    ...(database.ok ? {} : { error: database.error })
  };
}
