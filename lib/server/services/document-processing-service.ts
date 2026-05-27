import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/server/audit/logs";
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
import { getDriveConnectionForBusiness } from "@/lib/server/data/drive-connections";
import { getGeneralFoldersForBusiness } from "@/lib/server/data/general-folders";
import { listJobFolders } from "@/lib/server/data/job-folders";
import { getJobForBusiness } from "@/lib/server/data/jobs";
import { findUserById } from "@/lib/server/data/users";
import type { DocumentRow } from "@/lib/server/db/schema";
import { AuthFlowError } from "@/lib/server/auth/errors";
import type { AIProvider, AllowedTargetFolder } from "@/lib/server/integrations/ai";
import { GeminiAIProvider } from "@/lib/server/integrations/ai";
import {
  getGoogleDriveFileBytes,
  moveGoogleDriveFile,
  renameGoogleDriveFile
} from "@/lib/server/integrations/google/drive";
import { logError, logInfo, logWarn } from "@/lib/server/logger";
import { decryptSecret } from "@/lib/server/security/encryption";
import { getBusinessById } from "@/lib/server/data/businesses";
import { markDriveConnectionIssue } from "@/lib/server/services/drive-connection-health";

const AUTO_FILE_CONFIDENCE_THRESHOLD = 0.95;
const MAX_FILENAME_LENGTH = 120;
const ILLEGAL_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/g;
const MULTISPACE_PATTERN = /\s+/g;

export class DocumentProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: "not_found" | "drive_unavailable" | "invalid_state"
  ) {
    super(message);
  }
}

class DriveMoveError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function sanitizeFilename(filename: string, fallbackExtension?: string | null) {
  const trimmed = filename
    .replace(ILLEGAL_FILENAME_CHARACTERS, "-")
    .replace(MULTISPACE_PATTERN, " ")
    .trim()
    .replace(/\.+$/g, "");

  if (trimmed.length === 0) {
    return null;
  }

  const lastDot = trimmed.lastIndexOf(".");
  const hasExtension = lastDot > 0 && lastDot < trimmed.length - 1;
  const extension = hasExtension
    ? trimmed.slice(lastDot)
    : fallbackExtension && fallbackExtension.startsWith(".")
      ? fallbackExtension
      : "";
  const baseName = hasExtension ? trimmed.slice(0, lastDot) : trimmed;
  const maxBaseLength = Math.max(1, MAX_FILENAME_LENGTH - extension.length);
  const sanitizedBase = baseName.slice(0, maxBaseLength).trim().replace(/\.+$/g, "");

  if (sanitizedBase.length === 0) {
    return null;
  }

  return `${sanitizedBase}${extension}`.slice(0, MAX_FILENAME_LENGTH);
}

function getFileExtension(filename: string | null) {
  if (!filename) {
    return null;
  }

  const lastDot = filename.lastIndexOf(".");

  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return null;
  }

  return filename.slice(lastDot);
}

function shouldRetryAttempt(attempts: number) {
  return attempts < 2;
}

async function requireDriveAccessForBusiness(businessId: string) {
  const connection = await getDriveConnectionForBusiness(businessId);

  if (!connection || connection.status !== "active" || !connection.access_token_encrypted) {
    throw new DocumentProcessingError("An active Google Drive connection is required.", "drive_unavailable");
  }

  return {
    accessToken: decryptSecret(connection.access_token_encrypted)
  };
}

async function loadAllowedFolders(document: DocumentRow) {
  if (document.capture_context === "job") {
    if (!document.job_id) {
      throw new DocumentProcessingError("Job document is missing its job reference.", "invalid_state");
    }

    const folders = await listJobFolders(document.job_id);

    return folders
      .filter((folder) => folder.folder_key !== "in_process")
      .map((folder) => ({
        key: folder.folder_key,
        name: folder.folder_name,
        driveFolderId: folder.drive_folder_id
      }));
  }

  const folders = await getGeneralFoldersForBusiness(document.business_id);

  return folders
    .filter((folder) => folder.folder_key !== "in_process")
    .map((folder) => ({
      key: folder.folder_key,
      name: folder.folder_name,
      driveFolderId: folder.drive_folder_id
    }));
}

