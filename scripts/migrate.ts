import { logError } from "@/lib/server/logger";
import "./load-env";

async function main() {
  const [{ runMigrations }, { db }] = await Promise.all([
    import("@/lib/server/db/migrations"),
    import("@/lib/server/db/client")
  ]);

  try {
    await runMigrations();
    console.log("Database migrations completed.");
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((error) => {
  logError("Migration run failed", error);
  process.exitCode = 1;
});