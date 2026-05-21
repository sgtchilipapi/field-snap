import { describe, expect, it } from "vitest";
import { createSessionCookieValue, parseSessionCookie } from "@/lib/server/auth/session";

describe("session cookie signing", () => {
  const secret = "12345678901234567890123456789012";

  it("parses a valid signed session", () => {
    const value = createSessionCookieValue({ userId: "user-123", issuedAt: 123 }, secret);

    expect(parseSessionCookie(value, secret)).toEqual({
      userId: "user-123",
      issuedAt: 123
    });
  });

  it("rejects a tampered signed session", () => {
    const value = createSessionCookieValue({ userId: "user-123", issuedAt: 123 }, secret);
    const [payload] = value.split(".");
    const tampered = `${payload}.invalid`;

    expect(parseSessionCookie(tampered, secret)).toBeNull();
  });
});

