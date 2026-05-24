import { z } from "zod";
import {
  createBusinessForOwner,
  getBusinessForUser,
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
  return createBusinessForOwner({
    name: parsed.name,
    ownerUserId
  });
}

export async function listBusinessesForUser(userId: string) {
  return getBusinessesForUser(userId);
}

export async function getBusinessDetailsForUser(
  businessId: string,
  userId: string
): Promise<BusinessDetails | null> {
  return getBusinessForUser(businessId, userId);
}
