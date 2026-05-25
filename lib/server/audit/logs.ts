import { db } from "@/lib/server/db/client";
import type { AuditLogRow } from "@/lib/server/db/schema";

function mapAuditLog(row: AuditLogRow): AuditLogRow {
  return {
    ...row
  };
}

export async function createAuditLog(input: {
  businessId: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const oldValueJson = input.oldValue === undefined ? null : JSON.stringify(input.oldValue);
  const newValueJson = input.newValue === undefined ? null : JSON.stringify(input.newValue);

  const rows = await db<AuditLogRow[]>`
    insert into audit_logs (
      business_id,
      actor_user_id,
      entity_type,
      entity_id,
      action,
      old_value,
      new_value
    )
    values (
      ${input.businessId},
      ${input.actorUserId},
      ${input.entityType},
      ${input.entityId}::uuid,
      ${input.action},
      ${oldValueJson}::jsonb,
      ${newValueJson}::jsonb
    )
    returning
      id,
      business_id,
      actor_user_id,
      entity_type,
      entity_id,
      action,
      old_value,
      new_value,
      created_at
  `;

  return mapAuditLog(rows[0]);
}
