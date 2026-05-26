import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { InvitationRow } from "@/lib/server/db/schema";
import {
  acceptInvitation as acceptInvitationRecord,
  createInvitation,
  getInvitationByTokenHash,
  listInvitationsForBusiness,
  revokePendingInvitationsForEmail,
  updateInvitationStatus,
  type InvitationListItem
} from "@/lib/server/data/invitations";
import { findUserById } from "@/lib/server/data/users";
import { getBusinessOwnerDetailsForUser } from "@/lib/server/services/business-service";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const createInvitationSchema = z.object({
  invited_email: z.string().trim().email("Invitation email must be valid."),
  role: z.enum(["field_user", "reviewer"], {
    errorMap: () => ({
      message: "Invitation role must be field_user or reviewer."
    })
  })
});

export type InvitationStatus = InvitationRow["status"];

export type InvitationPreview =
  | {
      state: "invalid";
      invitation: null;
      viewerEmail: string | null;
    }
  | {
      state: "pending" | "login_required" | "email_mismatch" | "expired" | "revoked" | "accepted";
      invitation: {
        id: string;
        businessId: string;
        businessName: string;
        invitedEmail: string;
        role: InvitationRow["role"];
        status: InvitationStatus;
        inviterName: string | null;
        inviterEmail: string;
        expiresAt: Date;
        createdAt: Date;
        acceptedAt: Date | null;
      };
      viewerEmail: string | null;
    };

export class InvitationServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "forbidden"
      | "invalid_token"
      | "expired"
      | "revoked"
      | "accepted"
      | "email_mismatch"
  ) {
    super(message);
  }
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getInviteUrl(baseUrl: string, token: string) {
  return new URL(`/invitations/${token}`, baseUrl).toString();
}

function getEffectiveInvitationStatus(invitation: Pick<InvitationListItem, "status" | "expires_at">) {
  if (invitation.status === "pending" && invitation.expires_at.getTime() < Date.now()) {
    return "expired" as const;
  }

  return invitation.status;
}

async function expireInvitationIfNeeded(invitation: {
  id: string;
  status: InvitationStatus;
  expires_at: Date;
}) {
  if (invitation.status !== "pending" || invitation.expires_at.getTime() >= Date.now()) {
    return invitation.status;
  }

  await updateInvitationStatus(invitation.id, "expired");
  return "expired" as const;
}

export async function createInvitationForBusiness(input: {
  businessId: string;
  userId: string;
  values: unknown;
  baseUrl: string;
}) {
  const details = await getBusinessOwnerDetailsForUser(input.businessId, input.userId);

  if (!details) {
    throw new InvitationServiceError("Forbidden", "forbidden");
  }

  const values = createInvitationSchema.parse(input.values);
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  await revokePendingInvitationsForEmail(input.businessId, values.invited_email);

  const invitation = await createInvitation({
    businessId: input.businessId,
    invitedEmail: values.invited_email,
    role: values.role,
    tokenHash: hashInvitationToken(token),
    invitedByUserId: input.userId,
    expiresAt
  });

  return {
    invitation,
    inviteUrl: getInviteUrl(input.baseUrl, token)
  };
}

export async function listInvitationsForBusinessForOwner(input: {
  businessId: string;
  userId: string;
}) {
  const details = await getBusinessOwnerDetailsForUser(input.businessId, input.userId);

  if (!details) {
    throw new InvitationServiceError("Forbidden", "forbidden");
  }

  const invitations = await listInvitationsForBusiness(input.businessId);

  return invitations.map((invitation) => ({
    ...invitation,
    effectiveStatus: getEffectiveInvitationStatus(invitation)
  }));
}

export async function getInvitationPreview(input: {
  token: string;
  userId?: string | null;
}): Promise<InvitationPreview> {
  const invitation = await getInvitationByTokenHash(hashInvitationToken(input.token));
  const viewer = input.userId ? await findUserById(input.userId) : null;
  const viewerEmail = viewer?.email ?? null;

  if (!invitation) {
    return {
      state: "invalid",
      invitation: null,
      viewerEmail
    };
  }

  const status = await expireInvitationIfNeeded(invitation);
  const previewInvitation = {
    id: invitation.id,
    businessId: invitation.business_id,
    businessName: invitation.business_name,
    invitedEmail: invitation.invited_email,
    role: invitation.role,
    status,
    inviterName: invitation.inviter_name,
    inviterEmail: invitation.inviter_email,
    expiresAt: invitation.expires_at,
    createdAt: invitation.created_at,
    acceptedAt: invitation.accepted_at
  };

  if (status === "accepted" || status === "expired" || status === "revoked") {
    return {
      state: status,
      invitation: previewInvitation,
      viewerEmail
    };
  }

  if (!viewerEmail) {
    return {
      state: "login_required",
      invitation: previewInvitation,
      viewerEmail
    };
  }

  if (viewerEmail.toLowerCase() !== invitation.invited_email.toLowerCase()) {
    return {
      state: "email_mismatch",
      invitation: previewInvitation,
      viewerEmail
    };
  }

  return {
    state: "pending",
    invitation: previewInvitation,
    viewerEmail
  };
}

export async function acceptInvitation(input: {
  token: string;
  userId: string;
}) {
  const invitation = await getInvitationByTokenHash(hashInvitationToken(input.token));

  if (!invitation) {
    throw new InvitationServiceError("Invitation was not found.", "invalid_token");
  }

  const status = await expireInvitationIfNeeded(invitation);

  if (status === "expired") {
    throw new InvitationServiceError("Invitation expired.", "expired");
  }

  if (status === "revoked") {
    throw new InvitationServiceError("Invitation was revoked.", "revoked");
  }

  if (status === "accepted") {
    throw new InvitationServiceError("Invitation was already accepted.", "accepted");
  }

  const user = await findUserById(input.userId);

  if (!user || user.email.toLowerCase() !== invitation.invited_email.toLowerCase()) {
    throw new InvitationServiceError("Signed-in email does not match the invitation.", "email_mismatch");
  }

  const acceptedAt = new Date();

  await acceptInvitationRecord({
    invitationId: invitation.id,
    businessId: invitation.business_id,
    userId: user.id,
    role: invitation.role,
    acceptedAt
  });

  return {
    businessId: invitation.business_id,
    role: invitation.role,
    acceptedAt
  };
}
