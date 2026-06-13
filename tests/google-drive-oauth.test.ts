import { describe, expect, it } from "vitest";
import { buildGoogleDriveAuthorizationUrl } from "@/lib/server/integrations/google/drive";

describe("buildGoogleDriveAuthorizationUrl", () => {
  it("hints the signed-in account without prompting account selection", () => {
    const url = new URL(
      buildGoogleDriveAuthorizationUrl({
        state: "state-123",
        loginHint: "owner@example.com"
      })
    );

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("login_hint")).toBe("owner@example.com");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("prompt")).not.toContain("select_account");
  });
});
