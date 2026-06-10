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
  updateJobStatusForBusiness: vi.fn()
}));

import { PATCH } from "@/app/api/businesses/[businessId]/jobs/[jobId]/status/route";
import { getSession } from "@/lib/server/auth/session";
import { JobServiceError, updateJobStatusForBusiness } from "@/lib/server/services/job-service";

const mockedGetSession = vi.mocked(getSession);
const mockedUpdateJobStatusForBusiness = vi.mocked(updateJobStatusForBusiness);

describe("/api/businesses/[businessId]/jobs/[jobId]/status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates a job status for an owner-admin", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedUpdateJobStatusForBusiness.mockResolvedValue({
      id: "job-1",
      status: "completed"
    } as never);

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
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

  it("rejects unauthenticated job status updates", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH" }), {
      params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
    });

    expect(response.status).toBe(401);
  });

  it("returns validation failures for invalid status payloads", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedUpdateJobStatusForBusiness.mockRejectedValue(
      new ZodError([
        {
          code: "custom",
          path: ["status"],
          message: "Invalid option: expected one of \"active\"|\"completed\"|\"archived\""
        }
      ])
    );

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: "pending" }),
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

  it("returns conflicts when reactivating would duplicate an active job", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedUpdateJobStatusForBusiness.mockRejectedValue(
      new JobServiceError(
        "An active job with the same client, job name, and date already exists.",
        "duplicate"
      )
    );

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
      }
    );

    expect(response.status).toBe(409);
  });
});
