import { db } from "@/lib/server/db/client";
import type { DocumentProcessingJobRow } from "@/lib/server/db/schema";

function mapProcessingJob(row: DocumentProcessingJobRow): DocumentProcessingJobRow {
  return {
    ...row
  };
}

export async function enqueueDocumentProcessingJob(input: {
  documentId: string;
  correlationId: string;
}) {
  const rows = await db<DocumentProcessingJobRow[]>`
    insert into document_processing_jobs (
      document_id,
      correlation_id,
      status
    )
    values (
      ${input.documentId},
      ${input.correlationId},
      'pending'
    )
    returning
      id,
      document_id,
      correlation_id,
      status,
      attempts,
      available_at,
      created_at,
      updated_at
  `;

  return mapProcessingJob(rows[0]);
}
