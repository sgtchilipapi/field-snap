import { createDocument } from "@/lib/server/data/documents";
import { enqueueDocumentProcessingJob } from "@/lib/server/data/document-processing-jobs";
import { getDriveConnectionForBusiness, updateDriveConnectionStatus } from "@/lib/server/data/drive-connections";
import { AuthFlowError } from "@/lib/server/auth/errors";
import { uploadGoogleDriveFile } from "@/lib/server/integrations/google/drive";
import { decryptSecret } from "@/lib/server/security/encryption";
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

  if (input.file.size === 0) {
    throw new DocumentUploadError("Select an image to upload.", "invalid_file");
  }

  if (input.file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new DocumentUploadError("Image uploads must be 15 MB or smaller.", "file_too_large");
  }

  const mimeType = input.file.type || "application/octet-stream";

  if (!isAcceptedMimeType(mimeType)) {
    throw new DocumentUploadError("Only image uploads are supported.", "invalid_file");
  }

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
    if (error instanceof AuthFlowError) {
      await updateDriveConnectionStatus(input.businessId, "error");
    }

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

  return {
    documentId: document.id,
    status: document.status
  };
}
