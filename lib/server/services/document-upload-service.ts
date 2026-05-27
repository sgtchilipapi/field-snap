import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/server/audit/logs";
import { createDocument } from "@/lib/server/data/documents";
import { enqueueDocumentProcessingJob } from "@/lib/server/data/document-processing-jobs";
import { getDriveConnectionForBusiness } from "@/lib/server/data/drive-connections";
import { getGeneralFoldersForBusiness } from "@/lib/server/data/general-folders";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import { uploadGoogleDriveFile } from "@/lib/server/integrations/google/drive";
import { logInfo, logWarn } from "@/lib/server/logger";
import { decryptSecret } from "@/lib/server/security/encryption";
import { markDriveConnectionIssue } from "@/lib/server/services/drive-connection-health";
import { getJobDetailsForUser } from "@/lib/server/services/job-service";

const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_EXACT_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);

export class DocumentUploadError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "forbidden"
      | "not_found"
      | "invalid_file"
      | "file_too_large"
      | "drive_unavailable"
  ) {
    super(message);
  }
}

export function getMaxUploadSizeBytes() {
  return MAX_UPLOAD_SIZE_BYTES;
}

function isAcceptedMimeType(mimeType: string) {
  return mimeType.startsWith("image/") || ACCEPTED_EXACT_MIME_TYPES.has(mimeType);
}

function normalizeFilename(filename: string) {
  const trimmed = filename.trim();
  return trimmed.length > 0 ? trimmed : "upload";
}

function validateUploadFile(file: File) {
  if (file.size === 0) {
    throw new DocumentUploadError("Select an image to upload.", "invalid_file");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new DocumentUploadError("Image uploads must be 15 MB or smaller.", "file_too_large");
  }

  const mimeType = file.type || "application/octet-stream";

  if (!isAcceptedMimeType(mimeType)) {
    throw new DocumentUploadError("Only image uploads are supported.", "invalid_file");
  }

  return mimeType;
}

async function requireDriveAccessForBusiness(businessId: string) {
  const connection = await getDriveConnectionForBusiness(businessId);

  if (!connection || connection.status !== "active" || !connection.access_token_encrypted) {
    throw new DocumentUploadError("An active Google Drive connection is required.", "drive_unavailable");
  }

  return {
    accessToken: decryptSecret(connection.access_token_encrypted)
  };
}

export async function uploadJobDocument(input: {
  businessId: string;
  jobId: string;
  userId: string;
  file: File;
}) {
  const authorization = await authorizeBusinessAccess({
    businessId: input.businessId,
    userId: input.userId,
    capability: "documents:upload_job"
  });

  if (!authorization.allowed) {
    throw new DocumentUploadError("You do not have access to this business.", "forbidden");
  }

  const result = await getJobDetailsForUser(input.businessId, input.jobId, input.userId);

  if (!result) {
    throw new DocumentUploadError("You do not have access to this business.", "forbidden");
  }

  if (!result.job) {
    throw new DocumentUploadError("Job not found.", "not_found");
  }

  if (result.job.status !== "active") {
    throw new DocumentUploadError("Only active jobs can receive uploads.", "invalid_file");
  }

  const mimeType = validateUploadFile(input.file);

  const { accessToken } = await requireDriveAccessForBusiness(input.businessId);
  const filename = normalizeFilename(input.file.name);
  const bytes = new Uint8Array(await input.file.arrayBuffer());

  let uploadedFile: Awaited<ReturnType<typeof uploadGoogleDriveFile>>;

  try {
    uploadedFile = await uploadGoogleDriveFile({
      accessToken,
      folderId: result.job.in_process_folder_id,
      filename,
      mimeType,
      bytes
    });
  } catch (error) {
    await markDriveConnectionIssue(input.businessId, error, {
      businessId: input.businessId,
      userId: input.userId
    });
    logWarn("Document upload failed", {
      businessId: input.businessId,
      userId: input.userId,
      jobId: input.jobId
    });

    throw error;
  }

  const document = await createDocument({
    businessId: input.businessId,
    jobId: result.job.id,
    uploadedByUserId: input.userId,
    captureContext: "job",
    originalDriveFileId: uploadedFile.id,
    currentDriveFileId: uploadedFile.id,
    currentDriveFolderId: result.job.in_process_folder_id,
    originalFilename: filename,
    currentFilename: uploadedFile.name,
    mimeType,
    fileSizeBytes: input.file.size,
    status: "uploaded_to_in_process"
  });

  await enqueueDocumentProcessingJob({
    documentId: document.id,
    correlationId: crypto.randomUUID()
  });

  await recordAuditEvent({
    businessId: input.businessId,
    actorUserId: input.userId,
    entityType: "document",
    entityId: document.id,
    action: AUDIT_ACTIONS.documentUploaded,
    newValue: {
      capture_context: document.capture_context,
      job_id: document.job_id,
      folder_id: document.current_drive_folder_id,
      filename: document.current_filename,
      status: document.status
    }
  });

  logInfo("Document upload succeeded", {
    businessId: input.businessId,
    userId: input.userId,
    documentId: document.id,
    jobId: input.jobId
  });

  return {
    documentId: document.id,
    status: document.status
  };
}

