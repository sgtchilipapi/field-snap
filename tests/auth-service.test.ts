import { describe, expect, it } from "vitest";
import { AuthFlowError } from "@/lib/server/auth/errors";
import { buildGoogleAuthorizationUrl } from "@/lib/server/integrations/google/oauth";
import {
  getPostLoginRedirect,
  loginOrCreateUserFromGoogle,
} from "@/lib/server/services/auth-service";

describe("buildGoogleAuthorizationUrl", () => {
  it("includes the expected Google OAuth parameters", () => {
    const url = new URL(buildGoogleAuthorizationUrl("state-123"));

    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
  });
});

describe("getPostLoginRedirect", () => {
  it("routes first-time users to business creation", () => {
    expect(getPostLoginRedirect(0)).toBe("/businesses/new");
  });

  it("routes returning members to the business index when no recent business exists", () => {
    expect(getPostLoginRedirect(2)).toBe("/businesses");
  });

  it("routes returning members to the most recent business landing path", () => {
    expect(getPostLoginRedirect(2, "/businesses/business-1/jobs")).toBe(
      "/businesses/business-1/jobs",
    );
  });
});

describe("loginOrCreateUserFromGoogle", () => {
  it("rejects unverified Google emails", async () => {
    await expect(
      loginOrCreateUserFromGoogle({
        sub: "google-sub",
        email: "user@example.com",
        emailVerified: false,
        name: "User Name",
        avatarUrl: null,
      }),
    ).rejects.toBeInstanceOf(AuthFlowError);
  });
});
