import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/server/auth/business-authorization", () => ({
  authorizeBusinessAccess: vi.fn()
}));

import { GET } from "@/app/api/businesses/[businessId]/route";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import { getSession } from "@/lib/server/auth/session";

const mockedAuthorizeBusinessAccess = vi.mocked(authorizeBusinessAccess);
const mockedGetSession = vi.mocked(getSession);

describe("/api/businesses/[businessId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns business details for an authorized member", async () => {
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
          created_at: new Date("2026-05-21T00:00:00.000Z"),
          updated_at: new Date("2026-05-21T00:00:00.000Z")
        },
        membership: {
          role: "owner_admin",
          status: "active"
        }
      }
    });

    const response = await GET(new Request("http://localhost/api/businesses/business-1"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "business-1",
      name: "ABC Landscaping",
      membership: {
        role: "owner_admin",
        status: "active"
      },
      drive_connected: false
    });
  });

  it("rejects unauthenticated business detail requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/businesses/business-1"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized"
    });
  });

  it("rejects access to businesses outside the user's membership scope", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedAuthorizeBusinessAccess.mockResolvedValue({
      allowed: false,
      details: null
    });

    const response = await GET(new Request("http://localhost/api/businesses/business-2"), {
      params: Promise.resolve({ businessId: "business-2" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden"
    });
  });
});
