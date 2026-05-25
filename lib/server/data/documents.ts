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
