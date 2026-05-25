import { db } from "@/lib/server/db/client";
import type { GeneralFolderRow } from "@/lib/server/db/schema";

function mapGeneralFolder(row: GeneralFolderRow): GeneralFolderRow {
  return {
    id: row.id,
    business_id: row.business_id,
    folder_key: row.folder_key,
    folder_name: row.folder_name,
    drive_folder_id: row.drive_folder_id,
    created_at: row.created_at
  };
}

export async function getGeneralFoldersForBusiness(businessId: string) {
  const rows = await db<GeneralFolderRow[]>`
    select
      id,
      business_id,
      folder_key,
      folder_name,
      drive_folder_id,
      created_at
    from general_folders
    where business_id = ${businessId}
    order by folder_name asc
  `;

  return rows.map(mapGeneralFolder);
}

export async function upsertGeneralFolder(input: {
  businessId: string;
  folderKey: string;
  folderName: string;
  driveFolderId: string;
}) {
  const rows = await db<GeneralFolderRow[]>`
    insert into general_folders (
      business_id,
      folder_key,
      folder_name,
      drive_folder_id
    )
    values (
      ${input.businessId},
      ${input.folderKey},
      ${input.folderName},
      ${input.driveFolderId}
    )
    on conflict (business_id, folder_key)
    do update set
      folder_name = excluded.folder_name,
      drive_folder_id = excluded.drive_folder_id
    returning
      id,
      business_id,
      folder_key,
      folder_name,
      drive_folder_id,
      created_at
  `;

  return mapGeneralFolder(rows[0]);
}
