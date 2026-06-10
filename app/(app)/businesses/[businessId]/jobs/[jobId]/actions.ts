"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { JobServiceError, updateJobStatusForBusiness } from "@/lib/server/services/job-service";

const changeJobStatusSchema = z.object({
  status: z.enum(["active", "completed", "archived"])
});

export async function changeJobStatusAction(businessId: string, jobId: string, formData: FormData) {
  const session = await requireSession();
  const authorization = await authorizeBusinessAccess({
    businessId,
    userId: session.userId,
    capability: "jobs:manage"
  });

  if (!authorization.allowed) {
    return redirect("/forbidden");
  }

  const parsed = changeJobStatusSchema.safeParse({
    status: formData.get("status")
  });

  if (!parsed.success) {
    return redirect(`/businesses/${businessId}/jobs/${jobId}?statusError=invalid`);
  }

  try {
    await updateJobStatusForBusiness({
      businessId,
      jobId,
      userId: session.userId,
      status: parsed.data.status
    });
  } catch (error) {
    if (error instanceof JobServiceError) {
      if (error.code === "duplicate") {
        return redirect(`/businesses/${businessId}/jobs/${jobId}?statusError=duplicate`);
      }

      if (error.code === "not_found") {
        return redirect(`/businesses/${businessId}/jobs?status=all`);
      }
    }

    throw error;
  }

  return redirect(`/businesses/${businessId}/jobs/${jobId}`);
}
