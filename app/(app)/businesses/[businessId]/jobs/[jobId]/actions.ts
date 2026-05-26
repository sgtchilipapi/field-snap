"use server";

import { redirect } from "next/navigation";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { archiveJobForBusiness } from "@/lib/server/services/job-service";

export async function archiveJobAction(businessId: string, jobId: string) {
  const session = await requireSession();
  const authorization = await authorizeBusinessAccess({
    businessId,
    userId: session.userId,
    capability: "jobs:manage"
  });

  if (!authorization.allowed) {
    redirect("/forbidden");
  }

  await archiveJobForBusiness(businessId, jobId, session.userId);

  redirect(`/businesses/${businessId}/jobs?status=archived`);
}
