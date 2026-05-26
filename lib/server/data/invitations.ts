import { db } from "@/lib/server/db/client";
import type { InvitationRow } from "@/lib/server/db/schema";

export type InvitationListItem = {
  id: string;
  business_id: string;
  invited_email: string;
  role: InvitationRow["role"];
  status: InvitationRow["status"];
  invited_by_user_id: string;
  inviter_name: string | null;
  inviter_email: string;
  expires_at: Date;
  created_at: Date;
  accepted_at: Date | null;
};

export type InvitationPreviewRecord = InvitationListItem & {
  business_name: string;
};

function mapInvitation(row: {
  id: string;
  business_id: string;
  invited_email: string;
  role: InvitationRow["role"];
  token_hash: string;
  status: InvitationRow["status"];
  invited_by_user_id: string;
  expires_at: Date;
  created_at: Date;
  accepted_at: Date | null;
}): InvitationRow {
  return {
    id: row.id,
    business_id: row.business_id,
    invited_email: row.invited_email,
    role: row.role,
    token_hash: row.token_hash,
    status: row.status,
    invited_by_user_id: row.invited_by_user_id,
    expires_at: row.expires_at,
    created_at: row.created_at,
    accepted_at: row.accepted_at
  };
}

export async function createInvitation(input: {
  businessId: string;
  invitedEmail: string;
  role: InvitationRow["role"];
  tokenHash: string;
  invitedByUserId: string;
  expiresAt: Date;
}) {
  const rows = await db<InvitationRow[]>`
    insert into invitations (
      business_id,
      invited_email,
      role,
      token_hash,
      status,
      invited_by_user_id,
      expires_at
    )
    values (
      ${input.businessId},
      ${input.invitedEmail},
      ${input.role},
      ${input.tokenHash},
      'pending',
      ${input.invitedByUserId},
      ${input.expiresAt}
    )
    returning
      id,
      business_id,
      invited_email,
      role,
      token_hash,
      status,
      invited_by_user_id,
      expires_at,
      created_at,
      accepted_at
  `;

  return mapInvitation(rows[0]);
}

export async function revokePendingInvitationsForEmail(businessId: string, invitedEmail: string) {
  await db`
    update invitations
    set status = 'revoked'
    where business_id = ${businessId}
      and lower(invited_email) = lower(${invitedEmail})
      and status = 'pending'
  `;
}

export async function listInvitationsForBusiness(businessId: string): Promise<InvitationListItem[]> {
  return db<InvitationListItem[]>`
    select
      i.id,
      i.business_id,
      i.invited_email,
      i.role,
      i.status,
      i.invited_by_user_id,
      u.name as inviter_name,
      u.email as inviter_email,
      i.expires_at,
      i.created_at,
      i.accepted_at
    from invitations i
    inner join users u on u.id = i.invited_by_user_id
    where i.business_id = ${businessId}
    order by i.created_at desc
  `;
}

export async function getInvitationByTokenHash(tokenHash: string): Promise<InvitationPreviewRecord | null> {
  const rows = await db<InvitationPreviewRecord[]>`
    select
      i.id,
      i.business_id,
      b.name as business_name,
      i.invited_email,
      i.role,
      i.status,
      i.invited_by_user_id,
      u.name as inviter_name,
      u.email as inviter_email,
      i.expires_at,
      i.created_at,
      i.accepted_at
    from invitations i
    inner join businesses b on b.id = i.business_id
    inner join users u on u.id = i.invited_by_user_id
    where i.token_hash = ${tokenHash}
    limit 1
  `;

  return rows[0] ?? null;
}

export async function updateInvitationStatus(
  invitationId: string,
  status: InvitationRow["status"],
  acceptedAt?: Date | null
) {
  const rows = await db<InvitationRow[]>`
    update invitations
    set
      status = ${status},
      accepted_at = ${acceptedAt === undefined ? null : acceptedAt}
    where id = ${invitationId}
    returning
      id,
      business_id,
      invited_email,
      role,
      token_hash,
      status,
      invited_by_user_id,
      expires_at,
      created_at,
      accepted_at
  `;

  return rows[0] ? mapInvitation(rows[0]) : null;
}

export async function acceptInvitation(input: {
  invitationId: string;
  businessId: string;
  userId: string;
  role: InvitationRow["role"];
  acceptedAt: Date;
}) {
  await db.begin(async (tx) => {
    await tx`
      insert into business_memberships (business_id, user_id, role, status)
      values (${input.businessId}, ${input.userId}, ${input.role}, 'active')
      on conflict (business_id, user_id)
      do update set
        role = excluded.role,
        status = 'active',
        updated_at = now()
    `;

    await tx`
      update invitations
      set
        status = 'accepted',
        accepted_at = ${input.acceptedAt}
      where id = ${input.invitationId}
    `;
  });
}
