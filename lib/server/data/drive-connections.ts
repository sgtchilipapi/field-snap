import { db } from "@/lib/server/db/client";
import type { DriveConnectionRow } from "@/lib/server/db/schema";

function mapDriveConnection(row: DriveConnectionRow): DriveConnectionRow {
  return {
    id: row.id,
    business_id: row.business_id,
    connected_by_user_id: row.connected_by_user_id,
    google_account_email: row.google_account_email,
    access_token_encrypted: row.access_token_encrypted,
    refresh_token_encrypted: row.refresh_token_encrypted,
    scopes: row.scopes,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function getDriveConnectionForBusiness(businessId: string) {
  const rows = await db<DriveConnectionRow[]>`
    select
      id,
      business_id,
      connected_by_user_id,
      google_account_email,
      access_token_encrypted,
      refresh_token_encrypted,
      scopes,
      status,
      created_at,
      updated_at
    from drive_connections
    where business_id = ${businessId}
    limit 1
  `;

  return rows[0] ? mapDriveConnection(rows[0]) : null;
}

export async function upsertDriveConnection(input: {
  businessId: string;
  connectedByUserId: string;
  googleAccountEmail: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  scopes: string[];
  status: DriveConnectionRow["status"];
}) {
  const rows = await db<DriveConnectionRow[]>`
    insert into drive_connections (
      business_id,
      connected_by_user_id,
      google_account_email,
      access_token_encrypted,
      refresh_token_encrypted,
      scopes,
      status
    )
    values (
      ${input.businessId},
      ${input.connectedByUserId},
      ${input.googleAccountEmail},
      ${input.accessTokenEncrypted},
      ${input.refreshTokenEncrypted},
      ${input.scopes},
      ${input.status}
    )
    on conflict (business_id)
    do update set
      connected_by_user_id = excluded.connected_by_user_id,
      google_account_email = excluded.google_account_email,
      access_token_encrypted = excluded.access_token_encrypted,
      refresh_token_encrypted = coalesce(excluded.refresh_token_encrypted, drive_connections.refresh_token_encrypted),
      scopes = excluded.scopes,
      status = excluded.status,
      updated_at = now()
    returning
      id,
      business_id,
      connected_by_user_id,
      google_account_email,
      access_token_encrypted,
      refresh_token_encrypted,
      scopes,
      status,
      created_at,
      updated_at
  `;

  return mapDriveConnection(rows[0]);
}

export async function updateDriveConnectionStatus(
  businessId: string,
  status: DriveConnectionRow["status"]
) {
  const rows = await db<DriveConnectionRow[]>`
    update drive_connections
    set
      status = ${status},
      updated_at = now()
    where business_id = ${businessId}
    returning
      id,
      business_id,
      connected_by_user_id,
      google_account_email,
      access_token_encrypted,
      refresh_token_encrypted,
      scopes,
      status,
      created_at,
      updated_at
  `;

  return rows[0] ? mapDriveConnection(rows[0]) : null;
}

export async function disconnectDriveConnectionForBusiness(businessId: string) {
  const rows = await db<DriveConnectionRow[]>`
    update drive_connections
    set
      access_token_encrypted = null,
      refresh_token_encrypted = null,
      status = 'revoked',
      updated_at = now()
    where business_id = ${businessId}
    returning
      id,
      business_id,
      connected_by_user_id,
      google_account_email,
      access_token_encrypted,
      refresh_token_encrypted,
      scopes,
      status,
      created_at,
      updated_at
  `;

  return rows[0] ? mapDriveConnection(rows[0]) : null;
}
