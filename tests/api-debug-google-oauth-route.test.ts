import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/server/data/users", () => ({
  findUserById: vi.fn()
}));

vi.mock("@/lib/server/integrations/google/oauth", () => ({
  buildGoogleAuthorizationUrl: vi.fn()
}));

vi.mock("@/lib/server/integrations/google/drive", () => ({
  buildGoogleDriveAuthorizationUrl: vi.fn(),
  getGoogleDriveCallbackUrl: vi.fn()
}));

import { GET } from "@/app/api/debug/google-oauth/route";
import { getSession } from "@/lib/server/auth/session";
import { findUserById } from "@/lib/server/data/users";
import { buildGoogleAuthorizationUrl } from "@/lib/server/integrations/google/oauth";
import {
  buildGoogleDriveAuthorizationUrl,
  getGoogleDriveCallbackUrl
} from "@/lib/server/integrations/google/drive";

const mockedGetSession = vi.mocked(getSession);
const mockedFindUserById = vi.mocked(findUserById);
const mockedBuildGoogleAuthorizationUrl = vi.mocked(buildGoogleAuthorizationUrl);
const mockedBuildGoogleDriveAuthorizationUrl = vi.mocked(buildGoogleDriveAuthorizationUrl);
const mockedGetGoogleDriveCallbackUrl = vi.mocked(getGoogleDriveCallbackUrl);

describe("/api/debug/google-oauth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the active OAuth client and redirect URIs for an authenticated user", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedFindUserById.mockResolvedValue({
      id: "user-1",
      google_sub: "google-sub-1",
      email: "owner@example.com",
      name: "Owner",
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date()
    });
    mockedBuildGoogleAuthorizationUrl.mockReturnValue(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=client-id&redirect_uri=https%3A%2F%2Ffs.celeris.pro%2Fauth%2Fgoogle%2Fcallback&scope=openid%20email%20profile&access_type=offline&prompt=select_account&state=debug-login-state"
    );
    mockedBuildGoogleDriveAuthorizationUrl.mockReturnValue(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=client-id&redirect_uri=https%3A%2F%2Ffs.celeris.pro%2Fauth%2Fgoogle%2Fdrive%2Fcallback&scope=openid%20email%20profile%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file&access_type=offline&prompt=consent&login_hint=owner%40example.com&state=debug-drive-state"
    );
    mockedGetGoogleDriveCallbackUrl.mockReturnValue(
      "https://fs.celeris.pro/auth/google/drive/callback"
    );

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      active_google_client_id: expect.any(String),
      login_oauth: {
        client_id: "client-id",
        redirect_uri: "https://fs.celeris.pro/auth/google/callback"
      },
      drive_oauth: {
        client_id: "client-id",
        redirect_uri: "https://fs.celeris.pro/auth/google/drive/callback",
        callback_url: "https://fs.celeris.pro/auth/google/drive/callback"
      }
    });
  });

  it("rejects unauthenticated requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized"
    });
  });

  it("returns a 500 when OAuth config inspection fails", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedFindUserById.mockResolvedValue({
      id: "user-1",
      google_sub: "google-sub-1",
      email: "owner@example.com",
      name: "Owner",
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date()
    });
    mockedBuildGoogleAuthorizationUrl.mockImplementation(() => {
      throw new Error("bad oauth config");
    });

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "bad oauth config"
    });
  });
});
