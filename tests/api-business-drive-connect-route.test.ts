import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  createOAuthState: vi.fn(),
  getSession: vi.fn(),
  setDriveOAuthState: vi.fn()
}));

vi.mock("@/lib/server/auth/business-authorization", () => ({
  authorizeBusinessAccess: vi.fn()
}));

vi.mock("@/lib/server/integrations/google/drive", () => ({
  buildGoogleDriveAuthorizationUrl: vi.fn()
}));

import { POST } from "@/app/api/businesses/[businessId]/drive/connect/route";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import {
  createOAuthState,
  getSession,
  setDriveOAuthState
} from "@/lib/server/auth/session";
import { buildGoogleDriveAuthorizationUrl } from "@/lib/server/integrations/google/drive";

const mockedAuthorizeBusinessAccess = vi.mocked(authorizeBusinessAccess);
const mockedCreateOAuthState = vi.mocked(createOAuthState);
const mockedGetSession = vi.mocked(getSession);
const mockedSetDriveOAuthState = vi.mocked(setDriveOAuthState);
const mockedBuildGoogleDriveAuthorizationUrl = vi.mocked(buildGoogleDriveAuthorizationUrl);

describe("/api/businesses/[businessId]/drive/connect", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("starts Drive OAuth for an owner-admin", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedAuthorizeBusinessAccess.mockResolvedValue({
      allowed: true,
      details: {
        business: {
          id: "business-1",
          name: "ABC Landscaping",
          owner_user_id: "user-1",
          drive_root_folder_id: null,
          general_docs_folder_id: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        membership: {
          role: "owner_admin",
          status: "active"
        }
      }
    });
    mockedCreateOAuthState.mockReturnValue("nonce-123");
    mockedBuildGoogleDriveAuthorizationUrl.mockReturnValue(
      "https://accounts.google.com/o/oauth2/v2/auth?state=nonce-123"
    );

    const response = await POST(new Request("http://localhost/api/businesses/business-1/drive/connect"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(mockedSetDriveOAuthState).toHaveBeenCalledWith({
      businessId: "business-1",
      nonce: "nonce-123",
      userId: "user-1"
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?state=nonce-123"
    );
  });

  it("rejects unauthenticated requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/businesses/business-1/drive/connect"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized"
    });
  });

  it("rejects non-owner requests", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-2", issuedAt: 1 });
    mockedAuthorizeBusinessAccess.mockResolvedValue({
      allowed: false,
      details: null
    });

    const response = await POST(new Request("http://localhost/api/businesses/business-1/drive/connect"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden"
    });
  });
});