async function loadDocumentContext(documentId: string) {
  const document = await getDocumentById(documentId);

  if (!document) {
    throw new DocumentProcessingError("Document not found.", "not_found");
  }

  const [business, uploader, job, allowedFolders] = await Promise.all([
    getBusinessById(document.business_id),
    findUserById(document.uploaded_by_user_id),
    document.job_id ? getJobForBusiness(document.business_id, document.job_id) : Promise.resolve(null),
    loadAllowedFolders(document)
  ]);

  if (!business) {
    throw new DocumentProcessingError("Business not found.", "not_found");
  }

  if (!uploader) {
    throw new DocumentProcessingError("Uploader not found.", "not_found");
  }

  const needsReviewFolder =
    allowedFolders.find((folder) => folder.key === "needs_review") ?? null;

  if (!needsReviewFolder) {
    throw new DocumentProcessingError("Needs Review folder is not available.", "invalid_state");
  }

  return {
    document,
    business,
    uploader,
    job,
    allowedFolders,
    needsReviewFolder
  };
}

async function markDriveConnectionErrorIfNeeded(businessId: string, error: unknown) {
  await markDriveConnectionIssue(businessId, error, { businessId });
}

async function recordRoutingAudit(input: {
  businessId: string;
  actorUserId: string | null;
  documentId: string;
  action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await recordAuditEvent({
    businessId: input.businessId,
    actorUserId: input.actorUserId,
    entityType: "document",
    entityId: input.documentId,
    action: input.action,
    oldValue: input.oldValue,
    newValue: input.newValue
  });
}

async function moveToNeedsReview(input: {
  accessToken: string;
  fileId: string;
  fromFolderId: string;
  toFolderId: string;
}) {
  if (input.fromFolderId === input.toFolderId) {
    return null;
  }

  return moveGoogleDriveFile({
    accessToken: input.accessToken,
    fileId: input.fileId,
    fromFolderId: input.fromFolderId,
    toFolderId: input.toFolderId
  });
}

async function handleAiClassificationOutcome(input: {
  provider: AIProvider;
  accessToken: string;
  document: DocumentRow;
  businessName: string;
  job:
    | {
        client_name: string;
        job_name: string;
        category_name: string;
      }
    | null;
  allowedFolders: Array<AllowedTargetFolder & { driveFolderId: string }>;
}) {
  const fileBytes = await getGoogleDriveFileBytes(input.accessToken, input.document.original_drive_file_id);
  const classification = await input.provider.classifyDocument({
    imageBytes: fileBytes.bytes,
    mimeType: input.document.mime_type ?? "application/octet-stream",
    businessName: input.businessName,
    captureContext: input.document.capture_context,
    job: input.job
      ? {
          clientName: input.job.client_name,
          jobName: input.job.job_name,
          category: input.job.category_name
        }
      : null,
    allowedTargetFolders: input.allowedFolders.map((folder) => ({
      key: folder.key,
      name: folder.name
    }))
  });

  await updateDocumentAiFields({
    documentId: input.document.id,
    documentType: classification.document_type,
    targetFolderKey: classification.target_folder_key,
    vendorOrParty: classification.vendor_or_party,
    documentDate: classification.document_date,
    amount: classification.amount,
    currency: classification.currency,
    invoiceNumber: classification.invoice_number,
    dueDate: classification.due_date,
    aiConfidence: classification.confidence,
    aiNeedsReview: classification.needs_review,
    aiReason: classification.reason,
    aiRawResponse: classification.raw_provider_payload
  });

  return classification;
}

async function finalizeFailedProcessing(input: {
  document: DocumentRow;
  actorUserId: string | null;
  accessToken: string;
  failureReason: "ai_error" | "drive_move_error" | "missing_folder_mapping";
  needsReviewFolderId: string;
  correlationId: string;
  attemptNeedsReviewMove: boolean;
}) {
  let movedFolderId = input.document.current_drive_folder_id;

  if (input.attemptNeedsReviewMove) {
    try {
      const moveResult = await moveToNeedsReview({
        accessToken: input.accessToken,
        fileId: input.document.current_drive_file_id,
        fromFolderId: input.document.current_drive_folder_id,
        toFolderId: input.needsReviewFolderId
      });

      if (moveResult) {
        movedFolderId = input.needsReviewFolderId;
        await recordRoutingAudit({
          businessId: input.document.business_id,
          actorUserId: input.actorUserId,
          documentId: input.document.id,
          action: AUDIT_ACTIONS.documentMoved,
          oldValue: {
            folder_id: input.document.current_drive_folder_id
          },
          newValue: {
            folder_id: input.needsReviewFolderId
          }
        });
      }
    } catch (error) {
      logError("Failed to move document to Needs Review after processing failure", error, {
        documentId: input.document.id,
        correlationId: input.correlationId,
        businessId: input.document.business_id
      });
      await markDriveConnectionErrorIfNeeded(input.document.business_id, error);
    }
  }

  await updateDocumentProcessingState({
    documentId: input.document.id,
    status: "failed",
    currentDriveFolderId: movedFolderId,
    failureReason: input.failureReason
  });
}

export async function processDocumentProcessingJob(
  input: {
    documentId: string;
    correlationId: string;
    attempts: number;
  },
  provider: AIProvider
) {
  const context = await loadDocumentContext(input.documentId);
  const { accessToken } = await requireDriveAccessForBusiness(context.business.id);

  await updateDocumentProcessingState({
    documentId: context.document.id,
    status: "ai_processing",
    failureReason: null
  });

  try {
    const classification = await handleAiClassificationOutcome({
      provider,
      accessToken,
      document: context.document,
      businessName: context.business.name,
      job: context.job,
      allowedFolders: context.allowedFolders
    });

    await recordRoutingAudit({
      businessId: context.business.id,
      actorUserId: null,
      documentId: context.document.id,
      action: AUDIT_ACTIONS.documentAiClassified,
      newValue: {
        document_type: classification.document_type,
        target_folder_key: classification.target_folder_key,
        confidence: classification.confidence,
        valid: classification.valid
      }
    });

    if (!classification.valid) {
      logWarn("AI invalid response", {
        businessId: context.business.id,
        documentId: context.document.id,
        correlationId: input.correlationId
      });
    } else {
      logInfo("AI classification succeeded", {
        businessId: context.business.id,
        documentId: context.document.id,
        correlationId: input.correlationId,
        targetFolderKey: classification.target_folder_key,
        confidence: classification.confidence
      });
    }

    const targetFolder = context.allowedFolders.find(
      (folder) => folder.key === classification.target_folder_key
    );

    const shouldAutoFile =
      classification.valid &&
      classification.confidence >= AUTO_FILE_CONFIDENCE_THRESHOLD &&
      classification.target_folder_key !== "needs_review" &&
      Boolean(targetFolder);

    const destinationFolderId = shouldAutoFile
      ? targetFolder?.driveFolderId
      : context.needsReviewFolder.driveFolderId;
    const nextStatus: DocumentRow["status"] = shouldAutoFile ? "auto_filed" : "needs_review";

    if (!destinationFolderId) {
      throw new DocumentProcessingError("Destination folder is unavailable.", "invalid_state");
    }

    let moveResult: { id: string; name: string } | null = null;

    try {
      moveResult = await moveToNeedsReview({
        accessToken,
        fileId: context.document.current_drive_file_id,
        fromFolderId: context.document.current_drive_folder_id,
        toFolderId: destinationFolderId
      });
    } catch (error) {
      logWarn("Drive move failed", {
        businessId: context.business.id,
        documentId: context.document.id,
        correlationId: input.correlationId
      });
      throw new DriveMoveError(error instanceof Error ? error.message : "Drive move failed.");
    }

    if (moveResult) {
      await recordRoutingAudit({
        businessId: context.business.id,
        actorUserId: null,
        documentId: context.document.id,
        action: AUDIT_ACTIONS.documentMoved,
        oldValue: {
          folder_id: context.document.current_drive_folder_id
        },
        newValue: {
          folder_id: destinationFolderId
        }
      });
    }

    let currentFilename = moveResult?.name ?? context.document.current_filename;
    const sanitizedFilename =
      shouldAutoFile && classification.suggested_filename
        ? sanitizeFilename(
            classification.suggested_filename,
            getFileExtension(context.document.current_filename)
          )
        : null;

    if (sanitizedFilename && sanitizedFilename !== currentFilename) {
      const renamed = await renameGoogleDriveFile({
        accessToken,
        fileId: context.document.current_drive_file_id,
        filename: sanitizedFilename
      });
      currentFilename = renamed.name;

      await recordRoutingAudit({
        businessId: context.business.id,
        actorUserId: null,
        documentId: context.document.id,
        action: AUDIT_ACTIONS.documentRenamed,
        oldValue: {
          filename: context.document.current_filename
        },
        newValue: {
          filename: currentFilename
        }
      });
    }

    await updateDocumentProcessingState({
      documentId: context.document.id,
      status: nextStatus,
      currentDriveFolderId: destinationFolderId,
      currentFilename,
      failureReason: null
    });

    if (shouldAutoFile) {
      await recordRoutingAudit({
        businessId: context.business.id,
        actorUserId: null,
        documentId: context.document.id,
        action: AUDIT_ACTIONS.documentAutoFiled,
        newValue: {
          status: nextStatus,
          target_folder_key: classification.target_folder_key,
          confidence: classification.confidence,
          valid: classification.valid
        }
      });
    }

    logInfo("Document routing completed", {
      businessId: context.business.id,
      documentId: context.document.id,
      correlationId: input.correlationId,
      status: nextStatus
    });

    return {
      status: nextStatus
    };
  } catch (error) {
    await markDriveConnectionErrorIfNeeded(context.business.id, error);

    const isDriveOrProviderError =
      error instanceof AuthFlowError ||
      error instanceof Error;

    const failureReason =
      error instanceof AuthFlowError && error.message.includes("file move")
        ? "drive_move_error"
        : error instanceof Error && error.message.includes("file move")
          ? "drive_move_error"
          : "ai_error";

    logWarn(
      failureReason === "drive_move_error" ? "Drive move failed" : "AI classification failed",
      {
        businessId: context.business.id,
        documentId: context.document.id,
        correlationId: input.correlationId
      }
    );

    await finalizeFailedProcessing({
      document: context.document,
      actorUserId: context.document.uploaded_by_user_id,
      accessToken,
      failureReason,
      needsReviewFolderId: context.needsReviewFolder.driveFolderId,
      correlationId: input.correlationId,
      attemptNeedsReviewMove: failureReason === "ai_error"
    });

    if (
      isDriveOrProviderError &&
      !(error instanceof DocumentProcessingError) &&
      shouldRetryAttempt(input.attempts)
    ) {
      throw error;
    }

    return {
      status: "failed" as const
    };
  }
}

async function settleUnrecoverableDocumentFailure(input: {
  documentId: string;
  queueJobId: string;
  correlationId: string;
}) {
  const document = await getDocumentById(input.documentId);

  if (!document) {
    return;
  }

  await updateDocumentProcessingState({
    documentId: input.documentId,
    status: "failed",
    failureReason: "missing_folder_mapping"
  });

  logWarn("Document processing settled after unrecoverable worker failure", {
    businessId: document.business_id,
    documentId: input.documentId,
    queueJobId: input.queueJobId,
    correlationId: input.correlationId
  });
}

export async function runNextDocumentProcessingJob(provider: AIProvider = new GeminiAIProvider()) {
  const job = await claimNextDocumentProcessingJob();

  if (!job) {
    return null;
  }

  try {
    const result = await processDocumentProcessingJob(
      {
        documentId: job.document_id,
        correlationId: job.correlation_id,
        attempts: job.attempts
      },
      provider
    );

    if (result.status === "failed") {
      await failDocumentProcessingJob(job.id);
    } else {
      await completeDocumentProcessingJob(job.id);
    }

    return {
      jobId: job.id,
      documentId: job.document_id,
      status: result.status
    };
  } catch (error) {
    logError("Document processing job failed", error, {
      queueJobId: job.id,
      documentId: job.document_id,
      correlationId: job.correlation_id,
      attempts: job.attempts
    });

    if (!(error instanceof DocumentProcessingError) && shouldRetryAttempt(job.attempts)) {
      await retryDocumentProcessingJob(job.id);

      return {
        jobId: job.id,
        documentId: job.document_id,
        status: "retried" as const
      };
    }

    await settleUnrecoverableDocumentFailure({
      documentId: job.document_id,
      queueJobId: job.id,
      correlationId: job.correlation_id
    });

    await failDocumentProcessingJob(job.id);

    return {
      jobId: job.id,
      documentId: job.document_id,
      status: "failed" as const
    };
  }
}
