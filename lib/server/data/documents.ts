import { db } from "@/lib/server/db/client";
import type { DocumentRow } from "@/lib/server/db/schema";

function mapDocument(row: DocumentRow): DocumentRow {
  return {
    ...row
  };
}

export async function createDocument(input: {
  businessId: string;
  jobId: string | null;
  uploadedByUserId: string;
  captureContext: "job" | "general";
  originalDriveFileId: string;
  currentDriveFileId: string;
  currentDriveFolderId: string;
  originalFilename: string | null;
  currentFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  status:
    | "uploaded_to_in_process"
    | "ai_processing"
    | "auto_filed"
    | "needs_review"
    | "reviewed"
    | "failed";
}) {
  const rows = await db<DocumentRow[]>`
    insert into documents (
      business_id,
      job_id,
      uploaded_by_user_id,
      capture_context,
      original_drive_file_id,
      current_drive_file_id,
      current_drive_folder_id,
      original_filename,
      current_filename,
      mime_type,
      file_size_bytes,
      status
    )
    values (
      ${input.businessId},
      ${input.jobId},
      ${input.uploadedByUserId},
      ${input.captureContext},
      ${input.originalDriveFileId},
      ${input.currentDriveFileId},
      ${input.currentDriveFolderId},
      ${input.originalFilename},
      ${input.currentFilename},
      ${input.mimeType},
      ${input.fileSizeBytes},
      ${input.status}
    )
    returning
      id,
      business_id,
      job_id,
      uploaded_by_user_id,
      capture_context,
      original_drive_file_id,
      current_drive_file_id,
      current_drive_folder_id,
      original_filename,
      current_filename,
      mime_type,
      file_size_bytes,
      status,
      document_type,
      target_folder_key,
      vendor_or_party,
      document_date::text as document_date,
      amount::text as amount,
      currency,
      invoice_number,
      due_date::text as due_date,
      ai_confidence::text as ai_confidence,
      ai_needs_review,
      ai_reason,
      ai_raw_response,
      failure_reason,
      created_at,
      updated_at
  `;

  return mapDocument(rows[0]);
}

export async function getDocumentById(documentId: string) {
  const rows = await db<DocumentRow[]>`
    select
      id,
      business_id,
      job_id,
      uploaded_by_user_id,
      capture_context,
      original_drive_file_id,
      current_drive_file_id,
      current_drive_folder_id,
      original_filename,
      current_filename,
      mime_type,
      file_size_bytes,
      status,
      document_type,
      target_folder_key,
      vendor_or_party,
      document_date::text as document_date,
      amount::text as amount,
      currency,
      invoice_number,
      due_date::text as due_date,
      ai_confidence::text as ai_confidence,
      ai_needs_review,
      ai_reason,
      ai_raw_response,
      failure_reason,
      created_at,
      updated_at
    from documents
    where id = ${documentId}
    limit 1
  `;

  return rows[0] ? mapDocument(rows[0]) : null;
}

export async function updateDocumentAiFields(input: {
  documentId: string;
  documentType: string;
  targetFolderKey: string;
  vendorOrParty: string | null;
  documentDate: string | null;
  amount: number | null;
  currency: string | null;
  invoiceNumber: string | null;
  dueDate: string | null;
  aiConfidence: number;
  aiNeedsReview: boolean;
  aiReason: string;
  aiRawResponse: unknown;
}) {
  const aiRawResponseJson = JSON.stringify(input.aiRawResponse ?? null);

  const rows = await db<DocumentRow[]>`
    update documents
    set
      document_type = ${input.documentType},
      target_folder_key = ${input.targetFolderKey},
      vendor_or_party = ${input.vendorOrParty},
      document_date = ${input.documentDate},
      amount = ${input.amount},
      currency = ${input.currency},
      invoice_number = ${input.invoiceNumber},
      due_date = ${input.dueDate},
      ai_confidence = ${input.aiConfidence},
      ai_needs_review = ${input.aiNeedsReview},
      ai_reason = ${input.aiReason},
      ai_raw_response = ${aiRawResponseJson}::jsonb,
      updated_at = now()
    where id = ${input.documentId}
    returning
      id,
      business_id,
      job_id,
      uploaded_by_user_id,
      capture_context,
      original_drive_file_id,
      current_drive_file_id,
      current_drive_folder_id,
      original_filename,
      current_filename,
      mime_type,
      file_size_bytes,
      status,
      document_type,
      target_folder_key,
      vendor_or_party,
      document_date::text as document_date,
      amount::text as amount,
      currency,
      invoice_number,
      due_date::text as due_date,
      ai_confidence::text as ai_confidence,
      ai_needs_review,
      ai_reason,
      ai_raw_response,
      failure_reason,
      created_at,
      updated_at
  `;

  return rows[0] ? mapDocument(rows[0]) : null;
}

export async function updateDocumentProcessingState(input: {
  documentId: string;
  status: DocumentRow["status"];
  currentDriveFolderId?: string;
  currentFilename?: string | null;
  failureReason?: string | null;
}) {
  const currentDriveFolderId = input.currentDriveFolderId ?? null;
  const currentFilename = input.currentFilename === undefined ? null : input.currentFilename;
  const shouldUpdateFilename = input.currentFilename !== undefined;

  const rows = await db<DocumentRow[]>`
    update documents
    set
      status = ${input.status},
      current_drive_folder_id = coalesce(${currentDriveFolderId}, current_drive_folder_id),
      current_filename = case
        when ${shouldUpdateFilename} then ${currentFilename}
        else current_filename
      end,
      failure_reason = ${input.failureReason ?? null},
      updated_at = now()
    where id = ${input.documentId}
    returning
      id,
      business_id,
      job_id,
      uploaded_by_user_id,
      capture_context,
      original_drive_file_id,
      current_drive_file_id,
      current_drive_folder_id,
      original_filename,
      current_filename,
      mime_type,
      file_size_bytes,
      status,
      document_type,
      target_folder_key,
      vendor_or_party,
      document_date::text as document_date,
      amount::text as amount,
      currency,
      invoice_number,
      due_date::text as due_date,
      ai_confidence::text as ai_confidence,
      ai_needs_review,
      ai_reason,
      ai_raw_response,
      failure_reason,
      created_at,
      updated_at
  `;

  return rows[0] ? mapDocument(rows[0]) : null;
}
