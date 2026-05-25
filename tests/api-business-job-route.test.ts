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
  getJobDetailsForUser: vi.fn(),
  updateJobForBusiness: vi.fn()
}));

import { GET, PATCH } from "@/app/api/businesses/[businessId]/jobs/[jobId]/route";
import { getSession } from "@/lib/server/auth/session";
import { getJobDetailsForUser, updateJobForBusiness } from "@/lib/server/services/job-service";

const mockedGetSession = vi.mocked(getSession);
const mockedGetJobDetailsForUser = vi.mocked(getJobDetailsForUser);
const mockedUpdateJobForBusiness = vi.mocked(updateJobForBusiness);

describe("/api/businesses/[businessId]/jobs/[jobId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns job details for an authorized member", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetJobDetailsForUser.mockResolvedValue({
      membership: { role: "reviewer", status: "active" },
      job: {
        id: "job-1",
        client_name: "Smith Residence"
      },
      folders: [{ id: "folder-1" }]
    } as never);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
    });

    expect(response.status).toBe(200);
  });

  it("rejects unauthenticated job detail requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
    });

    expect(response.status).toBe(401);
  });

  it("updates a job for an owner-admin", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedUpdateJobForBusiness.mockResolvedValue({
      id: "job-1",
      client_name: "Updated"
    } as never);

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          category_id: "11111111-1111-1111-1111-111111111111",
          client_name: "Updated",
          job_name: "Updated",
          job_date: "2026-05-26"
        }),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
      }
    );

    expect(response.status).toBe(200);
  });

  it("returns validation failures for invalid patch payloads", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedUpdateJobForBusiness.mockRejectedValue(
      new ZodError([
        {
          code: "custom",
          message: "Job date must use YYYY-MM-DD.",
          path: ["job_date"]
        }
      ])
    );

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
      }
    );

    expect(response.status).toBe(400);
  });
});
