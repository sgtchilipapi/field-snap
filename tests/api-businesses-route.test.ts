import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/server/services/business-service", () => ({
  createBusiness: vi.fn(),
  listBusinessesForUser: vi.fn()
}));

import { GET, POST } from "@/app/api/businesses/route";
import { getSession } from "@/lib/server/auth/session";
import {
  createBusiness,
  listBusinessesForUser
} from "@/lib/server/services/business-service";

const mockedGetSession = vi.mocked(getSession);
const mockedCreateBusiness = vi.mocked(createBusiness);
const mockedListBusinessesForUser = vi.mocked(listBusinessesForUser);

describe("/api/businesses", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns businesses for the authenticated user", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedListBusinessesForUser.mockResolvedValue([
      {
        id: "business-1",
        name: "ABC Landscaping",
        role: "owner_admin",
        status: "active",
        driveConnected: false
      }
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      businesses: [
        {
          id: "business-1",
          name: "ABC Landscaping",
          role: "owner_admin",
          status: "active",
          driveConnected: false
        }
      ]
    });
  });

  it("rejects unauthenticated business list requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized"
    });
  });

  it("creates a business for the authenticated user", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedCreateBusiness.mockResolvedValue({
      id: "business-1",
      name: "ABC Landscaping",
      owner_user_id: "user-1",
      drive_root_folder_id: null,
      general_docs_folder_id: null,
      created_at: new Date("2026-05-21T00:00:00.000Z"),
      updated_at: new Date("2026-05-21T00:00:00.000Z")
    });

    const response = await POST(
      new Request("http://localhost/api/businesses", {
        method: "POST",
        body: JSON.stringify({ name: "ABC Landscaping" }),
        headers: {
          "content-type": "application/json"
        }
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      business_id: "business-1",
      name: "ABC Landscaping",
      drive_root_folder_id: null
    });
  });

  it("rejects unauthenticated business creation requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/businesses", {
        method: "POST",
        body: JSON.stringify({ name: "ABC Landscaping" }),
        headers: {
          "content-type": "application/json"
        }
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized"
    });
  });

  it("returns validation errors for invalid business payloads", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedCreateBusiness.mockRejectedValue(
      new ZodError([
        {
          code: "too_small",
          minimum: 1,
          type: "string",
          inclusive: true,
          exact: false,
          message: "Business name is required.",
          path: ["name"]
        }
      ])
    );

    const response = await POST(
      new Request("http://localhost/api/businesses", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
        headers: {
          "content-type": "application/json"
        }
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Business name is required."
    });
  });
});
