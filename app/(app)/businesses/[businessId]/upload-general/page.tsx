import Link from "next/link";
import { GeneralUploadForm } from "@/components/business/general-upload-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireBusinessPageAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";

export default async function GeneralUploadPage({
  params
}: {
  params: Promise<{ businessId: string }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  const details = await requireBusinessPageAccess({
    businessId,
    userId: session.userId,
    capability: "documents:upload_general"
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="General upload"
        title={`${details.business.name} business documents`}
        description="Upload non-job business documents directly into General Business Docs so Field-Snap can classify and route them in the background."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <GeneralUploadForm businessId={businessId} />
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <p className="text-sm text-[color:var(--muted)]">
            Uploads go first to{" "}
            <span className="font-medium text-[color:var(--foreground)]">
              General Business Docs / 00 In-Process
            </span>{" "}
            before AI routes them into the matching business folder or Needs Review.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
              href={`/businesses/${businessId}/jobs`}
            >
              Back to jobs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
