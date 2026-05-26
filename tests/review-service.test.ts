import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/audit/logs", () => ({
  createAuditLog: vi.fn(),
  listAuditLogsForEntity: vi.fn()
}));

vi.mock("@/lib/server/data/drive-connections", () => ({
  getDriveConnectionForBusiness: vi.fn(),
  updateDriveConnectionStatus: vi.fn()
}));

vi.mock("@/lib/server/data/documents", () => ({
  getDocumentForBusiness: vi.fn(),
  listDocumentsForBusiness: vi.fn(),
  updateDocumentReviewFields: vi.fn()
}));

vi.mock("@/lib/server/data/general-folders", () => ({
  getGeneralFoldersForBusiness: vi.fn()
}));

vi.mock("@/lib/server/data/job-folders", () => ({
  listJobFolders: vi.fn()
}));

vi.mock("@/lib/server/auth/business-authorization", () => ({
  authorizeBusinessAccess: vi.fn()
}));

vi.mock("@/lib/server/data/jobs", () => ({
  getJobForBusiness: vi.fn(),
  listJobsForBusiness: vi.fn()
}));

vi.mock("@/lib/server/integrations/google/drive", () => ({
  getGoogleDriveFileBytes: vi.fn(),
  moveGoogleDriveFile: vi.fn()
}));

vi.mock("@/lib/server/security/encryption", () => ({
  decryptSecret: vi.fn()
}));

import { createAuditLog, listAuditLogsForEntity } from "@/lib/server/audit/logs";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import { getDriveConnectionForBusiness } from "@/lib/server/data/drive-connections";
import { getDocumentForBusiness, updateDocumentReviewFields } from "@/lib/server/data/documents";
import { getGeneralFoldersForBusiness } from "@/lib/server/data/general-folders";
import { listJobFolders } from "@/lib/server/data/job-folders";
import { getJobForBusiness, listJobsForBusiness } from "@/lib/server/data/jobs";
import { moveGoogleDriveFile } from "@/lib/server/integrations/google/drive";
import { decryptSecret } from "@/lib/server/security/encryption";
import {
  ReviewServiceError,
  markDocumentReviewedForUser,
  patchDocumentForReview
} from "@/lib/server/services/review-service";

const mockedCreateAuditLog = vi.mocked(createAuditLog);
const mockedListAuditLogsForEntity = vi.mocked(listAuditLogsForEntity);
const mockedGetDriveConnectionForBusiness = vi.mocked(getDriveConnectionForBusiness);
const mockedGetDocumentForBusiness = vi.mocked(getDocumentForBusiness);
const mockedUpdateDocumentReviewFields = vi.mocked(updateDocumentReviewFields);
const mockedGetGeneralFoldersForBusiness = vi.mocked(getGeneralFoldersForBusiness);
const mockedListJobFolders = vi.mocked(listJobFolders);
const mockedGetJobForBusiness = vi.mocked(getJobForBusiness);
const mockedListJobsForBusiness = vi.mocked(listJobsForBusiness);
const mockedAuthorizeBusinessAccess = vi.mocked(authorizeBusinessAccess);
const mockedMoveGoogleDriveFile = vi.mocked(moveGoogleDriveFile);
const mockedDecryptSecret = vi.mocked(decryptSecret);

