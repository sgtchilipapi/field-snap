"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { InlineAlert } from "@/components/ui/inline-alert";
import type { DocumentListItemRow } from "@/lib/server/data/documents";
import type { JobWithCategoryRow } from "@/lib/server/data/jobs";

type FolderOption = {
  key: string;
  name: string;
};

type Notice =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

function normalizeString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function DocumentReviewEditor({
  businessId,
  document,
  jobs,
  availableJobFolders,
  availableGeneralFolders
}: {
  businessId: string;
  document: DocumentListItemRow;
  jobs: JobWithCategoryRow[];
  availableJobFolders: FolderOption[];
  availableGeneralFolders: FolderOption[];
}) {
  const router = useRouter();
  const [context, setContext] = useState<"job" | "general">(document.job_id ? "job" : "general");
  const [jobId, setJobId] = useState(document.job_id ?? "");
  const [targetFolderKey, setTargetFolderKey] = useState(
    document.target_folder_key ?? document.current_folder_key ?? ""
  );
  const [documentType, setDocumentType] = useState(document.document_type ?? "");
  const [vendorOrParty, setVendorOrParty] = useState(document.vendor_or_party ?? "");
  const [documentDate, setDocumentDate] = useState(document.document_date ?? "");
  const [amount, setAmount] = useState(document.amount ?? "");
  const [currency, setCurrency] = useState(document.currency ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(document.invoice_number ?? "");
  const [dueDate, setDueDate] = useState(document.due_date ?? "");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const folderOptions = context === "job" ? availableJobFolders : availableGeneralFolders;

  async function submitReview(markReviewed: boolean) {
    if (pending) {
      return;
    }

    setPending(true);
    setNotice(null);

    try {
      const payload = {
        job_id: context === "job" ? jobId || null : null,
        target_folder_key: targetFolderKey,
        document_type: normalizeString(documentType),
        vendor_or_party: normalizeString(vendorOrParty),
        document_date: normalizeString(documentDate),
        amount: normalizeString(amount),
        currency: normalizeString(currency),
        invoice_number: normalizeString(invoiceNumber),
        due_date: normalizeString(dueDate),
        mark_reviewed: markReviewed
      };

      const response = await fetch(
        markReviewed
          ? `/api/businesses/${businessId}/documents/${document.id}/review`
          : `/api/businesses/${businessId}/documents/${document.id}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error ?? "Review update failed.");
      }

      setNotice({
        type: "success",
        message: markReviewed ? "Document marked reviewed." : "Review changes saved."
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Review update failed."
      });
    } finally {
      setPending(false);
    }
  }

  async function markReviewedOnly() {
    if (pending) {
      return;
    }

    setPending(true);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/businesses/${businessId}/documents/${document.id}/mark-reviewed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            mark_reviewed: true
          })
        }
      );

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error ?? "Mark reviewed failed.");
      }

      setNotice({
        type: "success",
        message: "Document marked reviewed."
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Mark reviewed failed."
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Review correction</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Correct the destination, update metadata, and then mark the document reviewed once the Drive location and fields are right.
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-5">
        <div className="space-y-3">
          <p className="text-sm font-medium text-[color:var(--foreground)]">Destination context</p>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm">
              <input
                checked={context === "job"}
                disabled={pending}
                name="destination-context"
                onChange={() => setContext("job")}
                type="radio"
              />
              Job document
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm">
              <input
                checked={context === "general"}
                disabled={pending}
                name="destination-context"
                onChange={() => setContext("general")}
                type="radio"
              />
              General business document
            </label>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--foreground)]">Job</span>
            <select
              className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm"
              disabled={pending || context !== "job"}
              onChange={(event) => setJobId(event.target.value)}
              value={jobId}
            >
              <option value="">Select a job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.client_name} - {job.job_name} ({job.status})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--foreground)]">Target folder</span>
            <select
              className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm"
              disabled={pending}
              onChange={(event) => setTargetFolderKey(event.target.value)}
              value={targetFolderKey}
            >
              <option value="">Select a folder</option>
              {folderOptions.map((folder) => (
                <option key={folder.key} value={folder.key}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--foreground)]">Document type</span>
            <input
              className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm"
              disabled={pending}
              onChange={(event) => setDocumentType(event.target.value)}
              type="text"
              value={documentType}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--foreground)]">Vendor or party</span>
            <input
              className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm"
              disabled={pending}
              onChange={(event) => setVendorOrParty(event.target.value)}
              type="text"
              value={vendorOrParty}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--foreground)]">Document date</span>
            <input
              className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm"
              disabled={pending}
              onChange={(event) => setDocumentDate(event.target.value)}
              type="date"
              value={documentDate}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--foreground)]">Amount</span>
            <input
              className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm"
              disabled={pending}
              onChange={(event) => setAmount(event.target.value)}
              type="text"
              value={amount}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--foreground)]">Currency</span>
            <input
              className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm"
              disabled={pending}
              onChange={(event) => setCurrency(event.target.value)}
              type="text"
              value={currency}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--foreground)]">Invoice number</span>
            <input
              className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm"
              disabled={pending}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              type="text"
              value={invoiceNumber}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--foreground)]">Due date</span>
            <input
              className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm"
              disabled={pending}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </label>
        </div>
        {notice ? (
          <InlineAlert
            description={notice.message}
            title={notice.type === "success" ? "Review updated" : "Review update failed"}
            variant={notice.type === "success" ? "success" : "danger"}
          />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            onClick={() => void submitReview(false)}
            type="button"
          >
            {pending ? "Saving..." : "Save review changes"}
          </button>
          <button
            className="rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            onClick={() => void markReviewedOnly()}
            type="button"
          >
            {pending ? "Updating..." : "Mark reviewed"}
          </button>
        </div>
      </div>
    </section>
  );
}
