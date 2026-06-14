"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { JobList } from "@/components/business/job-list";
import { NewJobForm } from "@/components/business/new-job-form";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import type { CategoryRow } from "@/lib/server/db/schema";
import type { JobWithCategoryRow } from "@/lib/server/data/jobs";

export function JobsWorkspace({
  businessId,
  categories,
  jobs,
  canCreateJob,
  canViewSettings,
  initialDriveConnected,
}: {
  businessId: string;
  categories: CategoryRow[];
  jobs: JobWithCategoryRow[];
  canCreateJob: boolean;
  canViewSettings: boolean;
  initialDriveConnected: boolean;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showDriveDialog, setShowDriveDialog] = useState(false);
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [driveConnectMessage, setDriveConnectMessage] = useState<string | null>(
    null,
  );
  const driveConnectWindowRef = useRef<Window | null>(null);
  const driveStatusPollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      clearDriveConnectFlow({ closeWindow: true });
    };
  }, []);

  function clearDriveConnectFlow(options?: { closeWindow?: boolean }) {
    if (driveStatusPollRef.current !== null) {
      window.clearInterval(driveStatusPollRef.current);
      driveStatusPollRef.current = null;
    }

    if (
      options?.closeWindow &&
      driveConnectWindowRef.current &&
      !driveConnectWindowRef.current.closed
    ) {
      driveConnectWindowRef.current.close();
    }

    if (options?.closeWindow) {
      driveConnectWindowRef.current = null;
    }
  }

  async function checkDriveConnection(stopIfPopupClosed: boolean) {
    try {
      const response = await fetch(
        `/api/businesses/${businessId}/drive/status`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        connected?: boolean;
      } | null;

      if (response.ok && payload?.connected) {
        clearDriveConnectFlow({ closeWindow: true });
        setDriveConnectMessage(null);
        setIsConnectingDrive(false);
        setShowDriveDialog(false);
        setIsCreateOpen(true);
        return true;
      }
    } catch {
      // Keep the dialog open and continue polling while the popup flow is active.
    }

    if (stopIfPopupClosed) {
      clearDriveConnectFlow();
      setIsConnectingDrive(false);
      setDriveConnectMessage(
        "Google Drive is still disconnected. Complete the connection flow and try again.",
      );
    }

    return false;
  }

  function startDriveStatusPolling() {
    clearDriveConnectFlow();

    driveStatusPollRef.current = window.setInterval(() => {
      const popupClosed = Boolean(driveConnectWindowRef.current?.closed);
      void checkDriveConnection(popupClosed);
    }, 1500);
  }

  function connectGoogleDrive() {
    setDriveConnectMessage(null);

    const popupName = `fylerr-drive-connect-${businessId}`;
    const popup = window.open("", popupName, "popup,width=640,height=760");

    if (!popup) {
      setDriveConnectMessage(
        "Allow pop-ups to reconnect Google Drive, then try again.",
      );
      return;
    }

    driveConnectWindowRef.current = popup;
    setIsConnectingDrive(true);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = `/api/businesses/${businessId}/drive/connect`;
    form.target = popupName;
    form.style.display = "none";
    document.body.append(form);
    form.submit();
    form.remove();

    void checkDriveConnection(false);
    startDriveStatusPolling();
  }

  async function onNewJobClick() {
    clearDriveConnectFlow({ closeWindow: true });
    setDriveConnectMessage(null);

    if (initialDriveConnected) {
      setIsCreateOpen(true);
      return;
    }

    setIsCheckingDrive(true);
    const isConnected = await checkDriveConnection(false);
    setIsCheckingDrive(false);

    if (!isConnected) {
      setShowDriveDialog(true);
    }
  }

  function closeDriveDialog() {
    clearDriveConnectFlow({ closeWindow: true });
    setDriveConnectMessage(null);
    setIsConnectingDrive(false);
    setShowDriveDialog(false);
  }

  return (
    <>
      <div className="space-y-5">
        {canCreateJob || canViewSettings ? (
          <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 -mb-1 flex justify-end gap-3 md:static md:mb-0">
            {canViewSettings ? (
              <Link
                className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-6 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
                href={`/businesses/${businessId}/settings`}
              >
                Setup
              </Link>
            ) : null}
            {canViewSettings ? (
              <Link
                className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-6 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
                href={`/businesses/${businessId}/review`}
              >
                Review
              </Link>
            ) : null}
            {canCreateJob ? (
              <button
                className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(213,111,62,0.28)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-[3.25rem]"
                disabled={isCheckingDrive}
                onClick={() => void onNewJobClick()}
                type="button"
              >
                {isCheckingDrive ? "Checking..." : "New job"}
              </button>
            ) : null}
          </div>
        ) : null}

        <JobList businessId={businessId} jobs={jobs} />
      </div>

      {showDriveDialog ? (
        <div
          aria-labelledby="jobs-drive-required-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-[1.5rem] border border-[color:var(--border)] bg-white p-6 shadow-xl">
            <h2
              className="text-lg font-semibold text-[color:var(--foreground)]"
              id="jobs-drive-required-title"
            >
              Connection needed
            </h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Google Drive is disconnected for this business. Reconnect it to
              continue creating jobs.
            </p>
            {driveConnectMessage ? (
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {driveConnectMessage}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isConnectingDrive}
                onClick={connectGoogleDrive}
                type="button"
              >
                {isConnectingDrive ? "Connecting..." : "Connect"}
              </button>
              <button
                className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
                onClick={closeDriveDialog}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateOpen ? (
        <MobileSheet
          closeLabel="Close new job sheet"
          description="Create the job and Fylerr will build the Drive folder structure automatically."
          onClose={() => setIsCreateOpen(false)}
          title="Create a job"
        >
          <NewJobForm
            businessId={businessId}
            categories={categories}
            variant="sheet"
          />
        </MobileSheet>
      ) : null}
    </>
  );
}