describe("review-service", () => {
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
          role: "reviewer",
          status: "active"
        }
      }
    } as never);
    mockedGetDocumentForBusiness.mockResolvedValue({
      id: "document-1",
      business_id: "business-1",
      job_id: null,
      uploaded_by_user_id: "user-2",
      capture_context: "general",
      original_drive_file_id: "file-1",
      current_drive_file_id: "file-1",
      current_drive_folder_id: "general-needs-review-folder",
      original_filename: "invoice.jpg",
      current_filename: "invoice.jpg",
      mime_type: "image/jpeg",
      file_size_bytes: 1000,
      status: "needs_review",
      document_type: "invoice",
      target_folder_key: "needs_review",
      current_folder_key: "needs_review",
      current_folder_name: "99 Needs Review",
      vendor_or_party: "Vendor Co",
      document_date: "2026-05-26",
      amount: "55.25",
      currency: "USD",
      invoice_number: "INV-1",
      due_date: null,
      ai_confidence: "0.45",
      ai_needs_review: true,
      ai_reason: "uncertain",
      ai_raw_response: null,
      failure_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      uploader_name: "Pat Reviewer",
      uploader_email: "pat@example.com",
      job_client_name: null,
      job_job_name: null,
      job_category_name: null
    } as never);
    mockedGetGeneralFoldersForBusiness.mockResolvedValue([
      {
        folder_key: "tax",
        folder_name: "03 Tax",
        drive_folder_id: "general-tax-folder"
      },
      {
        folder_key: "needs_review",
        folder_name: "99 Needs Review",
        drive_folder_id: "general-needs-review-folder"
      }
    ] as never);
    mockedListJobFolders.mockResolvedValue([
      {
        folder_key: "receipts",
        folder_name: "01 Receipts",
        drive_folder_id: "job-receipts-folder"
      },
      {
        folder_key: "needs_review",
        folder_name: "99 Needs Review",
        drive_folder_id: "job-needs-review-folder"
      }
    ] as never);
    mockedGetJobForBusiness.mockResolvedValue({
      id: "job-1",
      category_name: "Landscaping"
    } as never);
    mockedListJobsForBusiness.mockResolvedValue([] as never);
    mockedUpdateDocumentReviewFields.mockResolvedValue({ id: "document-1" } as never);
    mockedListAuditLogsForEntity.mockResolvedValue([] as never);
    mockedGetDriveConnectionForBusiness.mockResolvedValue({
      access_token_encrypted: "encrypted-access",
      status: "active"
    } as never);
    mockedDecryptSecret.mockReturnValue("access-token");
    mockedMoveGoogleDriveFile.mockResolvedValue({
      id: "file-1",
      name: "invoice.jpg"
    } as never);
  });

  it("moves a document into a selected job folder, updates metadata, and records audit entries", async () => {
    await patchDocumentForReview({
      businessId: "business-1",
      documentId: "document-1",
      userId: "user-1",
      values: {
        job_id: "11111111-1111-1111-8111-111111111111",
        target_folder_key: "receipts",
        vendor_or_party: "Updated Vendor",
        amount: "66.30",
        mark_reviewed: true
      }
    });

    expect(mockedMoveGoogleDriveFile).toHaveBeenCalledWith({
      accessToken: "access-token",
      fileId: "file-1",
      fromFolderId: "general-needs-review-folder",
      toFolderId: "job-receipts-folder"
    });
    expect(mockedUpdateDocumentReviewFields).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job-1",
        captureContext: "job",
        currentDriveFolderId: "job-receipts-folder",
        targetFolderKey: "receipts",
        vendorOrParty: "Updated Vendor",
        amount: 66.3,
        status: "reviewed",
        failureReason: null
      })
    );
    expect(mockedCreateAuditLog).toHaveBeenCalledTimes(3);
  });

  it("updates metadata without moving the file when the folder stays the same", async () => {
    await patchDocumentForReview({
      businessId: "business-1",
      documentId: "document-1",
      userId: "user-1",
      values: {
        job_id: null,
        target_folder_key: "needs_review",
        vendor_or_party: "Renamed Vendor"
      }
    });

    expect(mockedMoveGoogleDriveFile).not.toHaveBeenCalled();
    expect(mockedUpdateDocumentReviewFields).toHaveBeenCalledWith(
      expect.objectContaining({
        captureContext: "general",
        currentDriveFolderId: "general-needs-review-folder",
        vendorOrParty: "Renamed Vendor",
        status: "needs_review"
      })
    );
  });

  it("rejects invalid folder choices for the selected context", async () => {
    await expect(
      patchDocumentForReview({
        businessId: "business-1",
        documentId: "document-1",
        userId: "user-1",
        values: {
          job_id: "11111111-1111-1111-8111-111111111111",
          target_folder_key: "tax"
        }
      })
    ).rejects.toMatchObject({
      code: "invalid_review"
    } satisfies Partial<ReviewServiceError>);
  });

  it("validates the mark-reviewed payload", async () => {
    await expect(
      markDocumentReviewedForUser({
        businessId: "business-1",
        documentId: "document-1",
        userId: "user-1",
        values: {
          mark_reviewed: false
        }
      })
    ).rejects.toBeInstanceOf(ZodError);
  });
});
