import { redirect } from "next/navigation";
import { getBusinessForUser, type BusinessDetails } from "@/lib/server/data/businesses";
import type { BusinessMembershipRow } from "@/lib/server/db/schema";

export type BusinessCapability =
  | "business:view"
  | "settings:view"
  | "drive:manage"
  | "jobs:view"
  | "jobs:manage"
  | "documents:upload_job"
  | "documents:upload_general"
  | "documents:view_audit"
  | "review:access"
  | "invitations:manage";

const ROLE_CAPABILITIES: Record<
  BusinessMembershipRow["role"],
  readonly BusinessCapability[]
> = {
  owner_admin: [
    "business:view",
    "settings:view",
    "drive:manage",
    "jobs:view",
    "jobs:manage",
    "documents:upload_job",
    "documents:upload_general",
    "documents:view_audit",
    "review:access",
    "invitations:manage"
  ],
  reviewer: [
    "business:view",
    "settings:view",
    "jobs:view",
    "documents:upload_job",
    "documents:upload_general",
    "documents:view_audit",
    "review:access"
  ],
  field_user: ["business:view", "jobs:view", "documents:upload_job"]
};

export type AuthorizedBusinessAccess = {
  allowed: true;
  details: BusinessDetails;
};

export type ForbiddenBusinessAccess = {
  allowed: false;
  details: BusinessDetails | null;
};

export function hasBusinessCapability(
  membership: Pick<BusinessMembershipRow, "role" | "status">,
  capability: BusinessCapability
) {
  return (
    membership.status === "active" &&
    ROLE_CAPABILITIES[membership.role].includes(capability)
  );
}

export async function authorizeBusinessAccess(input: {
  businessId: string;
  userId: string;
  capability: BusinessCapability;
}): Promise<AuthorizedBusinessAccess | ForbiddenBusinessAccess> {
  const details = await getBusinessForUser(input.businessId, input.userId);

  if (!details || !hasBusinessCapability(details.membership, input.capability)) {
    return {
      allowed: false,
      details
    };
  }

  return {
    allowed: true,
    details
  };
}

export async function requireBusinessPageAccess(input: {
  businessId: string;
  userId: string;
  capability: BusinessCapability;
}) {
  const authorization = await authorizeBusinessAccess(input);

  if (!authorization.allowed) {
    redirect("/forbidden");
  }

  return authorization.details;
}
