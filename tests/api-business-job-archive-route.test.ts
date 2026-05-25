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
  archiveJobForBusiness: vi.fn()
}));

import { POST } from "@/app/api/businesses/[businessId]/jobs/[jobId]/archive/route";
import { getSession } from "@/lib/server/auth/session";
import { JobServiceError, archiveJobForBusiness } from "@/lib/server/services/job-service";

const mockedGetSession = vi.mocked(getSession);
const mockedArchiveJobForBusiness = vi.mocked(archiveJobForBusiness);

describe("/api/businesses/[businessId]/jobs/[jobId]/archive", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("archives a job for an owner-admin", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedArchiveJobForBusiness.mockResolvedValue({
      id: "job-1",
      status: "archived"
    } as never);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
    });

    expect(response.status).toBe(200);
  });

  it("rejects unauthenticated archive requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
    });

    expect(response.status).toBe(401);
  });

  it("returns not found when the job does not exist", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedArchiveJobForBusiness.mockRejectedValue(new JobServiceError("Job not found.", "not_found"));

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
    });

    expect(response.status).toBe(404);
  });
});
