import { z } from "zod";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import { createAuditLog, listAuditLogsForEntity } from "@/lib/server/audit/logs";
import { AuthFlowError } from "@/lib/server/auth/errors";
import { JOB_FOLDER_TEMPLATES, GENERAL_FOLDER_TEMPLATES } from "@/lib/server/constants/folder-template";
import { getDriveConnectionForBusiness, updateDriveConnectionStatus } from "@/lib/server/data/drive-connections";
import {
  getDocumentForBusiness,
  listDocumentsForBusiness,
  updateDocumentReviewFields
} from "@/lib/server/data/documents";
import { getGeneralFoldersForBusiness } from "@/lib/server/data/general-folders";
import { listJobFolders } from "@/lib/server/data/job-folders";
import { getJobForBusiness, listJobsForBusiness } from "@/lib/server/data/jobs";
import type { DocumentRow } from "@/lib/server/db/schema";
import { getGoogleDriveFileBytes, moveGoogleDriveFile } from "@/lib/server/integrations/google/drive";
import { decryptSecret } from "@/lib/server/security/encryption";
const ALLOWED_DOCUMENT_STATUS_FILTERS = new Set<DocumentRow["status"]>([
  "uploaded_to_in_process",
  "ai_processing",
  "auto_filed",
  "needs_review",
  "reviewed",
  "failed"
]);

export class ReviewServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "forbidden"
      | "not_found"
      | "invalid_filter"
      | "drive_unavailable"
      | "invalid_review"
  ) {
    super(message);
  }
}

const metadataSchema = z.object({
  document_type: z.string().trim().max(120, "Document type must be 120 characters or fewer.").nullable().optional(),
  vendor_or_party: z.string().trim().max(120, "Vendor or party must be 120 characters or fewer.").nullable().optional(),
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Document date must use YYYY-MM-DD.").nullable().optional(),
  amount: z
    .union([z.number(), z.string().trim().regex(/^-?\d+(\.\d{1,2})?$/, "Amount must be a valid number.")])
    .nullable()
    .optional(),
  currency: z.string().trim().max(12, "Currency must be 12 characters or fewer.").nullable().optional(),
  invoice_number: z.string().trim().max(120, "Invoice number must be 120 characters or fewer.").nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must use YYYY-MM-DD.").nullable().optional()
});

const patchDocumentReviewSchema = metadataSchema.extend({
  job_id: z.string().uuid("Job selection is invalid.").nullable().optional(),
  target_folder_key: z.string().trim().min(1, "Target folder is required."),
  mark_reviewed: z.boolean().optional()
});

const markReviewedSchema = z.object({
  mark_reviewed: z.literal(true)
});

async function requireReviewAccess(businessId: string, userId: string) {
  const authorization = await authorizeBusinessAccess({
    businessId,
    userId,
    capability: "review:access"
  });

  if (!authorization.allowed) {
    throw new ReviewServiceError("Forbidden", "forbidden");
  }

  return authorization.details;
}

async function requireDriveAccessForBusiness(businessId: string) {
  const connection = await getDriveConnectionForBusiness(businessId);

  if (!connection || connection.status !== "active" || !connection.access_token_encrypted) {
    throw new ReviewServiceError("An active Google Drive connection is required.", "drive_unavailable");
  }

  return {
    accessToken: decryptSecret(connection.access_token_encrypted)
  };
}

function normalizeStatusFilter(status: string | null | undefined) {
  if (!status) {
    return null;
  }

  if (!ALLOWED_DOCUMENT_STATUS_FILTERS.has(status as DocumentRow["status"])) {
    throw new ReviewServiceError("Status filter is invalid.", "invalid_filter");
  }

  return status as DocumentRow["status"];
}

export async function getReviewAccessForUser(businessId: string, userId: string) {
  const authorization = await authorizeBusinessAccess({
    businessId,
    userId,
    capability: "review:access"
  });

  if (!authorization.allowed) {
    return null;
  }

  return authorization.details;
}

