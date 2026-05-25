import Link from "next/link";
import { notFound } from "next/navigation";
import { JobUploadForm } from "@/components/business/job-upload-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/server/auth/session";
import { getJobDetailsForUser } from "@/lib/server/services/job-service";

export default async function JobSnapPage({
  params
}: {
  params: Promise<{ businessId: string; jobId: string }>;
}) {
  const session = await requireSession();
  const { businessId, jobId } = await params;
  const result = await getJobDetailsForUser(businessId, jobId, session.userId);

  if (!result || !result.job) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Snap"
        title={`Snap for ${result.job.client_name} - ${result.job.job_name}`}
        description="Capture or choose one image and upload the original directly into this job’s Google Drive In-Process folder."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <JobUploadForm businessId={businessId} jobId={jobId} />
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <p className="text-sm text-[color:var(--muted)]">
            Uploads go first to the job&apos;s{" "}
            <span className="font-medium text-[color:var(--foreground)]">00 In-Process</span>{" "}
            folder, then background processing takes over.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
              href={`/businesses/${businessId}/jobs/${jobId}`}
            >
              Back to job
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
