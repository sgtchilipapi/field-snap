import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/server/services/business-service", () => ({
  getBusinessOwnerDetailsForUser: vi.fn()
}));

vi.mock("@/lib/server/services/folder-template-service", () => ({
  ensureBusinessFolderTemplate: vi.fn()
}));

import { POST } from "@/app/api/businesses/[businessId]/drive/repair/route";
import { getSession } from "@/lib/server/auth/session";
import { getBusinessOwnerDetailsForUser } from "@/lib/server/services/business-service";
import { ensureBusinessFolderTemplate } from "@/lib/server/services/folder-template-service";

const mockedGetSession = vi.mocked(getSession);
const mockedGetBusinessOwnerDetailsForUser = vi.mocked(getBusinessOwnerDetailsForUser);
const mockedEnsureBusinessFolderTemplate = vi.mocked(ensureBusinessFolderTemplate);

describe("/api/businesses/[businessId]/drive/repair", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("repairs the folder template for an owner-admin", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetBusinessOwnerDetailsForUser.mockResolvedValue({
      business: {
        id: "business-1",
        name: "ABC Landscaping",
        owner_user_id: "user-1",
        drive_root_folder_id: "root-1",
        general_docs_folder_id: "general-1",
        created_at: new Date(),
        updated_at: new Date()
      },
      membership: {
        role: "owner_admin",
        status: "active"
      }
    });

    const response = await POST(new Request("http://localhost/api/businesses/business-1/drive/repair"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(mockedEnsureBusinessFolderTemplate).toHaveBeenCalledWith("business-1");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/businesses/business-1/settings?folders=repaired"
    );
  });

  it("rejects unauthenticated repair requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/businesses/business-1/drive/repair"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized"
    });
  });

  it("rejects non-owner repair requests", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-2", issuedAt: 1 });
    mockedGetBusinessOwnerDetailsForUser.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/businesses/business-1/drive/repair"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden"
    });
  });

  it("redirects back with an error when folder repair fails", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetBusinessOwnerDetailsForUser.mockResolvedValue({
      business: {
        id: "business-1",
        name: "ABC Landscaping",
        owner_user_id: "user-1",
        drive_root_folder_id: "root-1",
        general_docs_folder_id: "general-1",
        created_at: new Date(),
        updated_at: new Date()
      },
      membership: {
        role: "owner_admin",
        status: "active"
      }
    });
    mockedEnsureBusinessFolderTemplate.mockRejectedValue(new Error("boom"));

    const response = await POST(new Request("http://localhost/api/businesses/business-1/drive/repair"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/businesses/business-1/settings?folders_error=repair_failed"
    );
  });
});
