import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/data/documents", () => ({
  createDocument: vi.fn()
}));

vi.mock("@/lib/server/data/document-processing-jobs", () => ({
  enqueueDocumentProcessingJob: vi.fn()
}));

vi.mock("@/lib/server/data/drive-connections", () => ({
  getDriveConnectionForBusiness: vi.fn(),
  updateDriveConnectionStatus: vi.fn()
}));

vi.mock("@/lib/server/data/general-folders", () => ({
  getGeneralFoldersForBusiness: vi.fn()
}));

vi.mock("@/lib/server/integrations/google/drive", () => ({
  uploadGoogleDriveFile: vi.fn()
}));

vi.mock("@/lib/server/security/encryption", () => ({
  decryptSecret: vi.fn()
}));

vi.mock("@/lib/server/services/job-service", () => ({
  getJobDetailsForUser: vi.fn()
}));

vi.mock("@/lib/server/services/business-service", () => ({
  getBusinessDetailsForUser: vi.fn()
}));

import { createDocument } from "@/lib/server/data/documents";
import { enqueueDocumentProcessingJob } from "@/lib/server/data/document-processing-jobs";
import {
  getDriveConnectionForBusiness,
  updateDriveConnectionStatus
} from "@/lib/server/data/drive-connections";
import { getGeneralFoldersForBusiness } from "@/lib/server/data/general-folders";
import { uploadGoogleDriveFile } from "@/lib/server/integrations/google/drive";
import { decryptSecret } from "@/lib/server/security/encryption";
import { getBusinessDetailsForUser } from "@/lib/server/services/business-service";
import { getJobDetailsForUser } from "@/lib/server/services/job-service";
import {
  DocumentUploadError,
  uploadGeneralDocument,
  uploadJobDocument
} from "@/lib/server/services/document-upload-service";

const mockedCreateDocument = vi.mocked(createDocument);
const mockedEnqueueDocumentProcessingJob = vi.mocked(enqueueDocumentProcessingJob);
const mockedGetDriveConnectionForBusiness = vi.mocked(getDriveConnectionForBusiness);
const mockedUpdateDriveConnectionStatus = vi.mocked(updateDriveConnectionStatus);
const mockedGetGeneralFoldersForBusiness = vi.mocked(getGeneralFoldersForBusiness);
const mockedUploadGoogleDriveFile = vi.mocked(uploadGoogleDriveFile);
const mockedDecryptSecret = vi.mocked(decryptSecret);
const mockedGetBusinessDetailsForUser = vi.mocked(getBusinessDetailsForUser);
const mockedGetJobDetailsForUser = vi.mocked(getJobDetailsForUser);

