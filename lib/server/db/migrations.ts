import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "@/lib/server/db/client";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../db/migrations"
);

type MigrationFile = {
  name: string;
  sql: string;
};

async function ensureMigrationTable() {
  await db`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `;
}

async function listMigrationFiles(): Promise<MigrationFile[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  const files = entries.filter((entry) => entry.endsWith(".sql")).sort();

  return Promise.all(
    files.map(async (name) => ({
      name,
      sql: await fs.readFile(path.join(MIGRATIONS_DIR, name), "utf8")
    }))
  );
}

export async function runMigrations() {
  await ensureMigrationTable();

  const appliedRows = await db<{ id: string }[]>`select id from schema_migrations`;
  const applied = new Set(appliedRows.map((row) => row.id));
  const files = await listMigrationFiles();

  for (const file of files) {
    if (applied.has(file.name)) {
      continue;
    }

    await db.begin(async (tx) => {
      await tx.unsafe(file.sql);
      await tx`insert into schema_migrations (id) values (${file.name})`;
    });
  }
}
