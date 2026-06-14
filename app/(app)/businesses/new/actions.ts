"use server";

import { redirect } from "next/navigation";
import { createBusiness } from "@/lib/server/services/business-service";
import { requireSession } from "@/lib/server/auth/session";

export type NewBusinessFormState = {
  error: string | null;
};

export async function submitNewBusiness(
  _previousState: NewBusinessFormState,
  formData: FormData
): Promise<NewBusinessFormState> {
  const session = await requireSession();
  let business;

  try {
    business = await createBusiness({ name: formData.get("name") }, session.userId);
  } catch (error) {
    if (error instanceof Error) {
      return {
        error: error.message
      };
    }

    return {
      error: "Fylerr could not create the business."
    };
  }

  redirect(`/api/businesses/${business.id}/drive/connect`);
}
