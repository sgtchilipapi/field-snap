import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/audit/logs", () => ({
  AUDIT_ACTIONS: {
    documentAiClassified: "document.ai_classified",
    documentAutoFiled: "document.auto_filed",
    documentMoved: "document.moved",
    documentRenamed: "document.renamed"
  },
  recordAuditEvent: vi.fn()
}));

vi.mock("@/lib/server/data/businesses", () => ({
  getBusinessById: vi.fn()
}));

vi.mock("@/lib/server/data/document-processing-jobs", () => ({
  claimNextDocumentProcessingJob: vi.fn(),
  completeDocumentProcessingJob: vi.fn(),
  failDocumentProcessingJob: vi.fn(),
  retryDocumentProcessingJob: vi.fn()
}));

vi.mock("@/lib/server/data/documents", () => ({
  getDocumentById: vi.fn(),
  updateDocumentAiFields: vi.fn(),
  updateDocumentProcessingState: vi.fn()
}));

vi.mock("@/lib/server/data/drive-connections", () => ({
  getDriveConnectionForBusiness: vi.fn(),
  updateDriveConnectionStatus: vi.fn()
}));

vi.mock("@/lib/server/data/general-folders", () => ({
  getGeneralFoldersForBusiness: vi.fn()
}));

vi.mock("@/lib/server/data/job-folders", () => ({
  listJobFolders: vi.fn()
}));

vi.mock("@/lib/server/data/jobs", () => ({
  getJobForBusiness: vi.fn()
}));

vi.mock("@/lib/server/data/users", () => ({
  findUserById: vi.fn()
}));

vi.mock("@/lib/server/integrations/google/drive", () => ({
  getGoogleDriveFileBytes: vi.fn(),
  moveGoogleDriveFile: vi.fn(),
  renameGoogleDriveFile: vi.fn()
}));

vi.mock("@/lib/server/security/encryption", () => ({
  decryptSecret: vi.fn()
}));

import { recordAuditEvent } from "@/lib/server/audit/logs";
import { getBusinessById } from "@/lib/server/data/businesses";
import {
  claimNextDocumentProcessingJob,
  completeDocumentProcessingJob,
  failDocumentProcessingJob,
  retryDocumentProcessingJob
} from "@/lib/server/data/document-processing-jobs";
import {
  getDocumentById,
  updateDocumentAiFields,
  updateDocumentProcessingState
} from "@/lib/server/data/documents";
import {
  getDriveConnectionForBusiness,
  updateDriveConnectionStatus
} from "@/lib/server/data/drive-connections";
import { getGeneralFoldersForBusiness } from "@/lib/server/data/general-folders";
import { listJobFolders } from "@/lib/server/data/job-folders";
import { getJobForBusiness } from "@/lib/server/data/jobs";
import { findUserById } from "@/lib/server/data/users";
import {
  getGoogleDriveFileBytes,
  moveGoogleDriveFile,
  renameGoogleDriveFile
} from "@/lib/server/integrations/google/drive";
import { decryptSecret } from "@/lib/server/security/encryption";
import { runNextDocumentProcessingJob } from "@/lib/server/services/document-processing-service";

const mockedRecordAuditEvent = vi.mocked(recordAuditEvent);
const mockedGetBusinessById = vi.mocked(getBusinessById);
const mockedClaimNextDocumentProcessingJob = vi.mocked(claimNextDocumentProcessingJob);
const mockedCompleteDocumentProcessingJob = vi.mocked(completeDocumentProcessingJob);
const mockedFailDocumentProcessingJob = vi.mocked(failDocumentProcessingJob);
const mockedRetryDocumentProcessingJob = vi.mocked(retryDocumentProcessingJob);
const mockedGetDocumentById = vi.mocked(getDocumentById);
const mockedUpdateDocumentAiFields = vi.mocked(updateDocumentAiFields);
const mockedUpdateDocumentProcessingState = vi.mocked(updateDocumentProcessingState);
const mockedGetDriveConnectionForBusiness = vi.mocked(getDriveConnectionForBusiness);
const mockedUpdateDriveConnectionStatus = vi.mocked(updateDriveConnectionStatus);
const mockedGetGeneralFoldersForBusiness = vi.mocked(getGeneralFoldersForBusiness);
const mockedListJobFolders = vi.mocked(listJobFolders);
const mockedGetJobForBusiness = vi.mocked(getJobForBusiness);
const mockedFindUserById = vi.mocked(findUserById);
const mockedGetGoogleDriveFileBytes = vi.mocked(getGoogleDriveFileBytes);
const mockedMoveGoogleDriveFile = vi.mocked(moveGoogleDriveFile);
const mockedRenameGoogleDriveFile = vi.mocked(renameGoogleDriveFile);
const mockedDecryptSecret = vi.mocked(decryptSecret);

