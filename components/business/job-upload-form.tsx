"use client";

import { useEffect, useRef, useState } from "react";
import { UploadQueueList } from "@/components/upload-queue/upload-queue-list";
import { useUploadQueue } from "@/lib/upload-queue/use-upload-queue";

type UploadMethod = "snap" | "upload";
type FailureDialogAction = "connect" | "retry";

type FailureDialogState = {
  title: string;
  description: string;
  action: FailureDialogAction;
};

const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;
const SNAP_FILE_ACCEPT = "image/*,.heic,.heif";
const UPLOAD_FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

function getMethodLabel(method: UploadMethod | null) {
  return method === "snap" ? "Snap Another" : "Upload Another";
}

function normalizeUploadErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "We couldn't upload this document. Try again.";
  }

  const normalizedMessage = error.message.trim();

  if (normalizedMessage === "Failed to fetch") {
    return "We couldn't reach Fylerr. Check your connection and try again.";
  }

  return normalizedMessage || "We couldn't upload this document. Try again.";
}

function buildFailureDialogState(message: string): FailureDialogState {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("active google drive connection") ||
    normalizedMessage.includes("google drive needs to be reconnected")
  ) {
    return {
      title: "Connection needed",
      description:
        "Google Drive is disconnected for this business. Reconnect it to continue uploading documents.",
      action: "connect",
    };
  }

  if (normalizedMessage.includes("15 mb")) {
    return {
      title: "File too large",
      description: message,
      action: "retry",
    };
  }

  if (normalizedMessage.includes("only image uploads")) {
    return {
      title: "Unsupported file",
      description: message,
      action: "retry",
    };
  }

  if (
    normalizedMessage.includes("select an image") ||
    normalizedMessage.includes("attach one image")
  ) {
    return {
      title: "No image selected",
      description: message,
      action: "retry",
    };
  }

  if (normalizedMessage.includes("too many uploads")) {
    return {
      title: "Too many uploads",
      description: message,
      action: "retry",
    };
  }

  if (
    normalizedMessage.includes("do not have access") ||
    normalizedMessage === "forbidden"
  ) {
    return {
      title: "Access denied",
      description:
        "You don't have permission to upload documents for this business.",
      action: "retry",
    };
  }

  if (normalizedMessage === "unauthorized") {
    return {
      title: "Session expired",
      description:
        "Your session expired before the upload completed. Sign in again and try again.",
      action: "retry",
    };
  }

  if (
    normalizedMessage.includes("job not found") ||
    normalizedMessage === "not found"
  ) {
    return {
      title: "Job unavailable",
      description:
        "This job is no longer available for uploads. Refresh the page and try again.",
      action: "retry",
    };
  }

  return {
    title: "Upload failed",
    description: message,
    action: "retry",
  };
}

