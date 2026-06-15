"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { retryJobDocumentAction } from "@/app/(app)/businesses/[businessId]/jobs/[jobId]/actions";
import { UploadQueueList } from "@/components/upload-queue/upload-queue-list";
import { EmptyState } from "@/components/ui/empty-state";
import type { DocumentListItemRow } from "@/lib/server/data/documents";
import { useUploadQueue } from "@/lib/upload-queue/use-upload-queue";

type UploadState = "Success" | "Failed" | "Pending";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getUploadState(status: DocumentListItemRow["status"]): UploadState {
  if (status === "failed") {
    return "Failed";
  }

  if (status === "uploaded_to_in_process" || status === "ai_processing") {
    return "Pending";
  }

  return "Success";
}

function getDisplayName(document: DocumentListItemRow) {
  const state = getUploadState(document.status);

  if (state === "Success" && document.current_filename) {
    return document.current_filename;
  }

  return formatDateTime(document.created_at);
}

function getDriveFolderOpenUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

function getStatusClass(state: UploadState) {
  if (state === "Success") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (state === "Failed") {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-amber-100 text-amber-800";
}

export function JobUploadList({
  businessId,
  canManageDrive = false,
  jobId,
  documents,
}: {
  businessId: string;
  canManageDrive?: boolean;
  jobId: string;
  documents: DocumentListItemRow[];
}) {
  const [previewDocument, setPreviewDocument] =
    useState<DocumentListItemRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const uploadQueue = useUploadQueue({
    businessId,
    jobId,
    captureContext: "job",
  });
  const hasPendingLocalUploads =
    Boolean(uploadQueue.storageError) || uploadQueue.items.length > 0;

  return (
    <section className="space-y-4 rounded-[1.5rem] bg-[color:var(--surface)] p-5">
      <div>
        <h2 className="text-lg font-semibold">Uploads</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Most recent job uploads are shown first.
        </p>
      </div>

      {documents.length === 0 && !hasPendingLocalUploads ? (
        <EmptyState
          title="No uploads yet"
          description="Photos and documents uploaded for this job will appear here."
        />
      ) : null}

      {documents.length > 0 ? (
        <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-[1.25rem] border border-[color:var(--border)] bg-white">
          {documents.map((document) => {
            const state = getUploadState(document.status);
            return (
              <div
                key={document.id}
                className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_7rem_10rem] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[color:var(--foreground)]">
                    {getDisplayName(document)}
                  </p>
                  {document.failure_reason ? (
                    <p className="mt-1 text-sm text-rose-700">
                      {document.failure_reason}
                    </p>
                  ) : null}
                </div>
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(state)}`}
                  >
                    {state}
                  </span>
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <button
                    aria-label={`Preview ${getDisplayName(document)}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-lg transition hover:border-[color:var(--foreground)]"
                    type="button"
                    onClick={() => setPreviewDocument(document)}
                  >
                    🖼️
                  </button>
                  {state === "Success" ? (
                    <Link
                      aria-label={`Open Drive folder for ${getDisplayName(document)}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-lg transition hover:border-[color:var(--foreground)]"
                      href={getDriveFolderOpenUrl(
                        document.current_drive_folder_id,
                      )}
                      rel="noreferrer"
                      target="_blank"
                    >
                      📁
                    </Link>
                  ) : state === "Failed" ? (
                    <button
                      aria-label={`Retry ${getDisplayName(document)}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-lg transition hover:border-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isPending}
                      type="button"
                      onClick={() => {
                        startTransition(() => {
                          void retryJobDocumentAction(
                            businessId,
                            jobId,
                            document.id,
                          );
                        });
                      }}
                    >
                      ↻
                    </button>
                  ) : (
                    <button
                      aria-label={`Drive folder unavailable while ${getDisplayName(document)} is pending`}
                      className="inline-flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full border border-[color:var(--border)] bg-slate-100 text-lg opacity-50"
                      disabled
                      type="button"
                    >
                      📁
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {hasPendingLocalUploads ? (
        <UploadQueueList
          businessId={businessId}
          canManageDrive={canManageDrive}
          items={uploadQueue.items}
          mergeWithUploadsSection
          onRemove={(id) => void uploadQueue.remove(id)}
          onRetry={(id) => void uploadQueue.retry(id)}
          storageError={uploadQueue.storageError}
        />
      ) : null}

      {previewDocument ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[1.5rem] bg-white shadow-xl">
            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--border)] p-4">
              <h3 className="truncate font-semibold">
                {getDisplayName(previewDocument)}
              </h3>
              <button
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-sm font-medium"
                type="button"
                onClick={() => setPreviewDocument(null)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto bg-slate-950 p-3">
              <Image
                alt={getDisplayName(previewDocument)}
                className="mx-auto h-auto max-h-[72vh] w-auto max-w-full rounded-lg object-contain"
                height={900}
                src={`/api/businesses/${businessId}/documents/${previewDocument.id}/preview`}
                unoptimized
                width={1200}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
