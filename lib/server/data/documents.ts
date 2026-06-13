import { db } from "@/lib/server/db/client";
import type { DocumentRow } from "@/lib/server/db/schema";

export type DocumentListItemRow = DocumentRow & {
  current_folder_key: string | null;
  current_folder_name: string | null;
  uploader_name: string | null;
  uploader_email: string;
  job_client_name: string | null;
  job_job_name: string | null;
  job_category_name: string | null;
};

function mapDocument(row: DocumentRow): DocumentRow {
  return {
    ...row,
  };
}

function mapDocumentListItem(row: DocumentListItemRow): DocumentListItemRow {
  return {
    ...mapDocument(row),
    current_folder_key: row.current_folder_key,
    current_folder_name: row.current_folder_name,
    uploader_name: row.uploader_name,
    uploader_email: row.uploader_email,
    job_client_name: row.job_client_name,
    job_job_name: row.job_job_name,
    job_category_name: row.job_category_name,
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

export async function listDocumentsForBusiness(input: {
  businessId: string;
  statuses?: DocumentRow["status"][];
  limit?: number;
}) {
  const statuses = input.statuses?.length ? input.statuses : null;
  const limit = input.limit ?? 50;

  const rows = await db<DocumentListItemRow[]>`
    select
      d.id,
      d.business_id,
      d.job_id,
      d.uploaded_by_user_id,
      d.capture_context,
      d.original_drive_file_id,
      d.current_drive_file_id,
      d.current_drive_folder_id,
      d.original_filename,
      d.current_filename,
      d.mime_type,
      d.file_size_bytes,
      d.status,
      d.document_type,
      d.target_folder_key,
      d.vendor_or_party,
      d.document_date::text as document_date,
      d.amount::text as amount,
      d.currency,
      d.invoice_number,
      d.due_date::text as due_date,
      d.ai_confidence::text as ai_confidence,
      d.ai_needs_review,
      d.ai_reason,
      d.ai_raw_response,
      d.failure_reason,
      d.created_at,
      d.updated_at,
      coalesce(jf.folder_key, gf.folder_key) as current_folder_key,
      coalesce(jf.folder_name, gf.folder_name) as current_folder_name,
      u.name as uploader_name,
      u.email as uploader_email,
      j.client_name as job_client_name,
      j.job_name as job_job_name,
      c.name as job_category_name
    from documents d
    inner join users u on u.id = d.uploaded_by_user_id
    left join jobs j on j.id = d.job_id
    left join categories c on c.id = j.category_id
    left join job_folders jf
      on d.capture_context = 'job'
      and jf.job_id = d.job_id
      and jf.drive_folder_id = d.current_drive_folder_id
    left join general_folders gf
      on d.capture_context = 'general'
      and gf.business_id = d.business_id
      and gf.drive_folder_id = d.current_drive_folder_id
    where d.business_id = ${input.businessId}
      and (${statuses}::text[] is null or d.status = any(${statuses}::text[]))
    order by d.created_at desc
    limit ${limit}
  `;

  return rows.map(mapDocumentListItem);
}

export async function listDocumentsForJob(input: {
  businessId: string;
  jobId: string;
  limit?: number;
}) {
  const limit = input.limit ?? 100;

  const rows = await db<DocumentListItemRow[]>`
    select
      d.id,
      d.business_id,
      d.job_id,
      d.uploaded_by_user_id,
      d.capture_context,
      d.original_drive_file_id,
      d.current_drive_file_id,
      d.current_drive_folder_id,
      d.original_filename,
      d.current_filename,
      d.mime_type,
      d.file_size_bytes,
      d.status,
      d.document_type,
      d.target_folder_key,
      d.vendor_or_party,
      d.document_date::text as document_date,
      d.amount::text as amount,
      d.currency,
      d.invoice_number,
      d.due_date::text as due_date,
      d.ai_confidence::text as ai_confidence,
      d.ai_needs_review,
      d.ai_reason,
      d.ai_raw_response,
      d.failure_reason,
      d.created_at,
      d.updated_at,
      jf.folder_key as current_folder_key,
      jf.folder_name as current_folder_name,
      u.name as uploader_name,
      u.email as uploader_email,
      j.client_name as job_client_name,
      j.job_name as job_job_name,
      c.name as job_category_name
    from documents d
    inner join users u on u.id = d.uploaded_by_user_id
    inner join jobs j on j.id = d.job_id
    left join categories c on c.id = j.category_id
    left join job_folders jf
      on jf.job_id = d.job_id
      and jf.drive_folder_id = d.current_drive_folder_id
    where d.business_id = ${input.businessId}
      and d.job_id = ${input.jobId}
    order by d.created_at desc
    limit ${limit}
  `;

  return rows.map(mapDocumentListItem);
}

export async function getDocumentForBusiness(
  businessId: string,
  documentId: string,
) {
  const rows = await db<DocumentListItemRow[]>`
    select
      d.id,
      d.business_id,
      d.job_id,
      d.uploaded_by_user_id,
      d.capture_context,
      d.original_drive_file_id,
      d.current_drive_file_id,
      d.current_drive_folder_id,
      d.original_filename,
      d.current_filename,
      d.mime_type,
      d.file_size_bytes,
      d.status,
      d.document_type,
      d.target_folder_key,
      d.vendor_or_party,
      d.document_date::text as document_date,
      d.amount::text as amount,
      d.currency,
      d.invoice_number,
      d.due_date::text as due_date,
      d.ai_confidence::text as ai_confidence,
      d.ai_needs_review,
      d.ai_reason,
      d.ai_raw_response,
      d.failure_reason,
      d.created_at,
      d.updated_at,
      coalesce(jf.folder_key, gf.folder_key) as current_folder_key,
      coalesce(jf.folder_name, gf.folder_name) as current_folder_name,
      u.name as uploader_name,
      u.email as uploader_email,
      j.client_name as job_client_name,
      j.job_name as job_job_name,
      c.name as job_category_name
    from documents d
    inner join users u on u.id = d.uploaded_by_user_id
    left join jobs j on j.id = d.job_id
    left join categories c on c.id = j.category_id
    left join job_folders jf
      on d.capture_context = 'job'
      and jf.job_id = d.job_id
      and jf.drive_folder_id = d.current_drive_folder_id
    left join general_folders gf
      on d.capture_context = 'general'
      and gf.business_id = d.business_id
      and gf.drive_folder_id = d.current_drive_folder_id
    where d.business_id = ${businessId}
      and d.id = ${documentId}
    limit 1
  `;

  return rows[0] ? mapDocumentListItem(rows[0]) : null;
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
  const currentFilename =
    input.currentFilename === undefined ? null : input.currentFilename;
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

export async function updateDocumentReviewFields(input: {
  documentId: string;
  jobId?: string | null;
  captureContext?: "job" | "general";
  currentDriveFolderId?: string;
  status?: DocumentRow["status"];
  targetFolderKey?: string | null;
  documentType?: string | null;
  vendorOrParty?: string | null;
  documentDate?: string | null;
  amount?: number | null;
  currency?: string | null;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  failureReason?: string | null;
}) {
  const shouldUpdateJobId = Object.prototype.hasOwnProperty.call(
    input,
    "jobId",
  );
  const shouldUpdateCaptureContext = Object.prototype.hasOwnProperty.call(
    input,
    "captureContext",
  );
  const shouldUpdateCurrentDriveFolderId = Object.prototype.hasOwnProperty.call(
    input,
    "currentDriveFolderId",
  );
  const shouldUpdateStatus = Object.prototype.hasOwnProperty.call(
    input,
    "status",
  );
  const shouldUpdateTargetFolderKey = Object.prototype.hasOwnProperty.call(
    input,
    "targetFolderKey",
  );
  const shouldUpdateDocumentType = Object.prototype.hasOwnProperty.call(
    input,
    "documentType",
  );
  const shouldUpdateVendorOrParty = Object.prototype.hasOwnProperty.call(
    input,
    "vendorOrParty",
  );
  const shouldUpdateDocumentDate = Object.prototype.hasOwnProperty.call(
    input,
    "documentDate",
  );
  const shouldUpdateAmount = Object.prototype.hasOwnProperty.call(
    input,
    "amount",
  );
  const shouldUpdateCurrency = Object.prototype.hasOwnProperty.call(
    input,
    "currency",
  );
  const shouldUpdateInvoiceNumber = Object.prototype.hasOwnProperty.call(
    input,
    "invoiceNumber",
  );
  const shouldUpdateDueDate = Object.prototype.hasOwnProperty.call(
    input,
    "dueDate",
  );
  const shouldUpdateFailureReason = Object.prototype.hasOwnProperty.call(
    input,
    "failureReason",
  );

  const rows = await db<DocumentRow[]>`
    update documents
    set
      job_id = case
        when ${shouldUpdateJobId} then ${input.jobId ?? null}
        else job_id
      end,
      capture_context = case
        when ${shouldUpdateCaptureContext} then ${input.captureContext ?? null}
        else capture_context
      end,
      current_drive_folder_id = case
        when ${shouldUpdateCurrentDriveFolderId} then ${input.currentDriveFolderId ?? null}
        else current_drive_folder_id
      end,
      status = case
        when ${shouldUpdateStatus} then ${input.status ?? null}
        else status
      end,
      target_folder_key = case
        when ${shouldUpdateTargetFolderKey} then ${input.targetFolderKey ?? null}
        else target_folder_key
      end,
      document_type = case
        when ${shouldUpdateDocumentType} then ${input.documentType ?? null}
        else document_type
      end,
      vendor_or_party = case
        when ${shouldUpdateVendorOrParty} then ${input.vendorOrParty ?? null}
        else vendor_or_party
      end,
      document_date = case
        when ${shouldUpdateDocumentDate} then ${input.documentDate ?? null}
        else document_date
      end,
      amount = case
        when ${shouldUpdateAmount} then ${input.amount ?? null}
        else amount
      end,
      currency = case
        when ${shouldUpdateCurrency} then ${input.currency ?? null}
        else currency
      end,
      invoice_number = case
        when ${shouldUpdateInvoiceNumber} then ${input.invoiceNumber ?? null}
        else invoice_number
      end,
      due_date = case
        when ${shouldUpdateDueDate} then ${input.dueDate ?? null}
        else due_date
      end,
      failure_reason = case
        when ${shouldUpdateFailureReason} then ${input.failureReason ?? null}
        else failure_reason
      end,
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