export function JobUploadForm({
  businessId,
  jobId,
  autoOpenSnap = false,
}: {
  businessId: string;
  jobId: string;
  autoOpenSnap?: boolean;
}) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastMethod, setLastMethod] = useState<UploadMethod | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogCountdown, setSuccessDialogCountdown] = useState(5);
  const [failureDialog, setFailureDialog] = useState<FailureDialogState | null>(
    null,
  );
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    method: UploadMethod;
  } | null>(null);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [driveConnectMessage, setDriveConnectMessage] = useState<string | null>(
    null,
  );
  const snapInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const failureDialogRef = useRef<HTMLDivElement>(null);
  const driveConnectWindowRef = useRef<Window | null>(null);
  const driveStatusPollRef = useRef<number | null>(null);
  const isFailureDialogOpen = failureDialog !== null;
  const isAnyDialogOpen = showSuccessDialog || isFailureDialogOpen;
  const uploadQueue = useUploadQueue({
    businessId,
    jobId,
    captureContext: "job",
  });

  useEffect(() => {
    if (autoOpenSnap) {
      snapInputRef.current?.click();
    }
  }, [autoOpenSnap]);

  useEffect(() => {
    if (!showSuccessDialog) {
      return;
    }

    setSuccessDialogCountdown(5);

    const intervalId = window.setInterval(() => {
      setSuccessDialogCountdown((currentCountdown) => {
        if (currentCountdown <= 1) {
          window.clearInterval(intervalId);
          setShowSuccessDialog(false);
          return 0;
        }

        return currentCountdown - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [showSuccessDialog]);

  useEffect(() => {
    if (!isAnyDialogOpen) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isAnyDialogOpen]);

  useEffect(() => {
    if (isFailureDialogOpen) {
      failureDialogRef.current?.focus();
    }
  }, [isFailureDialogOpen]);

  useEffect(() => {
    return () => {
      if (driveStatusPollRef.current !== null) {
        window.clearInterval(driveStatusPollRef.current);
      }

      driveStatusPollRef.current = null;

      if (
        driveConnectWindowRef.current &&
        !driveConnectWindowRef.current.closed
      ) {
        driveConnectWindowRef.current.close();
      }

      driveConnectWindowRef.current = null;
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

  function openFailureDialog(
    message: string,
    method: UploadMethod,
    file: File,
  ) {
    clearDriveConnectFlow({ closeWindow: true });
    setSuccessMessage(null);
    setShowSuccessDialog(false);
    setPendingUpload({ file, method });
    setLastMethod(method);
    setDriveConnectMessage(null);
    setIsConnectingDrive(false);
    setFailureDialog(buildFailureDialogState(message));
  }

  function closeFailureDialog() {
    clearDriveConnectFlow({ closeWindow: true });
    setDriveConnectMessage(null);
    setIsConnectingDrive(false);
    setFailureDialog(null);
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
        setFailureDialog(null);
        return;
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

  function openPicker(method: UploadMethod) {
    if (method === "snap") {
      snapInputRef.current?.click();
      return;
    }

    uploadInputRef.current?.click();
  }

  async function uploadFile(file: File, method: UploadMethod) {
    if (file.size === 0) {
      openFailureDialog("Select an image to upload.", method, file);
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      openFailureDialog(
        "Image uploads must be 15 MB or smaller.",
        method,
        file,
      );
      return;
    }

    clearDriveConnectFlow({ closeWindow: true });
    setSuccessMessage(null);
    setFailureDialog(null);
    setShowSuccessDialog(false);
    setPendingUpload({ file, method });
    setLastMethod(method);
    setDriveConnectMessage(null);
    setIsConnectingDrive(false);

    try {
      await uploadQueue.enqueue({
        businessId,
        jobId,
        captureContext: "job",
        endpointPath: `/api/businesses/${businessId}/jobs/${jobId}/documents/upload`,
        file,
      });
      setSuccessMessage(
        "Your photo is queued. Keep Fylerr open and it will upload to Google Drive automatically.",
      );
      setShowSuccessDialog(true);
    } catch (error) {
      openFailureDialog(normalizeUploadErrorMessage(error), method, file);
    }
  }

  function onFileChange(
    method: UploadMethod,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    void uploadFile(file, method);
  }

  function onAnother() {
    const method = lastMethod ?? "upload";
    setShowSuccessDialog(false);
    window.setTimeout(() => openPicker(method), 0);
  }

  function retryUpload() {
    if (!pendingUpload) {
      closeFailureDialog();
      return;
    }

    setFailureDialog(null);
    setDriveConnectMessage(null);
    setIsConnectingDrive(false);
    void uploadFile(pendingUpload.file, pendingUpload.method);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:hidden"
          onClick={() => openPicker("snap")}
          type="button"
        >
          Snap
        </button>
        <button
          className="inline-flex rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => openPicker("upload")}
          type="button"
        >
          Upload
        </button>
      </div>

      <input
        ref={snapInputRef}
        accept={SNAP_FILE_ACCEPT}
        capture="environment"
        className="sr-only"
        onChange={(event) => onFileChange("snap", event)}
        type="file"
      />
      <input
        ref={uploadInputRef}
        accept={UPLOAD_FILE_ACCEPT}
        className="sr-only"
        onChange={(event) => onFileChange("upload", event)}
        type="file"
      />

      <UploadQueueList
        items={uploadQueue.items}
        onRemove={(id) => void uploadQueue.remove(id)}
        onRetry={(id) => void uploadQueue.retry(id)}
        storageError={uploadQueue.storageError}
      />

      {failureDialog ? (
        <div
          aria-labelledby="job-upload-failure-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
        >
          <div
            ref={failureDialogRef}
            className="w-full max-w-md rounded-[1.5rem] border border-[color:var(--border)] bg-white p-6 shadow-xl outline-none"
            tabIndex={-1}
          >
            <h2
              className="text-lg font-semibold text-[color:var(--foreground)]"
              id="job-upload-failure-title"
            >
              {failureDialog.title}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {failureDialog.description}
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
                onClick={
                  failureDialog.action === "connect"
                    ? connectGoogleDrive
                    : retryUpload
                }
                type="button"
              >
                {failureDialog.action === "connect"
                  ? isConnectingDrive
                    ? "Connecting..."
                    : "Connect"
                  : "Try Again"}
              </button>
              <button
                className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
                onClick={closeFailureDialog}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSuccessDialog ? (
        <div
          aria-labelledby="job-upload-success-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-[1.5rem] border border-[color:var(--border)] bg-white p-6 shadow-xl">
            <h2
              className="text-lg font-semibold text-[color:var(--foreground)]"
              id="job-upload-success-title"
            >
              Upload started
            </h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {successMessage ?? "Classifying the document..."}
            </p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              This dialog will close in {successDialogCountdown} second/s.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                onClick={onAnother}
                type="button"
              >
                {getMethodLabel(lastMethod)}
              </button>
              <button
                className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
                onClick={() => setShowSuccessDialog(false)}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
