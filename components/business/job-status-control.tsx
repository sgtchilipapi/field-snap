"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { InlineAlert } from "@/components/ui/inline-alert";
import type { JobRow } from "@/lib/server/db/schema";
import { cn } from "@/lib/utils";

function formatStatusLabel(status: JobRow["status"] | "completed") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatusOptionButton({
  children,
  current,
  disabled = false,
  onClick
}: {
  children: ReactNode;
  current?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn(
        "flex min-h-12 w-full items-center justify-between rounded-[1rem] border px-4 py-3 text-left text-sm font-medium transition",
        disabled
          ? "cursor-not-allowed border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--muted)] opacity-70"
          : current
            ? "border-[color:var(--foreground)] bg-[color:var(--surface-muted)] text-[color:var(--foreground)]"
            : "border-[color:var(--border)] bg-white text-[color:var(--foreground)] hover:border-[color:var(--foreground)]"
      )}
      disabled={disabled || current}
      onClick={onClick}
      type="button"
    >
      <span>{children}</span>
      {current ? <span className="text-[color:var(--muted)]">Current</span> : null}
    </button>
  );
}

export function JobStatusControl({
  businessId,
  currentStatus,
  jobId
}: {
  businessId: string;
  currentStatus: JobRow["status"];
  jobId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  async function changeStatus(status: JobRow["status"]) {
    setError(null);

    const response = await fetch(`/api/businesses/${businessId}/jobs/${jobId}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      let message = "Could not update the job status.";

      try {
        const body = (await response.json()) as { error?: string };

        if (body.error) {
          message = body.error;
        }
      } catch {}

      setError(message);
      return;
    }

    setIsOpen(false);
    startTransition(() => {
      router.refresh();
    });
  }

  function onChooseStatus(status: JobRow["status"]) {
    if (isPending) {
      return;
    }

    void changeStatus(status);
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="text-lg font-semibold">{formatStatusLabel(currentStatus)}</span>
        <button
          aria-controls="job-status-sheet"
          aria-expanded={isOpen}
          className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={() => setIsOpen(true)}
          type="button"
        >
          {isPending ? "Saving..." : "Change"}
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close status picker"
            className="absolute inset-0 bg-[color:var(--foreground)]/28"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <aside
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="absolute inset-x-3 bottom-3 rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5 shadow-[var(--shadow-shell)] md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2"
            id="job-status-sheet"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Job status
                </p>
                <h2 className="mt-2 text-lg font-semibold" id={titleId}>
                  Change status
                </h2>
                <p
                  className="mt-2 text-sm leading-6 text-[color:var(--muted)]"
                  id={descriptionId}
                >
                  Choose the current lifecycle state for this job.
                </p>
              </div>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-sm font-medium transition hover:border-[color:var(--foreground)]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            {error ? (
              <div className="mt-6">
                <InlineAlert
                  title="Status change failed"
                  description={error}
                  variant="danger"
                />
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              <StatusOptionButton
                current={currentStatus === "active"}
                disabled={isPending}
                onClick={() => onChooseStatus("active")}
              >
                Active
              </StatusOptionButton>

              <div>
                <StatusOptionButton
                current={currentStatus === "completed"}
                disabled={isPending}
                onClick={() => onChooseStatus("completed")}
                >
                  Completed
                </StatusOptionButton>
              </div>

              <StatusOptionButton
                current={currentStatus === "archived"}
                disabled={isPending}
                onClick={() => onChooseStatus("archived")}
              >
                Archived
              </StatusOptionButton>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
