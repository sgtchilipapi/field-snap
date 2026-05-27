import { db } from "@/lib/server/db/client";
import type { AuditLogRow } from "@/lib/server/db/schema";

export const AUDIT_ACTIONS = {
  businessCreated: "business.created",
  driveConnected: "drive.connected",
  jobCreated: "job.created",
  documentUploaded: "document.uploaded",
  documentAiClassified: "document.ai_classified",
  documentAutoFiled: "document.auto_filed",
  documentMoved: "document.moved",
  documentRenamed: "document.renamed",
  documentReviewed: "document.reviewed",
  documentMetadataUpdated: "document.metadata_updated",
  invitationCreated: "invitation.created",
  invitationAccepted: "invitation.accepted"
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditLogWithActorRow = AuditLogRow & {
  actor_name: string | null;
  actor_email: string | null;
};

function mapAuditLog(row: AuditLogRow): AuditLogRow {
  return {
    ...row
  };
}

function mapAuditLogWithActor(row: AuditLogWithActorRow): AuditLogWithActorRow {
  return {
    ...mapAuditLog(row),
    actor_name: row.actor_name,
    actor_email: row.actor_email
  };
}

export async function createAuditLog(input: {
  businessId: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
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

export async function recordAuditEvent(input: {
  businessId: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  return createAuditLog(input);
}

export async function listAuditLogsForEntity(input: {
  businessId: string;
  entityType: string;
  entityId: string;
}) {
  const rows = await db<AuditLogWithActorRow[]>`
    select
      al.id,
      al.business_id,
      al.actor_user_id,
      al.entity_type,
      al.entity_id,
      al.action,
      al.old_value,
      al.new_value,
      al.created_at,
      u.name as actor_name,
      u.email as actor_email
    from audit_logs al
    left join users u on u.id = al.actor_user_id
    where al.business_id = ${input.businessId}
      and al.entity_type = ${input.entityType}
      and al.entity_id = ${input.entityId}::uuid
    order by al.created_at asc
  `;

  return rows.map(mapAuditLogWithActor);
}