describe("document-upload-service", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedGetJobDetailsForUser.mockResolvedValue({
      membership: {
        role: "field_user",
        status: "active"
      },
      job: {
        id: "job-1",
        business_id: "business-1",
        in_process_folder_id: "in-process-1",
        status: "active"
      }
    } as never);
    mockedGetBusinessDetailsForUser.mockResolvedValue({
      business: {
        id: "business-1",
        name: "ABC Landscaping",
        owner_user_id: "user-1",
        drive_root_folder_id: "root-1",
        general_docs_folder_id: "general-root-1",
        created_at: new Date(),
        updated_at: new Date()
      },
      membership: {
        role: "reviewer",
        status: "active"
      }
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
      updated_at: new Date()
    });
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
        folder_key: "needs_review",
        folder_name: "99 Needs Review",
        drive_folder_id: "general-needs-review-1",
        created_at: new Date()
      }
    ]);
    mockedDecryptSecret.mockReturnValue("access-token");
    mockedUploadGoogleDriveFile.mockResolvedValue({
      id: "drive-file-1",
      name: "receipt.jpg"
    });
    mockedCreateDocument.mockResolvedValue({
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
      file_size_bytes: 1234,
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
    mockedEnqueueDocumentProcessingJob.mockResolvedValue({
      id: "processing-job-1",
      document_id: "document-1",
      correlation_id: "corr-1",
      status: "pending",
      attempts: 0,
      available_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  function createImageFile(input: {
    name: string;
    type: string;
    contents?: string;
    size?: number;
  }) {
    const file = {
      name: input.name,
      type: input.type,
      size: input.size ?? (input.contents ? new TextEncoder().encode(input.contents).length : 0),
      arrayBuffer: vi.fn().mockResolvedValue(
        new TextEncoder().encode(input.contents ?? "").buffer
      )
    };

    return file as unknown as File;
  }

  it("uploads a job image to Drive, creates the document row, and enqueues processing", async () => {
    const file = createImageFile({
      name: "receipt.jpg",
      type: "image/jpeg",
      contents: "image-bytes"
    });

    const result = await uploadJobDocument({
      businessId: "business-1",
      jobId: "job-1",
      userId: "user-1",
      file
    });

    expect(result).toEqual({
      documentId: "document-1",
      status: "uploaded_to_in_process"
    });
    expect(mockedUploadGoogleDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: "in-process-1",
        filename: "receipt.jpg",
        mimeType: "image/jpeg"
      })
    );
    expect(mockedCreateDocument).toHaveBeenCalled();
    expect(mockedEnqueueDocumentProcessingJob).toHaveBeenCalled();
  });

  it("rejects uploads for users outside the business scope", async () => {
    mockedGetJobDetailsForUser.mockResolvedValue(null);

    await expect(
      uploadJobDocument({
        businessId: "business-1",
        jobId: "job-1",
        userId: "user-2",
        file: createImageFile({
          name: "receipt.jpg",
          type: "image/jpeg",
          contents: "image-bytes"
        })
      })
    ).rejects.toMatchObject({
      code: "forbidden"
    } satisfies Partial<DocumentUploadError>);
  });

  it("rejects unsupported uploads before calling Drive", async () => {
    await expect(
      uploadJobDocument({
        businessId: "business-1",
        jobId: "job-1",
        userId: "user-1",
        file: createImageFile({
          name: "receipt.pdf",
          type: "application/pdf",
          contents: "not-an-image"
        })
      })
    ).rejects.toMatchObject({
      code: "invalid_file",
      message: "Only image uploads are supported."
    } satisfies Partial<DocumentUploadError>);

    expect(mockedUploadGoogleDriveFile).not.toHaveBeenCalled();
  });

  it("uploads a general business document into the general in-process folder and enqueues processing", async () => {
    const file = createImageFile({
      name: "insurance-card.jpg",
      type: "image/jpeg",
      contents: "image-bytes"
    });

    const result = await uploadGeneralDocument({
      businessId: "business-1",
      userId: "user-1",
      file
    });

    expect(result).toEqual({
      documentId: "document-1",
      status: "uploaded_to_in_process"
    });
    expect(mockedUploadGoogleDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: "general-in-process-1",
        filename: "insurance-card.jpg",
        mimeType: "image/jpeg"
      })
    );
    expect(mockedCreateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        captureContext: "general",
        jobId: null,
        currentDriveFolderId: "general-in-process-1"
      })
    );
    expect(mockedEnqueueDocumentProcessingJob).toHaveBeenCalled();
  });

  it("rejects general uploads for field users", async () => {
    mockedGetBusinessDetailsForUser.mockResolvedValue({
      business: {
        id: "business-1",
        name: "ABC Landscaping",
        owner_user_id: "user-1",
        drive_root_folder_id: "root-1",
        general_docs_folder_id: "general-root-1",
        created_at: new Date(),
        updated_at: new Date()
      },
      membership: {
        role: "field_user",
        status: "active"
      }
    });

    await expect(
      uploadGeneralDocument({
        businessId: "business-1",
        userId: "user-1",
        file: createImageFile({
          name: "insurance-card.jpg",
          type: "image/jpeg",
          contents: "image-bytes"
        })
      })
    ).rejects.toMatchObject({
      code: "forbidden"
    } satisfies Partial<DocumentUploadError>);
  });
});
