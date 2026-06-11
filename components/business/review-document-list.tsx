import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  getDocumentContextLabel,
  type ReviewView
} from "@/lib/server/services/review-view";
import type { DocumentListItemRow } from "@/lib/server/data/documents";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function formatAmount(amount: string | null, currency: string | null) {
  if (!amount) {
    return "Not available";
  }

  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount)) {
    return amount;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD"
    }).format(numericAmount);
  } catch {
    return amount;
  }
}

function getDriveOpenUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

function buildViewHref(businessId: string, view: ReviewView) {
  const params = new URLSearchParams();
  params.set("view", view);
  return `/businesses/${businessId}/review?${params.toString()}`;
}

export function ReviewDocumentList({
  businessId,
  documents,
  currentView
}: {
  businessId: string;
  documents: DocumentListItemRow[];
  currentView: ReviewView;
}) {
  const currentPath = buildViewHref(businessId, currentView);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          { key: "needs-review" as const, label: "Needs Review" },
          { key: "recent" as const, label: "Recent Uploads" },
          { key: "failed" as const, label: "Failed" }
        ].map((view) => (
          <Link
            key={view.key}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition",
              currentView === view.key
                ? "border-[color:var(--foreground)] bg-[color:var(--foreground)] text-white"
                : "border-[color:var(--border)] bg-white text-[color:var(--foreground)] hover:border-[color:var(--foreground)]"
            )}
            href={buildViewHref(businessId, view.key)}
          >
            {view.label}
          </Link>
        ))}
      </div>
      {documents.length === 0 ? (
        <EmptyState
          title="No documents in this view"
          description="Uploads that need attention, recently arrived documents, and failed processing runs will show up here as Fylerr routes them."
        />
      ) : (
        <div className="grid gap-4">
          {documents.map((document) => (
            <div
              key={document.id}
              className="grid gap-4 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 lg:grid-cols-[10rem_minmax(0,1fr)]"
            >
              <Link
                className="overflow-hidden rounded-[1.25rem] border border-[color:var(--border)] bg-white"
                href={`/businesses/${businessId}/documents/${document.id}?from=${encodeURIComponent(currentPath)}`}
              >
                <Image
                  alt={document.current_filename ?? document.document_type ?? "Document preview"}
                  className="h-40 w-full object-cover"
                  height={160}
                  loading="lazy"
                  src={`/api/businesses/${businessId}/documents/${document.id}/preview`}
                  unoptimized
                  width={160}
                />
              </Link>
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {document.current_filename ?? document.original_filename ?? "Untitled upload"}
                    </h2>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                      {getDocumentContextLabel(document)} · {document.current_folder_name ?? "Unknown folder"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-800">
                      {document.status}
                    </span>
                    {document.failure_reason ? (
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">
                        {document.failure_reason}
                      </span>
                    ) : null}
                  </div>
                </div>
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-[color:var(--muted)]">Document type</dt>
                    <dd className="mt-1 font-medium">{document.document_type ?? "Pending AI result"}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--muted)]">Vendor or party</dt>
                    <dd className="mt-1 font-medium">{document.vendor_or_party ?? "Not available"}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--muted)]">Document date</dt>
                    <dd className="mt-1 font-medium">{document.document_date ?? "Not available"}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--muted)]">Amount</dt>
                    <dd className="mt-1 font-medium">
                      {formatAmount(document.amount, document.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--muted)]">Uploader</dt>
                    <dd className="mt-1 font-medium">
                      {document.uploader_name ?? document.uploader_email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--muted)]">Confidence</dt>
                    <dd className="mt-1 font-medium">
                      {document.ai_confidence ? `${Math.round(Number(document.ai_confidence) * 100)}%` : "Pending"}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-[color:var(--muted)]">
                    Uploaded {formatDateTime(document.created_at)}
                  </span>
                  <Link
                    className="font-medium text-[color:var(--foreground)] underline underline-offset-4"
                    href={`/businesses/${businessId}/documents/${document.id}?from=${encodeURIComponent(currentPath)}`}
                  >
                    Open detail
                  </Link>
                  <Link
                    className="font-medium text-[color:var(--foreground)] underline underline-offset-4"
                    href={getDriveOpenUrl(document.current_drive_file_id)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open in Drive
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