export async function uploadGeneralDocument(input: {
  businessId: string;
  userId: string;
  file: File;
}) {
  const authorization = await authorizeBusinessAccess({
    businessId: input.businessId,
    userId: input.userId,
    capability: "documents:upload_general"
  });

  if (!authorization.allowed) {
    throw new DocumentUploadError("You do not have access to this business.", "forbidden");
  }

  const mimeType = validateUploadFile(input.file);
  const generalFolders = await getGeneralFoldersForBusiness(input.businessId);
  const inProcessFolder = generalFolders.find((folder) => folder.folder_key === "in_process");

  if (!inProcessFolder) {
    throw new DocumentUploadError(
      "General Business Docs folders are not available for this business.",
      "drive_unavailable"
    );
  }

  const { accessToken } = await requireDriveAccessForBusiness(input.businessId);
  const filename = normalizeFilename(input.file.name);
  const bytes = new Uint8Array(await input.file.arrayBuffer());

  let uploadedFile: Awaited<ReturnType<typeof uploadGoogleDriveFile>>;

  try {
    uploadedFile = await uploadGoogleDriveFile({
      accessToken,
      folderId: inProcessFolder.drive_folder_id,
      filename,
      mimeType,
      bytes
    });
  } catch (error) {
    await markDriveConnectionIssue(input.businessId, error, {
      businessId: input.businessId,
      userId: input.userId
    });
    logWarn("Document upload failed", {
      businessId: input.businessId,
      userId: input.userId,
      captureContext: "general"
    });

    throw error;
  }

  const document = await createDocument({
    businessId: input.businessId,
    jobId: null,
    uploadedByUserId: input.userId,
    captureContext: "general",
    originalDriveFileId: uploadedFile.id,
    currentDriveFileId: uploadedFile.id,
    currentDriveFolderId: inProcessFolder.drive_folder_id,
    originalFilename: filename,
    currentFilename: uploadedFile.name,
    mimeType,
    fileSizeBytes: input.file.size,
    status: "uploaded_to_in_process"
  });

  await enqueueDocumentProcessingJob({
    documentId: document.id,
    correlationId: crypto.randomUUID()
  });

  await recordAuditEvent({
    businessId: input.businessId,
    actorUserId: input.userId,
    entityType: "document",
    entityId: document.id,
    action: AUDIT_ACTIONS.documentUploaded,
    newValue: {
      capture_context: document.capture_context,
      job_id: document.job_id,
      folder_id: document.current_drive_folder_id,
      filename: document.current_filename,
      status: document.status
    }
  });

  logInfo("Document upload succeeded", {
    businessId: input.businessId,
    userId: input.userId,
    documentId: document.id,
    captureContext: "general"
  });

  return {
    documentId: document.id,
    status: document.status
  };
}
