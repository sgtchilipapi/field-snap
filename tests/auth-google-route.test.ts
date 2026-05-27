import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/auth/session", () => ({
  clearPostAuthRedirect: vi.fn(),
  createOAuthState: vi.fn(() => "state-123"),
  normalizeReturnPath: vi.fn((value: string | null) => value),
  setOAuthState: vi.fn(),
  setPostAuthRedirect: vi.fn()
}));

vi.mock("@/lib/server/integrations/google/oauth", () => ({
  buildGoogleAuthorizationUrl: vi.fn(() => "https://accounts.google.com/o/oauth2/v2/auth?state=state-123")
}));

vi.mock("@/lib/server/security/rate-limit", () => ({
  consumeRateLimit: vi.fn(() => ({
    allowed: true,
    remaining: 9,
    retryAfterSeconds: 300
  })),
  getClientAddress: vi.fn(() => "127.0.0.1")
}));

vi.mock("@/lib/server/logger", () => ({
  getRequestContext: vi.fn(() => ({ requestId: "req-1" })),
  logWarn: vi.fn()
}));

import { GET } from "@/app/auth/google/route";
import { buildGoogleAuthorizationUrl } from "@/lib/server/integrations/google/oauth";
import { consumeRateLimit } from "@/lib/server/security/rate-limit";

const mockedBuildGoogleAuthorizationUrl = vi.mocked(buildGoogleAuthorizationUrl);
const mockedConsumeRateLimit = vi.mocked(consumeRateLimit);

describe("/auth/google", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedBuildGoogleAuthorizationUrl.mockReturnValue(
      "https://accounts.google.com/o/oauth2/v2/auth?state=state-123"
    );
    mockedConsumeRateLimit.mockReturnValue({
      allowed: true,
      remaining: 9,
      retryAfterSeconds: 300
    });
  });

  it("starts Google login when under the rate limit", async () => {
    const response = await GET(new NextRequest("http://localhost/auth/google?next=/businesses"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?state=state-123"
    );
  });

  it("returns 429 when login initiation is rate limited", async () => {
    mockedConsumeRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 300
    });

    const response = await GET(new NextRequest("http://localhost/auth/google"));

    expect(response.status).toBe(429);
    expect(await response.text()).toBe("Too Many Requests");
  });
});
