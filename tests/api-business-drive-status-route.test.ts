import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/server/services/drive-service", () => ({
  getBusinessDriveStatusForUser: vi.fn()
}));

import { GET } from "@/app/api/businesses/[businessId]/drive/status/route";
import { getSession } from "@/lib/server/auth/session";
import { getBusinessDriveStatusForUser } from "@/lib/server/services/drive-service";

const mockedGetSession = vi.mocked(getSession);
const mockedGetBusinessDriveStatusForUser = vi.mocked(getBusinessDriveStatusForUser);

describe("/api/businesses/[businessId]/drive/status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns Drive status for a business member", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetBusinessDriveStatusForUser.mockResolvedValue({
      connected: true,
      googleAccountEmail: "owner@example.com",
      rootFolderId: "folder-123",
      driveOpenUrl: "https://drive.google.com/drive/folders/folder-123",
      connectionStatus: "active"
    });

    const response = await GET(new Request("http://localhost/api/businesses/business-1/drive/status"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      connected: true,
      google_account_email: "owner@example.com",
      root_folder_id: "folder-123"
    });
  });

  it("rejects unauthenticated requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/businesses/business-1/drive/status"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(401);
  });

  it("rejects users outside the business scope", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetBusinessDriveStatusForUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/businesses/business-2/drive/status"), {
      params: Promise.resolve({ businessId: "business-2" })
    });

    expect(response.status).toBe(403);
  });
});
