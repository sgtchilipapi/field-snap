import Link from "next/link";
import { notFound } from "next/navigation";
import { JobUploadForm } from "@/components/business/job-upload-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireBusinessPageAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { getJobDetailsForUser } from "@/lib/server/services/job-service";

export default async function JobSnapPage({
  params
}: {
  params: Promise<{ businessId: string; jobId: string }>;
}) {
  const session = await requireSession();
  const { businessId, jobId } = await params;
  await requireBusinessPageAccess({
    businessId,
    userId: session.userId,
    capability: "documents:upload_job"
  });
  const result = await getJobDetailsForUser(businessId, jobId, session.userId);

  if (!result || !result.job) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          className="inline-flex text-sm italic text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
          href={`/businesses/${businessId}/jobs/${jobId}`}
        >
          {"<- Back"}
        </Link>
      </div>
      <PageHeader
        eyebrow="Snap"
        title="Upload to this job"
        description={`${result.job.client_name} - ${result.job.job_name}`}
      />
      <div className="space-y-4">
        <JobUploadForm businessId={businessId} jobId={jobId} />
      </div>
    </div>
  );
}
