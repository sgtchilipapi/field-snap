"use client";

import Link from "next/link";
import type { UploadQueueViewItem } from "@/lib/upload-queue/types";

function isDriveConnectionError(message?: string) {
  const normalizedMessage = message?.toLowerCase() ?? "";

  return (
    normalizedMessage.includes("active google drive connection") ||
    normalizedMessage.includes("google drive needs to be reconnected")
  );
}

function getStatusLabel(status: UploadQueueViewItem["status"]) {
  if (status === "queued") {
    return "Queued";
  }

  if (status === "uploading") {
    return "Uploading...";
  }

  if (status === "uploaded") {
    return "Uploaded";
  }

  if (status === "blocked") {
    return "Action needed";
  }

  return "Upload failed";
}

function getStatusClassName(status: UploadQueueViewItem["status"]) {
  if (status === "uploaded") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "failed" || status === "blocked") {
    return "bg-red-50 text-red-700";
  }

  if (status === "uploading") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadQueueList({
  businessId,
  canManageDrive = false,
  items,
  mergeWithUploadsSection = false,
  storageError,
  onRetry,
  onRemove,
}: {
  businessId?: string;
  canManageDrive?: boolean;
  items: UploadQueueViewItem[];
  mergeWithUploadsSection?: boolean;
  storageError?: string | null;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!storageError && items.length === 0) {
    return null;
  }

  const content = (
    <>
      {!mergeWithUploadsSection ? (
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
            Upload queue
          </h3>
          <p className="text-xs text-[color:var(--muted)]">
            Files are saved locally until Fylerr sends them to Google Drive
            while this app is open.
          </p>
        </div>
      ) : null}

      {storageError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {storageError}
        </div>
      ) : null}

      {items.map((item) => {
        const hasDriveConnectionError = isDriveConnectionError(item.lastError);

        return (
          <div
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3"
            key={item.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[color:var(--foreground)]">
                  {item.originalFilename}
                </p>
                <p className="text-xs text-[color:var(--muted)]">
                  {formatFileSize(item.fileSizeBytes)} · Attempt{" "}
                  {item.attemptCount + 1}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClassName(item.status)}`}
              >
                {getStatusLabel(item.status)}
              </span>
            </div>

            {item.lastError ? (
              <p className="mt-2 text-sm text-red-700">{item.lastError}</p>
            ) : null}

            {item.status === "failed" || item.status === "blocked" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {hasDriveConnectionError ? (
                  canManageDrive && businessId ? (
                    <Link
                      className="rounded-full bg-[color:var(--foreground)] px-3 py-1.5 text-xs font-medium text-white"
                      href={`/businesses/${businessId}/settings`}
                    >
                      Connect
                    </Link>
                  ) : (
                    <button
                      className="rounded-full bg-[color:var(--foreground)] px-3 py-1.5 text-xs font-medium text-white"
                      type="button"
                    >
                      Request Connection
                    </button>
                  )
                ) : (
                  <button
                    className="rounded-full bg-[color:var(--foreground)] px-3 py-1.5 text-xs font-medium text-white"
                    onClick={() => onRetry(item.id)}
                    type="button"
                  >
                    Try again
                  </button>
                )}
                <button
                  className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)]"
                  onClick={() => onRemove(item.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );

  if (mergeWithUploadsSection) {
    return <div className="space-y-3">{content}</div>;
  }

  return (
    <section className="space-y-3 rounded-[1.5rem] border border-[color:var(--border)] bg-white p-4">
      {content}
    </section>
  );
}