function normalizeNullableText(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAmount(value: string | number | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const numericValue = typeof value === "number" ? value : Number(value.trim());
  return Number.isNaN(numericValue) ? undefined : numericValue;
}

function getAllowedFolderKeysForContext(captureContext: "job" | "general") {
  if (captureContext === "job") {
    return JOB_FOLDER_TEMPLATES.filter((folder) => folder.key !== "in_process").map((folder) => folder.key) as string[];
  }

  return GENERAL_FOLDER_TEMPLATES.filter((folder) => folder.key !== "in_process").map((folder) => folder.key) as string[];
}

async function resolveDestinationFolder(input: {
  businessId: string;
  jobId: string | null;
  captureContext: "job" | "general";
  targetFolderKey: string;
}) {
  const allowedFolderKeys = new Set(getAllowedFolderKeysForContext(input.captureContext));

  if (!allowedFolderKeys.has(input.targetFolderKey)) {
    throw new ReviewServiceError("Target folder is invalid for the selected context.", "invalid_review");
  }

  if (input.captureContext === "job") {
    if (!input.jobId) {
      throw new ReviewServiceError("Select a job when routing to a job folder.", "invalid_review");
    }

    const job = await getJobForBusiness(input.businessId, input.jobId);

    if (!job) {
      throw new ReviewServiceError("Selected job was not found.", "invalid_review");
    }

    const folders = await listJobFolders(input.jobId);
    const destinationFolder = folders.find((folder) => folder.folder_key === input.targetFolderKey);

    if (!destinationFolder) {
      throw new ReviewServiceError("Selected job folder is unavailable.", "invalid_review");
    }

    return {
      jobId: job.id,
      captureContext: "job" as const,
      driveFolderId: destinationFolder.drive_folder_id
    };
  }

  const folders = await getGeneralFoldersForBusiness(input.businessId);
  const destinationFolder = folders.find((folder) => folder.folder_key === input.targetFolderKey);

  if (!destinationFolder) {
    throw new ReviewServiceError("Selected business folder is unavailable.", "invalid_review");
  }

  return {
    jobId: null,
    captureContext: "general" as const,
    driveFolderId: destinationFolder.drive_folder_id
  };
}

export async function listNeedsReviewDocumentsForUser(input: {
  businessId: string;
  userId: string;
  limit?: number;
}) {
  const details = await requireReviewAccess(input.businessId, input.userId);
  const documents = await listDocumentsForBusiness({
    businessId: input.businessId,
    statuses: ["needs_review"],
    limit: input.limit ?? 50
  });

  return {
    membership: details.membership,
    business: details.business,
    documents
  };
}

export async function listBusinessDocumentsForUser(input: {
  businessId: string;
  userId: string;
  status?: string | null;
  limit?: number;
}) {
  const details = await requireReviewAccess(input.businessId, input.userId);
  const normalizedStatus = normalizeStatusFilter(input.status);
  const documents = await listDocumentsForBusiness({
    businessId: input.businessId,
    statuses: normalizedStatus ? [normalizedStatus] : undefined,
    limit: input.limit ?? 50
  });

  return {
    membership: details.membership,
    business: details.business,
    documents
  };
}

export async function getDocumentDetailForUser(input: {
  businessId: string;
  documentId: string;
  userId: string;
}) {
  const details = await requireReviewAccess(input.businessId, input.userId);
  const document = await getDocumentForBusiness(input.businessId, input.documentId);

  if (!document) {
    throw new ReviewServiceError("Not found", "not_found");
  }

  const auditLogs = await listAuditLogsForEntity({
    businessId: input.businessId,
    entityType: "document",
    entityId: input.documentId
  });

  const [jobs] = await Promise.all([
    listJobsForBusiness({
      businessId: input.businessId,
      status: "all"
    })
  ]);

  return {
    membership: details.membership,
    business: details.business,
    document,
    auditLogs,
    jobs,
    availableJobFolders: JOB_FOLDER_TEMPLATES.filter((folder) => folder.key !== "in_process"),
    availableGeneralFolders: GENERAL_FOLDER_TEMPLATES.filter((folder) => folder.key !== "in_process")
  };
}

export async function getDocumentPreviewForUser(input: {
  businessId: string;
  documentId: string;
  userId: string;
}) {
  await requireReviewAccess(input.businessId, input.userId);

  const document = await getDocumentForBusiness(input.businessId, input.documentId);

  if (!document) {
    throw new ReviewServiceError("Not found", "not_found");
  }

  const { accessToken } = await requireDriveAccessForBusiness(input.businessId);

  try {
    const file = await getGoogleDriveFileBytes(accessToken, document.current_drive_file_id);

    return {
      document,
      bytes: file.bytes
    };
  } catch (error) {
    if (error instanceof AuthFlowError) {
      await updateDriveConnectionStatus(input.businessId, "error");
    }

    throw new ReviewServiceError("Document preview is temporarily unavailable.", "drive_unavailable");
  }
}

async function updateDriveConnectionStatusIfNeeded(businessId: string, error: unknown) {
  if (error instanceof AuthFlowError) {
    await updateDriveConnectionStatus(businessId, "error");
  }
}

export async function patchDocumentForReview(input: {
  businessId: string;
  documentId: string;
  userId: string;
  values: unknown;
}) {
  await requireReviewAccess(input.businessId, input.userId);

  const document = await getDocumentForBusiness(input.businessId, input.documentId);

  if (!document) {
    throw new ReviewServiceError("Not found", "not_found");
  }

  const parsed = patchDocumentReviewSchema.parse(input.values);
  const targetCaptureContext = parsed.job_id ? "job" : "general";
  const destination = await resolveDestinationFolder({
    businessId: input.businessId,
    jobId: parsed.job_id ?? null,
    captureContext: targetCaptureContext,
    targetFolderKey: parsed.target_folder_key
  });

  const metadataUpdates = {
    documentType: normalizeNullableText(parsed.document_type),
    vendorOrParty: normalizeNullableText(parsed.vendor_or_party),
    documentDate: parsed.document_date === undefined ? undefined : parsed.document_date,
    amount: normalizeAmount(parsed.amount),
    currency: normalizeNullableText(parsed.currency),
    invoiceNumber: normalizeNullableText(parsed.invoice_number),
    dueDate: parsed.due_date === undefined ? undefined : parsed.due_date
  };

  const metadataChangedFields: Record<string, { old: string | null; new: string | null }> = {};
  const trackMetadataChange = (key: string, oldValue: string | null, newValue: string | number | null | undefined) => {
    if (newValue === undefined) {
      return;
    }

    const normalizedNewValue = newValue === null ? null : String(newValue);

    if ((oldValue ?? null) !== normalizedNewValue) {
      metadataChangedFields[key] = {
        old: oldValue ?? null,
        new: normalizedNewValue
      };
    }
  };

  trackMetadataChange("document_type", document.document_type, metadataUpdates.documentType);
  trackMetadataChange("vendor_or_party", document.vendor_or_party, metadataUpdates.vendorOrParty);
  trackMetadataChange("document_date", document.document_date, metadataUpdates.documentDate);
  trackMetadataChange("amount", document.amount, metadataUpdates.amount);
  trackMetadataChange("currency", document.currency, metadataUpdates.currency);
  trackMetadataChange("invoice_number", document.invoice_number, metadataUpdates.invoiceNumber);
  trackMetadataChange("due_date", document.due_date, metadataUpdates.dueDate);

  const requiresMove = document.current_drive_folder_id !== destination.driveFolderId;

  if (requiresMove) {
    const { accessToken } = await requireDriveAccessForBusiness(input.businessId);

    try {
      await moveGoogleDriveFile({
        accessToken,
        fileId: document.current_drive_file_id,
        fromFolderId: document.current_drive_folder_id,
        toFolderId: destination.driveFolderId
      });
    } catch (error) {
      await updateDriveConnectionStatusIfNeeded(input.businessId, error);
      throw new ReviewServiceError("Field-Snap could not move the document in Google Drive.", "drive_unavailable");
    }
  }

  const nextStatus = parsed.mark_reviewed ? "reviewed" : document.status;

  await updateDocumentReviewFields({
    documentId: input.documentId,
    jobId: destination.jobId,
    captureContext: destination.captureContext,
    currentDriveFolderId: destination.driveFolderId,
    status: nextStatus,
    targetFolderKey: parsed.target_folder_key,
    documentType: metadataUpdates.documentType,
    vendorOrParty: metadataUpdates.vendorOrParty,
    documentDate: metadataUpdates.documentDate,
    amount: metadataUpdates.amount,
    currency: metadataUpdates.currency,
    invoiceNumber: metadataUpdates.invoiceNumber,
    dueDate: metadataUpdates.dueDate,
    failureReason: parsed.mark_reviewed ? null : undefined
  });

  if (
    document.job_id !== destination.jobId ||
    document.current_drive_folder_id !== destination.driveFolderId ||
    document.capture_context !== destination.captureContext
  ) {
    await createAuditLog({
      businessId: input.businessId,
      actorUserId: input.userId,
      entityType: "document",
      entityId: input.documentId,
      action: "document.moved",
      oldValue: {
        job_id: document.job_id,
        capture_context: document.capture_context,
        folder_id: document.current_drive_folder_id,
        target_folder_key: document.target_folder_key ?? document.current_folder_key
      },
      newValue: {
        job_id: destination.jobId,
        capture_context: destination.captureContext,
        folder_id: destination.driveFolderId,
        target_folder_key: parsed.target_folder_key
      }
    });
  }

  if (Object.keys(metadataChangedFields).length > 0) {
    await createAuditLog({
      businessId: input.businessId,
      actorUserId: input.userId,
      entityType: "document",
      entityId: input.documentId,
      action: "document.metadata_updated",
      oldValue: Object.fromEntries(
        Object.entries(metadataChangedFields).map(([key, value]) => [key, value.old])
      ),
      newValue: Object.fromEntries(
        Object.entries(metadataChangedFields).map(([key, value]) => [key, value.new])
      )
    });
  }

  if (parsed.mark_reviewed && document.status !== "reviewed") {
    await createAuditLog({
      businessId: input.businessId,
      actorUserId: input.userId,
      entityType: "document",
      entityId: input.documentId,
      action: "document.reviewed",
      oldValue: {
        status: document.status
      },
      newValue: {
        status: "reviewed"
      }
    });
  }

  return getDocumentDetailForUser({
    businessId: input.businessId,
    documentId: input.documentId,
    userId: input.userId
  });
}

export async function markDocumentReviewedForUser(input: {
  businessId: string;
  documentId: string;
  userId: string;
  values?: unknown;
}) {
  await requireReviewAccess(input.businessId, input.userId);

  if (input.values !== undefined) {
    markReviewedSchema.parse(input.values);
  }

  const document = await getDocumentForBusiness(input.businessId, input.documentId);

  if (!document) {
    throw new ReviewServiceError("Not found", "not_found");
  }

  const targetFolderKey = document.target_folder_key ?? document.current_folder_key;

  if (!targetFolderKey) {
    throw new ReviewServiceError("Select a destination folder before marking the document reviewed.", "invalid_review");
  }

  return patchDocumentForReview({
    businessId: input.businessId,
    documentId: input.documentId,
    userId: input.userId,
    values: {
      target_folder_key: targetFolderKey,
      job_id: document.job_id,
      mark_reviewed: true
    }
  });
}
