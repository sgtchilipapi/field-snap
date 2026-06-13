import Link from "next/link";
import { notFound } from "next/navigation";
import { JobStatusControl } from "@/components/business/job-status-control";
import { PageHeader } from "@/components/layout/page-header";
import { requireBusinessPageAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { getJobDetailsForUser } from "@/lib/server/services/job-service";

function getDriveOpenUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ businessId: string; jobId: string }>;
}) {
  const session = await requireSession();
  const { businessId, jobId } = await params;
  await requireBusinessPageAccess({
    businessId,
    userId: session.userId,
    capability: "jobs:view",
  });
  const result = await getJobDetailsForUser(businessId, jobId, session.userId);

  if (!result || !result.job) {
    notFound();
  }

  const { job, membership } = result;
  const canManageJob = membership.role === "owner_admin";

  return (
    <div className="space-y-8">
      <div>
        <Link
          className="inline-flex text-sm italic text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
          href={`/businesses/${businessId}/jobs`}
        >
          {"<- Back to Jobs"}
        </Link>
      </div>
      <PageHeader
        eyebrow="Job detail"
        title={`${job.client_name} - ${job.job_name}`}
        description=""
      />
      <details className="group rounded-[1.5rem] bg-[color:var(--surface)] p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[color:var(--foreground)] [&::-webkit-details-marker]:hidden">
          <span>Job details</span>
          <span
            className="text-[color:var(--muted)] transition group-open:rotate-180"
            aria-hidden="true"
          >
            ↓
          </span>
        </summary>
        <dl className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <dt className="text-sm text-[color:var(--muted)]">Category</dt>
            <dd className="mt-2 text-lg font-semibold">{job.category_name}</dd>
          </div>
          <div>
            <dt className="text-sm text-[color:var(--muted)]">Status</dt>
            <dd>
              {canManageJob ? (
                <JobStatusControl
                  businessId={businessId}
                  currentStatus={job.status}
                  jobId={jobId}
                />
              ) : (
                <p className="mt-2 text-lg font-semibold">{job.status}</p>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[color:var(--muted)]">Job date</dt>
            <dd className="mt-2 text-lg font-semibold">{job.job_date}</dd>
          </div>
          <div>
            <dt className="text-sm text-[color:var(--muted)]">Address</dt>
            <dd className="mt-2 text-lg font-semibold">
              {job.address ?? "Not provided"}
            </dd>
          </div>
        </dl>
      </details>
      <div className="flex flex-wrap gap-3">
        {job.status === "active" ? (
          <Link
            className="inline-flex rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            href={`/businesses/${businessId}/jobs/${jobId}/snap`}
          >
            Snap
          </Link>
        ) : null}
        <Link
          className="inline-flex rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
          href={getDriveOpenUrl(job.drive_folder_id)}
          rel="noreferrer"
          target="_blank"
        >
          See Docs
        </Link>
      </div>
    </div>
  );
}
