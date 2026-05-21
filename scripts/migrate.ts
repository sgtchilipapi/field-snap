import { runMigrations } from "@/lib/server/db/migrations";
import { logError } from "@/lib/server/logger";

async function main() {
  await runMigrations();
  console.log("Database migrations completed.");
}

main().catch((error) => {
  logError("Migration run failed", error);
  process.exitCode = 1;
});