function createProvider(result: unknown | Promise<unknown>) {
  return {
    classifyDocument: vi.fn().mockImplementation(() => result)
  };
}

describe("document-processing-service", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedClaimNextDocumentProcessingJob.mockResolvedValue({
      id: "processing-job-1",
      document_id: "document-1",
      correlation_id: "corr-1",
      status: "processing",
      attempts: 1,
      available_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });
    mockedGetDocumentById.mockResolvedValue({
      id: "document-1",
      business_id: "business-1",
      job_id: "job-1",
      uploaded_by_user_id: "user-1",
      capture_context: "job",
      original_drive_file_id: "drive-file-1",
      current_drive_file_id: "drive-file-1",
      current_drive_folder_id: "in-process-1",
      original_filename: "receipt.jpg",
      current_filename: "receipt.jpg",
      mime_type: "image/jpeg",
      file_size_bytes: 1024,
      status: "uploaded_to_in_process",
      document_type: null,
      target_folder_key: null,
      vendor_or_party: null,
      document_date: null,
      amount: null,
      currency: null,
      invoice_number: null,
      due_date: null,
      ai_confidence: null,
      ai_needs_review: null,
      ai_reason: null,
      ai_raw_response: null,
      failure_reason: null,
      created_at: new Date(),
      updated_at: new Date()
    });
    mockedGetBusinessById.mockResolvedValue({
      id: "business-1",
      name: "ABC Landscaping",
      owner_user_id: "user-1",
      drive_root_folder_id: "root-1",
      general_docs_folder_id: "general-1",
      created_at: new Date(),
      updated_at: new Date()
    });
    mockedFindUserById.mockResolvedValue({
      id: "user-1",
      google_sub: "sub-1",
      email: "field@example.com",
      name: "Field User",
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date()
    });
    mockedGetJobForBusiness.mockResolvedValue({
      id: "job-1",
      business_id: "business-1",
      category_id: "category-1",
      client_name: "Smith Residence",
      job_name: "Backyard Cleanup",
      address: "123 Main St",
      job_date: "2026-05-25",
      drive_folder_id: "job-root-1",
      in_process_folder_id: "in-process-1",
      needs_review_folder_id: "needs-review-1",
      status: "active",
      created_by_user_id: "user-1",
      created_at: new Date(),
      updated_at: new Date(),
      category_name: "Landscaping",
      category_slug: "landscaping"
    });
    mockedListJobFolders.mockResolvedValue([
      {
        id: "folder-1",
        job_id: "job-1",
        folder_key: "in_process",
        folder_name: "00 In-Process",
        drive_folder_id: "in-process-1",
        created_at: new Date()
      },
      {
        id: "folder-2",
        job_id: "job-1",
        folder_key: "receipts",
        folder_name: "01 Receipts",
        drive_folder_id: "receipts-1",
        created_at: new Date()
      },
      {
        id: "folder-3",
        job_id: "job-1",
        folder_key: "job_photos",
        folder_name: "04 Job Photos",
        drive_folder_id: "job-photos-1",
        created_at: new Date()
      },
      {
        id: "folder-4",
        job_id: "job-1",
        folder_key: "needs_review",
        folder_name: "99 Needs Review",
        drive_folder_id: "needs-review-1",
        created_at: new Date()
      }
    ]);
    mockedGetGeneralFoldersForBusiness.mockResolvedValue([
      {
        id: "general-folder-1",
        business_id: "business-1",
        folder_key: "in_process",
        folder_name: "00 In-Process",
        drive_folder_id: "general-in-process-1",
        created_at: new Date()
      },
      {
        id: "general-folder-2",
        business_id: "business-1",
        folder_key: "tax",
        folder_name: "03 Tax",
        drive_folder_id: "tax-1",
        created_at: new Date()
      },
      {
        id: "general-folder-3",
        business_id: "business-1",
        folder_key: "needs_review",
        folder_name: "99 Needs Review",
        drive_folder_id: "general-needs-review-1",
        created_at: new Date()
      }
    ]);
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
      updated_at: new Date()
    });
    mockedDecryptSecret.mockReturnValue("access-token");
    mockedGetGoogleDriveFileBytes.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3])
    });
    mockedMoveGoogleDriveFile.mockResolvedValue({
      id: "drive-file-1",
      name: "receipt.jpg"
    });
    mockedRenameGoogleDriveFile.mockResolvedValue({
      id: "drive-file-1",
      name: "Home Depot - 182.44 - 2026-05-21.jpg"
    });
  });

  it("auto-files a high-confidence receipt, renames it safely, and completes the queue job", async () => {
    const provider = createProvider(
      Promise.resolve({
        document_type: "receipt",
        target_folder_key: "receipts",
        suggested_filename: "Home Depot / 182.44 / 2026-05-21.jpg",
        vendor_or_party: "Home Depot",
        document_date: "2026-05-21",
        amount: 182.44,
        currency: "USD",
        invoice_number: null,
        due_date: null,
        confidence: 0.98,
        needs_review: false,
        reason: "Receipt",
        raw_provider_payload: { ok: true },
        valid: true,
        normalization_error_code: null,
        normalization_error_details: null
      })
    );

    const result = await runNextDocumentProcessingJob(provider as never);

    expect(result).toEqual({
      jobId: "processing-job-1",
      documentId: "document-1",
      status: "auto_filed"
    });
    expect(mockedMoveGoogleDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fromFolderId: "in-process-1",
        toFolderId: "receipts-1"
      })
    );
    expect(mockedRenameGoogleDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "Home Depot - 182.44 - 2026-05-21.jpg"
      })
    );
    expect(mockedUpdateDocumentProcessingState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "auto_filed",
        currentDriveFolderId: "receipts-1",
        failureReason: null
      })
    );
    expect(mockedRecordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "document.ai_classified",
        newValue: expect.objectContaining({
          routing_reason: "auto_filed"
        })
      })
    );
    expect(mockedCompleteDocumentProcessingJob).toHaveBeenCalledWith("processing-job-1");
    expect(mockedRecordAuditEvent).toHaveBeenCalled();
  });

  it("auto-files a 0.93 classification without renaming the file", async () => {
    const provider = createProvider(
      Promise.resolve({
        document_type: "receipt",
        target_folder_key: "receipts",
        suggested_filename: "Home Depot - 182.44 - 2026-05-21.jpg",
        vendor_or_party: "Home Depot",
        document_date: "2026-05-21",
        amount: 182.44,
        currency: "USD",
        invoice_number: null,
        due_date: null,
        confidence: 0.93,
        needs_review: false,
        reason: "Receipt",
        raw_provider_payload: { ok: true },
        valid: true,
        normalization_error_code: null,
        normalization_error_details: null
      })
    );

    const result = await runNextDocumentProcessingJob(provider as never);

    expect(result).toEqual({
      jobId: "processing-job-1",
      documentId: "document-1",
      status: "auto_filed"
    });
    expect(mockedMoveGoogleDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        toFolderId: "receipts-1"
      })
    );
    expect(mockedRenameGoogleDriveFile).not.toHaveBeenCalled();
    expect(mockedUpdateDocumentProcessingState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "auto_filed",
        currentDriveFolderId: "receipts-1",
        failureReason: null
      })
    );
  });

  it("routes a low-confidence result to Needs Review and preserves AI metadata", async () => {
    const provider = createProvider(
      Promise.resolve({
        document_type: "job_photo",
        target_folder_key: "job_photos",
        suggested_filename: null,
        vendor_or_party: null,
        document_date: "2026-05-21",
        amount: null,
        currency: null,
        invoice_number: null,
        due_date: null,
        confidence: 0.62,
        needs_review: false,
        reason: "Low-confidence job photo classification",
        raw_provider_payload: { ok: true },
        valid: true,
        normalization_error_code: null,
        normalization_error_details: null
      })
    );

    const result = await runNextDocumentProcessingJob(provider as never);

    expect(result).toEqual({
      jobId: "processing-job-1",
      documentId: "document-1",
      status: "needs_review"
    });
    expect(mockedMoveGoogleDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        toFolderId: "needs-review-1"
      })
    );
    expect(mockedRenameGoogleDriveFile).not.toHaveBeenCalled();
    expect(mockedUpdateDocumentAiFields).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: "job_photo",
        aiConfidence: 0.62
      })
    );
    expect(mockedUpdateDocumentProcessingState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "needs_review",
        currentDriveFolderId: "needs-review-1",
        failureReason: null
      })
    );
    expect(mockedRecordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "document.ai_classified",
        newValue: expect.objectContaining({
          routing_reason: "review_low_confidence"
        })
      })
    );
  });

  it("routes a high-confidence classification to review when the model requests review", async () => {
    const provider = createProvider(
      Promise.resolve({
        document_type: "job_photo",
        target_folder_key: "job_photos",
        suggested_filename: "site-progress.jpg",
        vendor_or_party: null,
        document_date: "2026-05-21",
        amount: null,
        currency: null,
        invoice_number: null,
        due_date: null,
        confidence: 0.98,
        needs_review: true,
        reason: "The image is partially obscured and should be reviewed.",
        raw_provider_payload: { ok: true },
        valid: true,
        normalization_error_code: null,
        normalization_error_details: null
      })
    );

    const result = await runNextDocumentProcessingJob(provider as never);

    expect(result).toEqual({
      jobId: "processing-job-1",
      documentId: "document-1",
      status: "needs_review"
    });
    expect(mockedMoveGoogleDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        toFolderId: "needs-review-1"
      })
    );
    expect(mockedRenameGoogleDriveFile).not.toHaveBeenCalled();
    expect(mockedRecordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "document.ai_classified",
        newValue: expect.objectContaining({
          routing_reason: "review_model_requested_review"
        })
      })
    );
  });

  it("routes a general business document into the matching general folder", async () => {
    mockedGetDocumentById.mockResolvedValue({
      id: "document-1",
      business_id: "business-1",
      job_id: null,
      uploaded_by_user_id: "user-1",
      capture_context: "general",
      original_drive_file_id: "drive-file-1",
      current_drive_file_id: "drive-file-1",
      current_drive_folder_id: "general-in-process-1",
      original_filename: "tax-form.jpg",
      current_filename: "tax-form.jpg",
      mime_type: "image/jpeg",
      file_size_bytes: 1024,
      status: "uploaded_to_in_process",
      document_type: null,
      target_folder_key: null,
      vendor_or_party: null,
      document_date: null,
      amount: null,
      currency: null,
      invoice_number: null,
      due_date: null,
      ai_confidence: null,
      ai_needs_review: null,
      ai_reason: null,
      ai_raw_response: null,
      failure_reason: null,
      created_at: new Date(),
      updated_at: new Date()
    });

    const provider = createProvider(
      Promise.resolve({
        document_type: "tax_document",
        target_folder_key: "tax",
        suggested_filename: "IRS Notice - 2026-05-21.jpg",
        vendor_or_party: "IRS",
        document_date: "2026-05-21",
        amount: null,
        currency: null,
        invoice_number: null,
        due_date: null,
        confidence: 0.99,
        needs_review: false,
        reason: "Tax notice",
        raw_provider_payload: { ok: true },
        valid: true,
        normalization_error_code: null,
        normalization_error_details: null
      })
    );

    const result = await runNextDocumentProcessingJob(provider as never);

    expect(result).toEqual({
      jobId: "processing-job-1",
      documentId: "document-1",
      status: "auto_filed"
    });
    expect(mockedMoveGoogleDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fromFolderId: "general-in-process-1",
        toFolderId: "tax-1"
      })
    );
    expect(mockedUpdateDocumentProcessingState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "auto_filed",
        currentDriveFolderId: "tax-1",
        failureReason: null
      })
    );
  });

  it("routes a high-confidence needs-review target into Needs Review", async () => {
    const provider = createProvider(
      Promise.resolve({
        document_type: "receipt",
        target_folder_key: "needs_review",
        suggested_filename: "receipt.jpg",
        vendor_or_party: "Home Depot",
        document_date: "2026-05-21",
        amount: 182.44,
        currency: "USD",
        invoice_number: null,
        due_date: null,
        confidence: 0.99,
        needs_review: true,
        reason: "The receipt is too cropped to file confidently.",
        raw_provider_payload: { ok: true },
        valid: true,
        normalization_error_code: null,
        normalization_error_details: null
      })
    );

    const result = await runNextDocumentProcessingJob(provider as never);

    expect(result).toEqual({
      jobId: "processing-job-1",
      documentId: "document-1",
      status: "needs_review"
    });
    expect(mockedRenameGoogleDriveFile).not.toHaveBeenCalled();
    expect(mockedRecordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "document.ai_classified",
        newValue: expect.objectContaining({
          routing_reason: "review_needs_review_target"
        })
      })
    );
  });

  it("retries a transient AI failure once and marks the document failed meanwhile", async () => {
    const provider = createProvider(Promise.reject(new Error("provider timeout")));

    const result = await runNextDocumentProcessingJob(provider as never);

    expect(result).toEqual({
      jobId: "processing-job-1",
      documentId: "document-1",
      status: "retried"
    });
    expect(mockedRetryDocumentProcessingJob).toHaveBeenCalledWith("processing-job-1");
    expect(mockedFailDocumentProcessingJob).not.toHaveBeenCalled();
    expect(mockedUpdateDocumentProcessingState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "failed",
        failureReason: "ai_error"
      })
    );
  });

  it("marks the job failed after the second transient processing failure", async () => {
    mockedClaimNextDocumentProcessingJob.mockResolvedValue({
      id: "processing-job-1",
      document_id: "document-1",
      correlation_id: "corr-1",
      status: "processing",
      attempts: 2,
      available_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });
    const provider = createProvider(Promise.reject(new Error("provider timeout")));

    const result = await runNextDocumentProcessingJob(provider as never);

    expect(result).toEqual({
      jobId: "processing-job-1",
      documentId: "document-1",
      status: "failed"
    });
    expect(mockedFailDocumentProcessingJob).toHaveBeenCalledWith("processing-job-1");
    expect(mockedRetryDocumentProcessingJob).not.toHaveBeenCalled();
  });

  it("fails the document when the Drive move after classification does not succeed", async () => {
    const provider = createProvider(
      Promise.resolve({
        document_type: "receipt",
        target_folder_key: "receipts",
        suggested_filename: "receipt.jpg",
        vendor_or_party: "Home Depot",
        document_date: "2026-05-21",
        amount: 182.44,
        currency: "USD",
        invoice_number: null,
        due_date: null,
        confidence: 0.98,
        needs_review: false,
        reason: "Receipt",
        raw_provider_payload: { ok: true },
        valid: true,
        normalization_error_code: null,
        normalization_error_details: null
      })
    );
    mockedMoveGoogleDriveFile.mockRejectedValue(new Error("Google Drive file move failed: 500"));

    const result = await runNextDocumentProcessingJob(provider as never);

    expect(result).toEqual({
      jobId: "processing-job-1",
      documentId: "document-1",
      status: "retried"
    });
    expect(mockedUpdateDocumentProcessingState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "failed",
        failureReason: "drive_move_error"
      })
    );
    expect(mockedUpdateDriveConnectionStatus).not.toHaveBeenCalled();
  });

  it("settles the document when folder mappings are missing before classification starts", async () => {
    mockedListJobFolders.mockResolvedValue([
      {
        id: "folder-1",
        job_id: "job-1",
        folder_key: "in_process",
        folder_name: "00 In-Process",
        drive_folder_id: "in-process-1",
        created_at: new Date()
      }
    ]);

    const result = await runNextDocumentProcessingJob(createProvider(Promise.resolve({})) as never);

    expect(result).toEqual({
      jobId: "processing-job-1",
      documentId: "document-1",
      status: "failed"
    });
    expect(mockedUpdateDocumentProcessingState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        documentId: "document-1",
        status: "failed",
        failureReason: "missing_folder_mapping"
      })
    );
    expect(mockedFailDocumentProcessingJob).toHaveBeenCalledWith("processing-job-1");
  });
});
