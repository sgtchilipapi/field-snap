import { db } from "@/lib/server/db/client";
import type { JobFolderRow } from "@/lib/server/db/schema";

function mapJobFolder(row: JobFolderRow): JobFolderRow {
  return {
    id: row.id,
    job_id: row.job_id,
    folder_key: row.folder_key,
    folder_name: row.folder_name,
    drive_folder_id: row.drive_folder_id,
    created_at: row.created_at
  };
}

export async function createJobFolder(input: {
  jobId: string;
  folderKey: string;
  folderName: string;
  driveFolderId: string;
}) {
  const rows = await db<JobFolderRow[]>`
    insert into job_folders (
      job_id,
      folder_key,
      folder_name,
      drive_folder_id
    )
    values (
      ${input.jobId},
      ${input.folderKey},
      ${input.folderName},
      ${input.driveFolderId}
    )
    returning
      id,
      job_id,
      folder_key,
      folder_name,
      drive_folder_id,
      created_at
  `;

  return mapJobFolder(rows[0]);
}

export async function listJobFolders(jobId: string) {
  const rows = await db<JobFolderRow[]>`
    select
      id,
      job_id,
      folder_key,
      folder_name,
      drive_folder_id,
      created_at
    from job_folders
    where job_id = ${jobId}
    order by folder_name asc
  `;

  return rows.map(mapJobFolder);
}
