import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveJobAction } from "@/app/(app)/businesses/[businessId]/jobs/[jobId]/actions";
import { PageHeader } from "@/components/layout/page-header";
import { requireBusinessPageAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { getJobDetailsForUser } from "@/lib/server/services/job-service";

function getDriveOpenUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export default async function JobDetailsPage({
  params
}: {
  params: Promise<{ businessId: string; jobId: string }>;
}) {
  const session = await requireSession();
  const { businessId, jobId } = await params;
  await requireBusinessPageAccess({
    businessId,
    userId: session.userId,
    capability: "jobs:view"
  });
  const result = await getJobDetailsForUser(businessId, jobId, session.userId);

  if (!result || !result.job) {
    notFound();
  }

  const { job, folders, membership } = result;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Job detail"
        title={`${job.client_name} - ${job.job_name}`}
        description="Use this job as the working destination for captures, then check folder structure or Drive identifiers only when needed."
      />
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
          Open in Drive
        </Link>
        {membership.role === "owner_admin" && job.status === "active" ? (
          <form action={archiveJobAction.bind(null, businessId, jobId)}>
            <button
              className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
              type="submit"
            >
              Archive job
            </button>
          </form>
        ) : null}
      </div>
      <dl className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <dt className="text-sm text-[color:var(--muted)]">Category</dt>
          <dd className="mt-2 text-lg font-semibold">{job.category_name}</dd>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <dt className="text-sm text-[color:var(--muted)]">Status</dt>
          <dd className="mt-2 text-lg font-semibold">{job.status}</dd>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <dt className="text-sm text-[color:var(--muted)]">Job date</dt>
          <dd className="mt-2 text-lg font-semibold">{job.job_date}</dd>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <dt className="text-sm text-[color:var(--muted)]">Address</dt>
          <dd className="mt-2 text-lg font-semibold">{job.address ?? "Not provided"}</dd>
        </div>
      </dl>
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Folder structure</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            These are the Drive destinations Field-Snap can use after the upload lands in 00
            In-Process.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5"
            >
              <p className="text-sm text-[color:var(--muted)]">{folder.folder_key}</p>
              <h3 className="mt-2 text-lg font-semibold">{folder.folder_name}</h3>
              <p className="mt-2 break-all text-sm text-[color:var(--muted)]">
                {folder.drive_folder_id}
              </p>
            </div>
          ))}
        </div>
      </section>
      <details className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
        <summary className="cursor-pointer list-none text-base font-semibold marker:hidden">
          Technical Drive details
        </summary>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-[color:var(--muted)]">Drive folder id</dt>
            <dd className="mt-1 break-all font-medium">{job.drive_folder_id}</dd>
          </div>
          <div>
            <dt className="text-[color:var(--muted)]">In-Process folder id</dt>
            <dd className="mt-1 break-all font-medium">{job.in_process_folder_id}</dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
