"use server";

import { redirect } from "next/navigation";
import { createBusiness } from "@/lib/server/services/business-service";
import { requireSession } from "@/lib/server/auth/session";
import { getBusinessLandingPath } from "@/lib/server/services/business-service";

export type NewBusinessFormState = {
  error: string | null;
};

export async function submitNewBusiness(
  _previousState: NewBusinessFormState,
  formData: FormData
): Promise<NewBusinessFormState> {
  const session = await requireSession();

  try {
    const business = await createBusiness({ name: formData.get("name") }, session.userId);
    redirect(
      getBusinessLandingPath({
        id: business.id,
        role: "owner_admin",
        driveConnected: false
      })
    );
  } catch (error) {
    if (error instanceof Error) {
      return {
        error: error.message
      };
    }

    return {
      error: "Field-Snap could not create the business."
    };
  }
}
