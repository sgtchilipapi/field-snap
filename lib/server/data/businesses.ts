import { db } from "@/lib/server/db/client";
import type {
  BusinessMembershipRow,
  BusinessRow,
} from "@/lib/server/db/schema";

export type BusinessListItem = {
  id: string;
  name: string;
  role: BusinessMembershipRow["role"];
  status: BusinessMembershipRow["status"];
  driveConnected: boolean;
  lastOpenedAt: Date | null;
};

export type BusinessDetails = {
  business: BusinessRow;
  membership: {
    role: BusinessMembershipRow["role"];
    status: BusinessMembershipRow["status"];
  };
};

function mapBusiness(row: {
  id: string;
  name: string;
  owner_user_id: string;
  drive_root_folder_id: string | null;
  general_docs_folder_id: string | null;
  created_at: Date;
  updated_at: Date;
}): BusinessRow {
  return {
    id: row.id,
    name: row.name,
    owner_user_id: row.owner_user_id,
    drive_root_folder_id: row.drive_root_folder_id,
    general_docs_folder_id: row.general_docs_folder_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createBusinessForOwner(input: {
  name: string;
  ownerUserId: string;
}) {
  return db.begin(async (tx) => {
    const businesses = await tx<BusinessRow[]>`
      insert into businesses (name, owner_user_id)
      values (${input.name}, ${input.ownerUserId})
      returning
        id,
        name,
        owner_user_id,
        drive_root_folder_id,
        general_docs_folder_id,
        created_at,
        updated_at
    `;

    const business = businesses[0];

    await tx`
      insert into business_memberships (business_id, user_id, role, status)
      values (${business.id}, ${input.ownerUserId}, 'owner_admin', 'active')
    `;

    return mapBusiness(business);
  });
}

export async function getBusinessesForUser(
  userId: string,
): Promise<BusinessListItem[]> {
  return db<BusinessListItem[]>`
    select
      b.id as "id",
      b.name as "name",
      bm.role as "role",
      bm.status as "status",
      (dc.business_id is not null) as "driveConnected",
      bm.last_opened_at as "lastOpenedAt"
    from business_memberships bm
    inner join businesses b on b.id = bm.business_id
    left join drive_connections dc
      on dc.business_id = b.id
      and dc.status = 'active'
      and dc.access_token_encrypted is not null
    where bm.user_id = ${userId}
    order by bm.last_opened_at desc nulls last, b.name asc
  `;
}

export async function getBusinessForUser(
  businessId: string,
  userId: string,
): Promise<BusinessDetails | null> {
  const rows = await db<
    Array<{
      id: string;
      name: string;
      owner_user_id: string;
      drive_root_folder_id: string | null;
      general_docs_folder_id: string | null;
      created_at: Date;
      updated_at: Date;
      role: BusinessMembershipRow["role"];
      status: BusinessMembershipRow["status"];
    }>
  >`
    select
      b.id,
      b.name,
      b.owner_user_id,
      b.drive_root_folder_id,
      b.general_docs_folder_id,
      b.created_at,
      b.updated_at,
      bm.role,
      bm.status
    from businesses b
    inner join business_memberships bm on bm.business_id = b.id
    where b.id = ${businessId}
      and bm.user_id = ${userId}
    limit 1
  `;

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    business: mapBusiness(row),
    membership: {
      role: row.role,
      status: row.status,
    },
  };
}

export async function updateBusinessDriveRootFolder(
  businessId: string,
  driveRootFolderId: string,
) {
  const rows = await db<BusinessRow[]>`
    update businesses
    set
      drive_root_folder_id = ${driveRootFolderId},
      updated_at = now()
    where id = ${businessId}
    returning
      id,
      name,
      owner_user_id,
      drive_root_folder_id,
      general_docs_folder_id,
      created_at,
      updated_at
  `;

  return rows[0] ? mapBusiness(rows[0]) : null;
}

export async function updateBusinessGeneralDocsFolder(
  businessId: string,
  generalDocsFolderId: string,
) {
  const rows = await db<BusinessRow[]>`
    update businesses
    set
      general_docs_folder_id = ${generalDocsFolderId},
      updated_at = now()
    where id = ${businessId}
    returning
      id,
      name,
      owner_user_id,
      drive_root_folder_id,
      general_docs_folder_id,
      created_at,
      updated_at
  `;

  return rows[0] ? mapBusiness(rows[0]) : null;
}

export async function getBusinessById(businessId: string) {
  const rows = await db<BusinessRow[]>`
    select
      id,
      name,
      owner_user_id,
      drive_root_folder_id,
      general_docs_folder_id,
      created_at,
      updated_at
    from businesses
    where id = ${businessId}
    limit 1
  `;

  return rows[0] ? mapBusiness(rows[0]) : null;
}

export async function markBusinessOpenedForUser(input: {
  businessId: string;
  userId: string;
}) {
  const rows = await db<Array<{ business_id: string; last_opened_at: Date }>>`
    update business_memberships
    set
      last_opened_at = now(),
      updated_at = now()
    where business_id = ${input.businessId}
      and user_id = ${input.userId}
      and status = 'active'
    returning business_id, last_opened_at
  `;

  return rows[0] ?? null;
}

export async function getMostRecentlyOpenedBusinessForUser(
  userId: string,
): Promise<BusinessListItem | null> {
  const rows = await db<BusinessListItem[]>`
    select
      b.id as "id",
      b.name as "name",
      bm.role as "role",
      bm.status as "status",
      (dc.business_id is not null) as "driveConnected",
      bm.last_opened_at as "lastOpenedAt"
    from business_memberships bm
    inner join businesses b on b.id = bm.business_id
    left join drive_connections dc
      on dc.business_id = b.id
      and dc.status = 'active'
      and dc.access_token_encrypted is not null
    where bm.user_id = ${userId}
      and bm.status = 'active'
    order by bm.last_opened_at desc nulls last, b.created_at desc
    limit 1
  `;

  return rows[0] ?? null;
}
