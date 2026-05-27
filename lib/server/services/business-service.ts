import { z } from "zod";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/server/audit/logs";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import {
  createBusinessForOwner,
  getBusinessesForUser,
  type BusinessDetails,
  type BusinessListItem
} from "@/lib/server/data/businesses";

export const createBusinessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Business name is required.")
    .max(120, "Business name must be 120 characters or fewer.")
});

export function getBusinessLandingPath(business: Pick<BusinessListItem, "id" | "driveConnected" | "role">) {
  if (business.role === "owner_admin" && !business.driveConnected) {
    return `/businesses/${business.id}/settings`;
  }

  return `/businesses/${business.id}/jobs`;
}

export async function createBusiness(input: unknown, ownerUserId: string) {
  const parsed = createBusinessSchema.parse(input);
  const business = await createBusinessForOwner({
    name: parsed.name,
    ownerUserId
  });

  await recordAuditEvent({
    businessId: business.id,
    actorUserId: ownerUserId,
    entityType: "business",
    entityId: business.id,
    action: AUDIT_ACTIONS.businessCreated,
    newValue: {
      name: business.name,
      owner_user_id: business.owner_user_id
    }
  });

  return business;
}

export async function listBusinessesForUser(userId: string) {
  return getBusinessesForUser(userId);
}

export async function getBusinessDetailsForUser(
  businessId: string,
  userId: string
): Promise<BusinessDetails | null> {
  const authorization = await authorizeBusinessAccess({
    businessId,
    userId,
    capability: "business:view"
  });

  return authorization.allowed ? authorization.details : null;
}

export async function getBusinessOwnerDetailsForUser(businessId: string, userId: string) {
  const authorization = await authorizeBusinessAccess({
    businessId,
    userId,
    capability: "drive:manage"
  });

  return authorization.allowed ? authorization.details : null;
}
