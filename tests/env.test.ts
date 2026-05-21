import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/server/env";

const validEnv = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/field_snap",
  APP_BASE_URL: "http://localhost:3000",
  SESSION_SECRET: "12345678901234567890123456789012",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GEMINI_API_KEY: "gemini-key",
  QUEUE_REDIS_URL: "redis://localhost:6379",
  QUEUE_PREFIX: "field-snap"
};

describe("parseServerEnv", () => {
  it("accepts a complete configuration", () => {
    expect(parseServerEnv(validEnv)).toMatchObject(validEnv);
  });

  it("fails clearly when required keys are missing", () => {
    expect(() =>
      parseServerEnv({
        ...validEnv,
        GOOGLE_CLIENT_SECRET: ""
      })
    ).toThrow(/Invalid environment configuration/);
  });
});

