import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/server/services/drive-service", () => ({
  disconnectBusinessDrive: vi.fn()
}));

import { POST } from "@/app/api/businesses/[businessId]/drive/disconnect/route";
import { getSession } from "@/lib/server/auth/session";
import { disconnectBusinessDrive } from "@/lib/server/services/drive-service";

const mockedGetSession = vi.mocked(getSession);
const mockedDisconnectBusinessDrive = vi.mocked(disconnectBusinessDrive);

describe("/api/businesses/[businessId]/drive/disconnect", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("disconnects Drive for an owner-admin and redirects back to settings", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedDisconnectBusinessDrive.mockResolvedValue({
      disconnected: true,
      rootFolderId: "folder-123"
    });

    const response = await POST(
      new Request("http://localhost/api/businesses/business-1/drive/disconnect"),
      {
        params: Promise.resolve({ businessId: "business-1" })
      }
    );

    expect(mockedDisconnectBusinessDrive).toHaveBeenCalledWith({
      businessId: "business-1",
      disconnectedByUserId: "user-1"
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost/businesses/business-1/settings?drive=disconnected"
    );
  });

  it("rejects unauthenticated requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/businesses/business-1/drive/disconnect"),
      {
        params: Promise.resolve({ businessId: "business-1" })
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized"
    });
  });

  it("rejects non-owner requests", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-2", issuedAt: 1 });
    mockedDisconnectBusinessDrive.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/businesses/business-1/drive/disconnect"),
      {
        params: Promise.resolve({ businessId: "business-1" })
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden"
    });
  });
});
