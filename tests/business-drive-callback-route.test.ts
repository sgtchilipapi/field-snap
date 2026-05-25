import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/auth/session", () => ({
  clearDriveOAuthState: vi.fn(),
  getDriveOAuthState: vi.fn(),
  getSession: vi.fn()
}));

vi.mock("@/lib/server/services/drive-service", () => ({
  connectBusinessDriveFromCode: vi.fn()
}));

vi.mock("@/lib/server/services/folder-template-service", () => ({
  ensureBusinessFolderTemplate: vi.fn()
}));

vi.mock("@/lib/server/logger", () => ({
  logError: vi.fn()
}));

import { GET } from "@/app/auth/google/drive/callback/route";
import {
  clearDriveOAuthState,
  getDriveOAuthState,
  getSession
} from "@/lib/server/auth/session";
import { connectBusinessDriveFromCode } from "@/lib/server/services/drive-service";
import { ensureBusinessFolderTemplate } from "@/lib/server/services/folder-template-service";

const mockedClearDriveOAuthState = vi.mocked(clearDriveOAuthState);
const mockedGetDriveOAuthState = vi.mocked(getDriveOAuthState);
const mockedGetSession = vi.mocked(getSession);
const mockedConnectBusinessDriveFromCode = vi.mocked(connectBusinessDriveFromCode);
const mockedEnsureBusinessFolderTemplate = vi.mocked(ensureBusinessFolderTemplate);

describe("/auth/google/drive/callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("completes the Drive callback for the matching owner session", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetDriveOAuthState.mockResolvedValue({
      businessId: "business-1",
      nonce: "nonce-123",
      userId: "user-1"
    });
    mockedConnectBusinessDriveFromCode.mockResolvedValue({
      rootFolderId: "folder-123",
      googleAccountEmail: "owner@example.com"
    });

    const response = await GET(
      new NextRequest("http://localhost/auth/google/drive/callback?code=abc123&state=nonce-123")
    );

    expect(mockedConnectBusinessDriveFromCode).toHaveBeenCalledWith({
      businessId: "business-1",
      connectedByUserId: "user-1",
      code: "abc123"
    });
    expect(mockedEnsureBusinessFolderTemplate).toHaveBeenCalledWith("business-1");
    expect(mockedClearDriveOAuthState).toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/businesses/business-1/settings?drive=connected");
  });

  it("rejects callback state mismatches", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetDriveOAuthState.mockResolvedValue({
      businessId: "business-1",
      nonce: "different",
      userId: "user-1"
    });

    const response = await GET(
      new NextRequest("http://localhost/auth/google/drive/callback?code=abc123&state=nonce-123")
    );

    expect(mockedConnectBusinessDriveFromCode).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain(
      "/businesses/business-1/settings?drive_error=callback_failed"
    );
  });
});
