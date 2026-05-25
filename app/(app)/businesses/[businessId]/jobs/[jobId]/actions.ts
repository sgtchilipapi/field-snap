"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/auth/session";
import { archiveJobForBusiness } from "@/lib/server/services/job-service";

export async function archiveJobAction(businessId: string, jobId: string) {
  const session = await requireSession();

  await archiveJobForBusiness(businessId, jobId, session.userId);

  redirect(`/businesses/${businessId}/jobs?status=archived`);
}
