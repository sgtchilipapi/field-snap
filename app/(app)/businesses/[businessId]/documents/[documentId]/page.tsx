import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentReviewEditor } from "@/components/business/document-review-editor";
import { PageHeader } from "@/components/layout/page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { requireBusinessPageAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { getDocumentDetailForUser, type ReviewServiceError } from "@/lib/server/services/review-service";
import { getDocumentContextLabel } from "@/lib/server/services/review-view";

function formatActionLabel(action: string) {
  return action
    .split(".")
    .join(" ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function formatAmount(amount: string | null, currency: string | null) {
  if (!amount) {
    return "";
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

function getReturnHref(businessId: string, from: string | undefined) {
  if (from?.startsWith(`/businesses/${businessId}/review`)) {
    return from;
  }

  return `/businesses/${businessId}/review`;
}

function summarizeAuditValue(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([key, entryValue]) => `${key.replace(/_/g, " ")}: ${String(entryValue)}`)
    .join(" • ");
}

function getAuditSummary(entry: {
  old_value: unknown | null;
  new_value: unknown | null;
}) {
  const oldSummary = summarizeAuditValue(entry.old_value);
  const newSummary = summarizeAuditValue(entry.new_value);

  if (oldSummary && newSummary) {
    return `Changed from ${oldSummary} to ${newSummary}.`;
  }

  if (newSummary) {
    return newSummary;
  }

  if (oldSummary) {
    return oldSummary;
  }

  return "No field-level changes were recorded for this event.";
}

export default async function DocumentDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ businessId: string; documentId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await requireSession();
  const { businessId, documentId } = await params;
  const { from } = await searchParams;
  await requireBusinessPageAccess({
    businessId,
    userId: session.userId,
    capability: "documents:view_audit"
  });

  let result: Awaited<ReturnType<typeof getDocumentDetailForUser>>;

  try {
    result = await getDocumentDetailForUser({
      businessId,
      documentId,
      userId: session.userId
    });
  } catch (error) {
    if ((error as ReviewServiceError).code === "forbidden" || (error as ReviewServiceError).code === "not_found") {
      notFound();
    }

    throw error;
  }

  const { business, document, auditLogs, jobs, availableJobFolders, availableGeneralFolders } = result;
  const returnHref = getReturnHref(businessId, from);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
          href={returnHref}
        >
          Back to review
        </Link>
        <Link
          className="inline-flex rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
          href={getDriveOpenUrl(document.current_drive_file_id)}
          rel="noreferrer"
          target="_blank"
        >
          Open in Drive
        </Link>
      </div>
      <PageHeader
        eyebrow="Document detail"
        title={document.current_filename ?? document.original_filename ?? "Uploaded document"}
        description={`Review the AI suggestion, Drive location, and audit history for this ${getDocumentContextLabel(document)} upload in ${business.name}.`}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[1.75rem] border border-[color:var(--border)] bg-white">
            <Image
              alt={document.current_filename ?? document.original_filename ?? "Document preview"}
              className="max-h-[42rem] w-full object-contain"
              height={1200}
              src={`/api/businesses/${businessId}/documents/${document.id}/preview`}
              unoptimized
              width={1200}
            />
          </div>
          <section className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <h2 className="text-xl font-semibold">Audit log</h2>
            <div className="mt-5 space-y-4">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-[color:var(--muted)]">
                  No audit rows are available for this document yet.
                </p>
              ) : (
                auditLogs.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-[color:var(--border)] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{formatActionLabel(entry.action)}</p>
                      <p className="text-sm text-[color:var(--muted)]">{formatDateTime(entry.created_at)}</p>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                      Actor: {entry.actor_name ?? entry.actor_email ?? "System"}
                    </p>
                    <p className="mt-3 text-sm text-[color:var(--foreground)]">{getAuditSummary(entry)}</p>
                    {entry.old_value ? (
                      <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-3 text-xs text-slate-100">
                        {JSON.stringify(entry.old_value, null, 2)}
                      </pre>
                    ) : null}
                    {entry.new_value ? (
                      <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-3 text-xs text-slate-100">
                        {JSON.stringify(entry.new_value, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        <div className="space-y-6">
          <section className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <h2 className="text-xl font-semibold">Current state</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="text-[color:var(--muted)]">Status</dt>
                <dd className="mt-1 font-medium">{document.status}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--muted)]">Context</dt>
                <dd className="mt-1 font-medium">{getDocumentContextLabel(document)}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--muted)]">Current folder</dt>
                <dd className="mt-1 font-medium">{document.current_folder_name ?? "Unknown folder"}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--muted)]">Uploaded by</dt>
                <dd className="mt-1 font-medium">{document.uploader_name ?? document.uploader_email}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--muted)]">Uploaded</dt>
                <dd className="mt-1 font-medium">{formatDateTime(document.created_at)}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <h2 className="text-xl font-semibold">AI suggestion</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="text-[color:var(--muted)]">Document type</dt>
                <dd className="mt-1 font-medium">{document.document_type ?? "Pending"}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--muted)]">Target folder key</dt>
                <dd className="mt-1 font-medium">{document.target_folder_key ?? "Pending"}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--muted)]">Confidence</dt>
                <dd className="mt-1 font-medium">
                  {document.ai_confidence ? `${Math.round(Number(document.ai_confidence) * 100)}%` : "Pending"}
                </dd>
              </div>
              <div>
                <dt className="text-[color:var(--muted)]">Reason</dt>
                <dd className="mt-1 font-medium">{document.ai_reason ?? "No AI note available."}</dd>
              </div>
            </dl>
          </section>
          <DocumentReviewEditor
            availableGeneralFolders={availableGeneralFolders}
            availableJobFolders={availableJobFolders}
            businessId={businessId}
            document={document}
            jobs={jobs}
          />
          <InlineAlert
            title="Detected values"
            description={formatAmount(document.amount, document.currency) || "No amount detected for this document."}
          />
        </div>
      </div>
    </div>
  );
}
