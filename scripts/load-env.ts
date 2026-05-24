import fs from "node:fs";
import path from "node:path";

function parseEnvFile(contents: string) {
  const entries: Record<string, string> = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

export function loadScriptEnv(rootDir: string = process.cwd()) {
  const mergedEntries: Record<string, string> = {};

  for (const fileName of [".env", ".env.local"]) {
    const filePath = path.join(rootDir, fileName);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    Object.assign(mergedEntries, parseEnvFile(fs.readFileSync(filePath, "utf8")));
  }

  for (const [key, value] of Object.entries(mergedEntries)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadScriptEnv();
