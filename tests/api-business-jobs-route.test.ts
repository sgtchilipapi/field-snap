import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/server/services/job-service", () => ({
  JobServiceError: class extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
  createJobForBusiness: vi.fn(),
  listJobsForUser: vi.fn()
}));

import { GET, POST } from "@/app/api/businesses/[businessId]/jobs/route";
import { getSession } from "@/lib/server/auth/session";
import { createJobForBusiness, listJobsForUser } from "@/lib/server/services/job-service";

const mockedGetSession = vi.mocked(getSession);
const mockedCreateJobForBusiness = vi.mocked(createJobForBusiness);
const mockedListJobsForUser = vi.mocked(listJobsForUser);

describe("/api/businesses/[businessId]/jobs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists jobs for an authorized business member", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedListJobsForUser.mockResolvedValue({
      membership: {
        role: "reviewer",
        status: "active"
      },
      jobs: [
        {
          id: "job-1",
          client_name: "Smith Residence",
          job_name: "Backyard Cleanup"
        }
      ]
    } as never);

    const response = await GET(new Request("http://localhost/api/businesses/business-1/jobs"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      jobs: [
        {
          id: "job-1",
          client_name: "Smith Residence",
          job_name: "Backyard Cleanup"
        }
      ]
    });
    expect(mockedListJobsForUser).toHaveBeenCalledWith({
      businessId: "business-1",
      userId: "user-1",
      status: "active",
      categoryId: null,
      search: null
    });
  });

  it("passes status, category, and search filters through to the job service", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedListJobsForUser.mockResolvedValue({
      membership: {
        role: "field_user",
        status: "active"
      },
      jobs: []
    } as never);

    const response = await GET(
      new Request(
        "http://localhost/api/businesses/business-1/jobs?status=completed&category=11111111-1111-1111-8111-111111111111&search=smith"
      ),
      {
        params: Promise.resolve({ businessId: "business-1" })
      }
    );

    expect(response.status).toBe(200);
    expect(mockedListJobsForUser).toHaveBeenCalledWith({
      businessId: "business-1",
      userId: "user-1",
      status: "completed",
      categoryId: "11111111-1111-1111-8111-111111111111",
      search: "smith"
    });
  });

  it("rejects unauthenticated job list requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/businesses/business-1/jobs"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(401);
  });

  it("rejects invalid status filters", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });

    const response = await GET(
      new Request("http://localhost/api/businesses/business-1/jobs?status=pending"),
      {
        params: Promise.resolve({ businessId: "business-1" })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Status must be active, completed, archived, or all."
    });
  });

  it("rejects invalid category filters", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });

    const response = await GET(
      new Request("http://localhost/api/businesses/business-1/jobs?category=not-a-uuid"),
      {
        params: Promise.resolve({ businessId: "business-1" })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Category filter must be a UUID."
    });
  });

  it("creates a job for an owner-admin", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedCreateJobForBusiness.mockResolvedValue({
      job: {
        id: "job-1",
        drive_folder_id: "drive-folder-1"
      },
      folderName: "Smith Residence - Backyard Cleanup - 2026-05-25"
    } as never);

    const response = await POST(
      new Request("http://localhost/api/businesses/business-1/jobs", {
        method: "POST",
        body: JSON.stringify({
          category_id: "11111111-1111-1111-1111-111111111111",
          client_name: "Smith Residence",
          job_name: "Backyard Cleanup",
          job_date: "2026-05-25"
        }),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({ businessId: "business-1" })
      }
    );

    expect(response.status).toBe(201);
  });

  it("returns validation failures for invalid job payloads", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedCreateJobForBusiness.mockRejectedValue(
      new ZodError([
        {
          code: "too_small",
          minimum: 1,
          type: "string",
          inclusive: true,
          exact: false,
          message: "Client name is required.",
          path: ["client_name"]
        }
      ])
    );

    const response = await POST(
      new Request("http://localhost/api/businesses/business-1/jobs", {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({ businessId: "business-1" })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Client name is required."
    });
  });
});
