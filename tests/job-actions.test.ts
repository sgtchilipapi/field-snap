import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock
}));

vi.mock("@/lib/server/auth/session", () => ({
  requireSession: vi.fn()
}));

vi.mock("@/lib/server/auth/business-authorization", () => ({
  authorizeBusinessAccess: vi.fn()
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
  updateJobStatusForBusiness: vi.fn()
}));

import { submitNewJob } from "@/app/(app)/businesses/[businessId]/jobs/actions";
import { changeJobStatusAction } from "@/app/(app)/businesses/[businessId]/jobs/[jobId]/actions";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { createJobForBusiness, updateJobStatusForBusiness } from "@/lib/server/services/job-service";

const mockedAuthorizeBusinessAccess = vi.mocked(authorizeBusinessAccess);
const mockedRequireSession = vi.mocked(requireSession);
const mockedCreateJobForBusiness = vi.mocked(createJobForBusiness);
const mockedUpdateJobStatusForBusiness = vi.mocked(updateJobStatusForBusiness);

describe("submitNewJob", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedAuthorizeBusinessAccess.mockResolvedValue({
      allowed: true,
      details: {
        business: {
          id: "business-1",
          name: "ABC Landscaping"
        },
        membership: {
          role: "owner_admin",
          status: "active"
        }
      }
    } as never);
    mockedRequireSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
  });

  it("redirects to the new job detail page after successful creation", async () => {
    mockedCreateJobForBusiness.mockResolvedValue({
      job: {
        id: "job-123"
      }
    } as never);

    const formData = new FormData();
    formData.set("category_id", "11111111-1111-1111-8111-111111111111");
    formData.set("client_name", "Smith Residence");
    formData.set("job_name", "Backyard Cleanup");
    formData.set("job_date", "2026-05-25");

    await submitNewJob("business-1", { error: null }, formData);

    expect(redirectMock).toHaveBeenCalledWith("/businesses/business-1/jobs/job-123");
  });

  it("returns validation errors instead of redirecting", async () => {
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

    const state = await submitNewJob("business-1", { error: null }, new FormData());

    expect(state).toEqual({
      error: "Client name is required."
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("changeJobStatusAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedAuthorizeBusinessAccess.mockResolvedValue({
      allowed: true,
      details: {
        business: {
          id: "business-1",
          name: "ABC Landscaping"
        },
        membership: {
          role: "owner_admin",
          status: "active"
        }
      }
    } as never);
    mockedRequireSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
  });

  it("updates the job status and redirects back to the detail page", async () => {
    mockedUpdateJobStatusForBusiness.mockResolvedValue({
      id: "job-1",
      status: "completed"
    } as never);

    const formData = new FormData();
    formData.set("status", "completed");

    await changeJobStatusAction("business-1", "job-1", formData);

    expect(mockedUpdateJobStatusForBusiness).toHaveBeenCalledWith({
      businessId: "business-1",
      jobId: "job-1",
      userId: "user-1",
      status: "completed"
    });
    expect(redirectMock).toHaveBeenCalledWith("/businesses/business-1/jobs/job-1");
  });

  it("redirects with an error when the submitted status is invalid", async () => {
    const formData = new FormData();
    formData.set("status", "pending");

    await changeJobStatusAction("business-1", "job-1", formData);

    expect(mockedUpdateJobStatusForBusiness).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/businesses/business-1/jobs/job-1?statusError=invalid");
  });
});
