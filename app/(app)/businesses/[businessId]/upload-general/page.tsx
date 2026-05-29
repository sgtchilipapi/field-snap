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
  await requireBusinessPageAccess({
    businessId,
    userId: session.userId,
    capability: "documents:upload_general"
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="General upload"
        title="Upload business documents"
        description="Use this only for documents that do not belong to a job."
      />
      <div className="space-y-4">
        <GeneralUploadForm businessId={businessId} />
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <p className="text-sm leading-6 text-[color:var(--muted)]">
            General uploads land in{" "}
            <span className="font-medium text-[color:var(--foreground)]">
              General Business Docs / 00 In-Process
            </span>{" "}
            first, then Field-Snap routes them into the matching business folder or Needs Review.
          </p>
        </div>
        <Link
          className="inline-flex w-full items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)] sm:w-auto"
          href={`/businesses/${businessId}/jobs`}
        >
          Back to jobs
        </Link>
      </div>
    </div>
  );
}
