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

export async function claimNextDocumentProcessingJob() {
  return db.begin(async (tx) => {
    const rows = await tx<DocumentProcessingJobRow[]>`
      with next_job as (
        select id
        from document_processing_jobs
        where status = 'pending'
          and available_at <= now()
        order by available_at asc, created_at asc
        for update skip locked
        limit 1
      )
      update document_processing_jobs
      set
        status = 'processing',
        attempts = attempts + 1,
        updated_at = now()
      where id in (select id from next_job)
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

    return rows[0] ? mapProcessingJob(rows[0]) : null;
  });
}

export async function completeDocumentProcessingJob(jobId: string) {
  const rows = await db<DocumentProcessingJobRow[]>`
    update document_processing_jobs
    set
      status = 'completed',
      updated_at = now()
    where id = ${jobId}
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

  return rows[0] ? mapProcessingJob(rows[0]) : null;
}

export async function failDocumentProcessingJob(jobId: string) {
  const rows = await db<DocumentProcessingJobRow[]>`
    update document_processing_jobs
    set
      status = 'failed',
      updated_at = now()
    where id = ${jobId}
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

  return rows[0] ? mapProcessingJob(rows[0]) : null;
}

export async function retryDocumentProcessingJob(jobId: string) {
  const rows = await db<DocumentProcessingJobRow[]>`
    update document_processing_jobs
    set
      status = 'pending',
      available_at = now() + interval '1 minute',
      updated_at = now()
    where id = ${jobId}
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

  return rows[0] ? mapProcessingJob(rows[0]) : null;
}
