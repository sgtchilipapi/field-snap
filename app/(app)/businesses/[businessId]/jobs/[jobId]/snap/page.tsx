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
      <PageHeader
        eyebrow="Snap"
        title="Upload to this job"
        description={`${result.job.client_name} - ${result.job.job_name}`}
      />
      <div className="space-y-4">
        <JobUploadForm businessId={businessId} jobId={jobId} />
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <p className="text-sm leading-6 text-[color:var(--muted)]">
            JobFyl uploads the original image to{" "}
            <span className="font-medium text-[color:var(--foreground)]">00 In-Process</span>{" "}
            first. Background classification and Drive filing happen after the upload succeeds.
          </p>
        </div>
        <Link
          className="inline-flex w-full items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)] sm:w-auto"
          href={`/businesses/${businessId}/jobs/${jobId}`}
        >
          Back to job
        </Link>
      </div>
    </div>
  );
}
