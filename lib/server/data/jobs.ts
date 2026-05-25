import { db } from "@/lib/server/db/client";
import type { JobRow } from "@/lib/server/db/schema";

export type JobWithCategoryRow = JobRow & {
  category_name: string;
  category_slug: string;
};

function mapJob(row: JobRow): JobRow {
  return {
    id: row.id,
    business_id: row.business_id,
    category_id: row.category_id,
    client_name: row.client_name,
    job_name: row.job_name,
    address: row.address,
    job_date: row.job_date,
    drive_folder_id: row.drive_folder_id,
    in_process_folder_id: row.in_process_folder_id,
    needs_review_folder_id: row.needs_review_folder_id,
    status: row.status,
    created_by_user_id: row.created_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapJobWithCategory(row: JobWithCategoryRow): JobWithCategoryRow {
  return {
    ...mapJob(row),
    category_name: row.category_name,
    category_slug: row.category_slug
  };
}

export async function createJob(input: {
  businessId: string;
  categoryId: string;
  clientName: string;
  jobName: string;
  address: string | null;
  jobDate: string;
  driveFolderId: string;
  inProcessFolderId: string;
  needsReviewFolderId: string;
  createdByUserId: string;
}) {
  const rows = await db<JobRow[]>`
    insert into jobs (
      business_id,
      category_id,
      client_name,
      job_name,
      address,
      job_date,
      drive_folder_id,
      in_process_folder_id,
      needs_review_folder_id,
      status,
      created_by_user_id
    )
    values (
      ${input.businessId},
      ${input.categoryId},
      ${input.clientName},
      ${input.jobName},
      ${input.address},
      ${input.jobDate},
      ${input.driveFolderId},
      ${input.inProcessFolderId},
      ${input.needsReviewFolderId},
      'active',
      ${input.createdByUserId}
    )
    returning
      id,
      business_id,
      category_id,
      client_name,
      job_name,
      address,
      job_date::text as job_date,
      drive_folder_id,
      in_process_folder_id,
      needs_review_folder_id,
      status,
      created_by_user_id,
      created_at,
      updated_at
  `;

  return mapJob(rows[0]);
}

export async function listJobsForBusiness(input: {
  businessId: string;
  status?: "active" | "archived" | "all";
  categoryId?: string | null;
  search?: string | null;
}) {
  const statusFilter = input.status ?? "active";
  const categoryId = input.categoryId ?? null;
  const search = input.search?.trim() ? `%${input.search.trim()}%` : null;

  const rows = await db<JobWithCategoryRow[]>`
    select
      j.id,
      j.business_id,
      j.category_id,
      j.client_name,
      j.job_name,
      j.address,
      j.job_date::text as job_date,
      j.drive_folder_id,
      j.in_process_folder_id,
      j.needs_review_folder_id,
      j.status,
      j.created_by_user_id,
      j.created_at,
      j.updated_at,
      c.name as category_name,
      c.slug as category_slug
    from jobs j
    inner join categories c on c.id = j.category_id
    where j.business_id = ${input.businessId}
      and (${statusFilter} = 'all' or j.status = ${statusFilter})
      and (${categoryId}::uuid is null or j.category_id = ${categoryId})
      and (
        ${search}::text is null
        or j.client_name ilike ${search}
        or j.job_name ilike ${search}
        or coalesce(j.address, '') ilike ${search}
      )
    order by j.created_at desc
    limit 100
  `;

  return rows.map(mapJobWithCategory);
}

export async function findActiveDuplicateJob(input: {
  businessId: string;
  clientName: string;
  jobName: string;
  jobDate: string;
  excludeJobId?: string;
}) {
  const rows = await db<Array<{ id: string }>>`
    select id
    from jobs
    where business_id = ${input.businessId}
      and client_name = ${input.clientName}
      and job_name = ${input.jobName}
      and job_date = ${input.jobDate}
      and status = 'active'
      and (${input.excludeJobId ?? null}::uuid is null or id <> ${input.excludeJobId ?? null})
    limit 1
  `;

  return rows[0]?.id ?? null;
}

export async function getJobForBusiness(businessId: string, jobId: string) {
  const rows = await db<JobWithCategoryRow[]>`
    select
      j.id,
      j.business_id,
      j.category_id,
      j.client_name,
      j.job_name,
      j.address,
      j.job_date::text as job_date,
      j.drive_folder_id,
      j.in_process_folder_id,
      j.needs_review_folder_id,
      j.status,
      j.created_by_user_id,
      j.created_at,
      j.updated_at,
      c.name as category_name,
      c.slug as category_slug
    from jobs j
    inner join categories c on c.id = j.category_id
    where j.business_id = ${businessId}
      and j.id = ${jobId}
    limit 1
  `;

  return rows[0] ? mapJobWithCategory(rows[0]) : null;
}

export async function updateJob(input: {
  jobId: string;
  businessId: string;
  categoryId: string;
  clientName: string;
  jobName: string;
  address: string | null;
  jobDate: string;
}) {
  const rows = await db<JobRow[]>`
    update jobs
    set
      category_id = ${input.categoryId},
      client_name = ${input.clientName},
      job_name = ${input.jobName},
      address = ${input.address},
      job_date = ${input.jobDate},
      updated_at = now()
    where id = ${input.jobId}
      and business_id = ${input.businessId}
    returning
      id,
      business_id,
      category_id,
      client_name,
      job_name,
      address,
      job_date::text as job_date,
      drive_folder_id,
      in_process_folder_id,
      needs_review_folder_id,
      status,
      created_by_user_id,
      created_at,
      updated_at
  `;

  return rows[0] ? mapJob(rows[0]) : null;
}

export async function archiveJob(jobId: string, businessId: string) {
  const rows = await db<JobRow[]>`
    update jobs
    set
      status = 'archived',
      updated_at = now()
    where id = ${jobId}
      and business_id = ${businessId}
    returning
      id,
      business_id,
      category_id,
      client_name,
      job_name,
      address,
      job_date::text as job_date,
      drive_folder_id,
      in_process_folder_id,
      needs_review_folder_id,
      status,
      created_by_user_id,
      created_at,
      updated_at
  `;

  return rows[0] ? mapJob(rows[0]) : null;
}
