import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/data/categories", () => ({
  findCategoryForBusinessByName: vi.fn(),
  findCategoryForBusinessBySlug: vi.fn(),
  getCategoriesForBusiness: vi.fn(),
  getCategoryForBusiness: vi.fn(),
  upsertCategory: vi.fn(),
}));

vi.mock("@/lib/server/audit/logs", () => ({
  AUDIT_ACTIONS: {
    jobCreated: "job.created",
  },
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/lib/server/data/drive-connections", () => ({
  getDriveConnectionForBusiness: vi.fn(),
}));

vi.mock("@/lib/server/data/job-folders", () => ({
  createJobFolder: vi.fn(),
  listJobFolders: vi.fn(),
}));

vi.mock("@/lib/server/data/document-processing-jobs", () => ({
  enqueueDocumentProcessingJob: vi.fn(),
}));

vi.mock("@/lib/server/data/documents", () => ({
  getDocumentForBusiness: vi.fn(),
  listDocumentsForJob: vi.fn(),
  updateDocumentProcessingState: vi.fn(),
}));

vi.mock("@/lib/server/data/jobs", () => ({
  archiveJob: vi.fn(),
  createJob: vi.fn(),
  findActiveDuplicateJob: vi.fn(),
  getJobForBusiness: vi.fn(),
  listJobsForBusiness: vi.fn(),
  markJobOpenedForUser: vi.fn(),
  updateJob: vi.fn(),
  updateJobStatus: vi.fn(),
}));

vi.mock("@/lib/server/auth/business-authorization", () => ({
  authorizeBusinessAccess: vi.fn(),
}));

vi.mock("@/lib/server/security/encryption", () => ({
  decryptSecret: vi.fn(),
}));

vi.mock("@/lib/server/integrations/google/drive", () => ({
  createGoogleDriveFolderInParent: vi.fn(),
}));

vi.mock("@/lib/server/services/drive-connection-health", () => ({
  markDriveConnectionIssue: vi.fn(),
}));

import {
  findCategoryForBusinessByName,
  findCategoryForBusinessBySlug,
  getCategoryForBusiness,
  upsertCategory,
} from "@/lib/server/data/categories";
import { recordAuditEvent } from "@/lib/server/audit/logs";
import { getDriveConnectionForBusiness } from "@/lib/server/data/drive-connections";
import { listDocumentsForJob } from "@/lib/server/data/documents";
import { createJobFolder } from "@/lib/server/data/job-folders";
import {
  archiveJob,
  createJob,
  findActiveDuplicateJob,
  getJobForBusiness,
  listJobsForBusiness,
  markJobOpenedForUser,
  updateJob,
  updateJobStatus,
} from "@/lib/server/data/jobs";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import { createGoogleDriveFolderInParent } from "@/lib/server/integrations/google/drive";
import { decryptSecret } from "@/lib/server/security/encryption";
import { markDriveConnectionIssue } from "@/lib/server/services/drive-connection-health";
import {
  JobServiceError,
  createJobForBusiness,
  getJobDetailsForUser,
  listJobsForUser,
  updateJobForBusiness,
  updateJobStatusForBusiness,
} from "@/lib/server/services/job-service";

const mockedFindCategoryForBusinessByName = vi.mocked(
  findCategoryForBusinessByName,
);
const mockedRecordAuditEvent = vi.mocked(recordAuditEvent);
const mockedFindCategoryForBusinessBySlug = vi.mocked(
  findCategoryForBusinessBySlug,
);
const mockedGetCategoryForBusiness = vi.mocked(getCategoryForBusiness);
const mockedUpsertCategory = vi.mocked(upsertCategory);
const mockedGetDriveConnectionForBusiness = vi.mocked(
  getDriveConnectionForBusiness,
);
const mockedListDocumentsForJob = vi.mocked(listDocumentsForJob);
const mockedCreateJobFolder = vi.mocked(createJobFolder);
const mockedArchiveJob = vi.mocked(archiveJob);
const mockedCreateJob = vi.mocked(createJob);
const mockedFindActiveDuplicateJob = vi.mocked(findActiveDuplicateJob);
const mockedGetJobForBusiness = vi.mocked(getJobForBusiness);
const mockedListJobsForBusiness = vi.mocked(listJobsForBusiness);
const mockedMarkJobOpenedForUser = vi.mocked(markJobOpenedForUser);
const mockedUpdateJob = vi.mocked(updateJob);
const mockedUpdateJobStatus = vi.mocked(updateJobStatus);
const mockedAuthorizeBusinessAccess = vi.mocked(authorizeBusinessAccess);
const mockedCreateGoogleDriveFolderInParent = vi.mocked(
  createGoogleDriveFolderInParent,
);
const mockedDecryptSecret = vi.mocked(decryptSecret);
const mockedMarkDriveConnectionIssue = vi.mocked(markDriveConnectionIssue);
const categoryId = "11111111-1111-1111-8111-111111111111";

