import "@testing-library/jest-dom/vitest";

process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/field_snap";
process.env.APP_BASE_URL ??= "http://localhost:3000";
process.env.SESSION_SECRET ??= "12345678901234567890123456789012";
process.env.GOOGLE_CLIENT_ID ??= "test-client";
process.env.GOOGLE_CLIENT_SECRET ??= "test-secret";
process.env.GEMINI_API_KEY ??= "test-gemini";
process.env.QUEUE_REDIS_URL ??= "redis://localhost:6379";
process.env.QUEUE_PREFIX ??= "field-snap";
