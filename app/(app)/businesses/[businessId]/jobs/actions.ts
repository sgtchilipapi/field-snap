"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireSession } from "@/lib/server/auth/session";
import { createJobForBusiness, JobServiceError } from "@/lib/server/services/job-service";

export type JobFormState = {
  error: string | null;
};

function getOptionalFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

export async function submitNewJob(
  businessId: string,
  _previousState: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const session = await requireSession();

  try {
    const result = await createJobForBusiness({
      businessId,
      userId: session.userId,
      values: {
        category_id: getOptionalFormValue(formData, "category_id"),
        custom_category_name: getOptionalFormValue(formData, "custom_category_name"),
        client_name: getOptionalFormValue(formData, "client_name"),
        job_name: getOptionalFormValue(formData, "job_name"),
        address: getOptionalFormValue(formData, "address"),
        job_date: getOptionalFormValue(formData, "job_date")
      }
    });

    redirect(`/businesses/${businessId}/jobs/${result.job.id}`);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        error: error.issues[0]?.message ?? "Invalid job details."
      };
    }

    if (error instanceof Error || error instanceof JobServiceError) {
      return {
        error: error.message
      };
    }

    return {
      error: "Field-Snap could not create the job."
    };
  }
}