describe("job-service", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedListDocumentsForJob.mockResolvedValue([]);

    mockedAuthorizeBusinessAccess.mockResolvedValue({
      allowed: true,
      details: {
        business: {
          id: "business-1",
          name: "ABC Landscaping",
          owner_user_id: "user-1",
          drive_root_folder_id: "root-1",
          general_docs_folder_id: "general-1",
          created_at: new Date(),
          updated_at: new Date(),
        },
        membership: {
          role: "owner_admin",
          status: "active",
        },
      },
    });
    mockedGetDriveConnectionForBusiness.mockResolvedValue({
      id: "connection-1",
      business_id: "business-1",
      connected_by_user_id: "user-1",
      google_account_email: "owner@example.com",
      access_token_encrypted: "encrypted-access",
      refresh_token_encrypted: "encrypted-refresh",
      scopes: ["scope"],
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockedDecryptSecret.mockReturnValue("access-token");
    mockedFindActiveDuplicateJob.mockResolvedValue(null as never);
    mockedFindCategoryForBusinessByName.mockResolvedValue(null);
    mockedFindCategoryForBusinessBySlug.mockResolvedValue(null);
    mockedGetCategoryForBusiness.mockResolvedValue({
      id: categoryId,
      business_id: "business-1",
      name: "Landscaping",
      slug: "landscaping",
      is_default: true,
      drive_folder_id: "category-folder-1",
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockedCreateGoogleDriveFolderInParent.mockImplementation(
      async (_token, name, parent) => ({
        id: `${parent ?? "root"}-${name}`,
        name,
      }),
    );
    mockedCreateJob.mockResolvedValue({
      id: "job-1",
      business_id: "business-1",
      category_id: categoryId,
      client_name: "Smith Residence",
      job_name: "Backyard Cleanup",
      address: "123 Main St",
      job_date: "2026-05-25",
      drive_folder_id:
        "category-folder-1-Smith Residence - Backyard Cleanup - 2026-05-25",
      in_process_folder_id: "job-folder-1",
      needs_review_folder_id: "job-folder-2",
      status: "active",
      created_by_user_id: "user-1",
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockedArchiveJob.mockResolvedValue({
      id: "job-1",
      business_id: "business-1",
      category_id: categoryId,
      client_name: "Smith Residence",
      job_name: "Backyard Cleanup",
      address: "123 Main St",
      job_date: "2026-05-25",
      drive_folder_id: "drive-folder-1",
      in_process_folder_id: "in-process-1",
      needs_review_folder_id: "needs-review-1",
      status: "archived",
      created_by_user_id: "user-1",
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockedCreateJobFolder.mockResolvedValue({
      id: "job-folder-row-1",
      job_id: "job-1",
      folder_key: "in_process",
      folder_name: "00 In-Process",
      drive_folder_id: "job-folder-1",
      created_at: new Date(),
    });
    mockedGetJobForBusiness.mockResolvedValue({
      id: "job-1",
      business_id: "business-1",
      category_id: categoryId,
      client_name: "Smith Residence",
      job_name: "Backyard Cleanup",
      address: "123 Main St",
      job_date: "2026-05-25",
      drive_folder_id: "drive-folder-1",
      in_process_folder_id: "in-process-1",
      needs_review_folder_id: "needs-review-1",
      status: "active",
      created_by_user_id: "user-1",
      created_at: new Date(),
      updated_at: new Date(),
      category_name: "Landscaping",
      category_slug: "landscaping",
      last_opened_at: null,
    });
    mockedUpdateJob.mockResolvedValue({
      id: "job-1",
      business_id: "business-1",
      category_id: categoryId,
      client_name: "Updated Client",
      job_name: "Updated Job",
      address: null,
      job_date: "2026-05-26",
      drive_folder_id: "drive-folder-1",
      in_process_folder_id: "in-process-1",
      needs_review_folder_id: "needs-review-1",
      status: "active",
      created_by_user_id: "user-1",
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockedUpdateJobStatus.mockResolvedValue({
      id: "job-1",
      business_id: "business-1",
      category_id: categoryId,
      client_name: "Smith Residence",
      job_name: "Backyard Cleanup",
      address: "123 Main St",
      job_date: "2026-05-25",
      drive_folder_id: "drive-folder-1",
      in_process_folder_id: "in-process-1",
      needs_review_folder_id: "needs-review-1",
      status: "completed",
      created_by_user_id: "user-1",
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  it("creates a job with the Drive folder tree and persisted subfolders", async () => {
    const result = await createJobForBusiness({
      businessId: "business-1",
      userId: "user-1",
      values: {
        category_id: categoryId,
        client_name: "Smith Residence",
        job_name: "Backyard Cleanup",
        address: "123 Main St",
        job_date: "2026-05-25",
      },
    });

    expect(result.folderName).toBe(
      "Smith Residence - Backyard Cleanup - 2026-05-25",
    );
    expect(mockedCreateGoogleDriveFolderInParent).toHaveBeenCalled();
    expect(mockedCreateJobFolder).toHaveBeenCalledTimes(10);
    expect(mockedRecordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "business-1",
        actorUserId: "user-1",
        entityType: "job",
        entityId: "job-1",
        action: "job.created",
      }),
    );
  });

  it("creates a custom category inline before creating the job", async () => {
    mockedUpsertCategory.mockResolvedValue({
      id: "category-2",
      business_id: "business-1",
      name: "Roofing",
      slug: "roofing",
      is_default: false,
      drive_folder_id: "root-1-Roofing",
      created_at: new Date(),
      updated_at: new Date(),
    });

    await createJobForBusiness({
      businessId: "business-1",
      userId: "user-1",
      values: {
        custom_category_name: "Roofing",
        client_name: "Smith Residence",
        job_name: "Roof Repair",
        job_date: "2026-05-25",
      },
    });

    expect(mockedUpsertCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "business-1",
        name: "Roofing",
        isDefault: false,
      }),
    );
  });

  it("rejects duplicate active jobs", async () => {
    mockedFindActiveDuplicateJob.mockResolvedValue("job-existing");

    await expect(
      createJobForBusiness({
        businessId: "business-1",
        userId: "user-1",
        values: {
          category_id: categoryId,
          client_name: "Smith Residence",
          job_name: "Backyard Cleanup",
          job_date: "2026-05-25",
        },
      }),
    ).rejects.toMatchObject({
      code: "duplicate",
    } satisfies Partial<JobServiceError>);
  });

  it("validates required and formatted job fields", async () => {
    await expect(
      createJobForBusiness({
        businessId: "business-1",
        userId: "user-1",
        values: {
          category_id: categoryId,
          client_name: "",
          job_name: "",
          job_date: "05/25/2026",
        },
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("marks the drive connection issue when folder creation fails", async () => {
    mockedCreateGoogleDriveFolderInParent.mockRejectedValue(
      new Error("drive failed"),
    );

    await expect(
      createJobForBusiness({
        businessId: "business-1",
        userId: "user-1",
        values: {
          category_id: categoryId,
          client_name: "Smith Residence",
          job_name: "Backyard Cleanup",
          job_date: "2026-05-25",
        },
      }),
    ).rejects.toThrow("drive failed");

    expect(mockedMarkDriveConnectionIssue).toHaveBeenCalledWith(
      "business-1",
      expect.any(Error),
      expect.objectContaining({
        businessId: "business-1",
        userId: "user-1",
      }),
    );
  });

  it("lists jobs with the current user id so recent opens can be sorted first", async () => {
    mockedListJobsForBusiness.mockResolvedValue([]);

    const result = await listJobsForUser({
      businessId: "business-1",
      userId: "user-1",
      status: "active",
      categoryId: null,
      search: null,
    });

    expect(result?.jobs).toEqual([]);
    expect(mockedListJobsForBusiness).toHaveBeenCalledWith({
      businessId: "business-1",
      status: "active",
      categoryId: null,
      search: null,
      userId: "user-1",
    });
  });

  it("records a recent job open when loading job details", async () => {
    await getJobDetailsForUser("business-1", "job-1", "user-1");

    expect(mockedMarkJobOpenedForUser).toHaveBeenCalledWith({
      businessId: "business-1",
      jobId: "job-1",
      userId: "user-1",
    });
  });

  it("updates job metadata for owner-admin users", async () => {
    const result = await updateJobForBusiness({
      businessId: "business-1",
      jobId: "job-1",
      userId: "user-1",
      values: {
        category_id: categoryId,
        client_name: "Updated Client",
        job_name: "Updated Job",
        address: "",
        job_date: "2026-05-26",
      },
    });

    expect(result.client_name).toBe("Updated Client");
    expect(mockedUpdateJob).toHaveBeenCalled();
  });

  it("updates a job status for owner-admin users", async () => {
    const result = await updateJobStatusForBusiness({
      businessId: "business-1",
      jobId: "job-1",
      userId: "user-1",
      status: "completed",
    });

    expect(result.status).toBe("completed");
    expect(mockedUpdateJobStatus).toHaveBeenCalledWith(
      "job-1",
      "business-1",
      "completed",
    );
  });

  it("blocks reactivating an archived job when it would duplicate another active job", async () => {
    mockedGetJobForBusiness.mockResolvedValueOnce({
      id: "job-1",
      business_id: "business-1",
      category_id: categoryId,
      client_name: "Smith Residence",
      job_name: "Backyard Cleanup",
      address: "123 Main St",
      job_date: "2026-05-25",
      drive_folder_id: "drive-folder-1",
      in_process_folder_id: "in-process-1",
      needs_review_folder_id: "needs-review-1",
      status: "archived",
      created_by_user_id: "user-1",
      created_at: new Date(),
      updated_at: new Date(),
      category_name: "Landscaping",
      category_slug: "landscaping",
      last_opened_at: null,
    });
    mockedFindActiveDuplicateJob.mockResolvedValueOnce("job-2");

    await expect(
      updateJobStatusForBusiness({
        businessId: "business-1",
        jobId: "job-1",
        userId: "user-1",
        status: "active",
      }),
    ).rejects.toMatchObject({
      code: "duplicate",
    } satisfies Partial<JobServiceError>);

    expect(mockedUpdateJobStatus).not.toHaveBeenCalledWith(
      "job-1",
      "business-1",
      "active",
    );
  });
});
