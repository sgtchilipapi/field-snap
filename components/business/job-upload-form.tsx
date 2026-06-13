"use client";

import { useEffect, useRef, useState } from "react";

type UploadState = "idle" | "uploading" | "uploaded" | "failed";
type UploadMethod = "snap" | "upload";
type FailureDialogAction = "connect" | "retry";

type FailureDialogState = {
  title: string;
  description: string;
  action: FailureDialogAction;
};

const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;

function getMethodLabel(method: UploadMethod | null) {
  return method === "snap" ? "Another Snap" : "Upload Another";
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
      title: "Reconnect Google Drive",
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

  if (normalizedMessage.includes("do not have access") || normalizedMessage === "forbidden") {
    return {
      title: "Access denied",
      description: "You don't have permission to upload documents for this business.",
      action: "retry",
    };
  }

  if (normalizedMessage === "unauthorized") {
    return {
      title: "Session expired",
      description: "Your session expired before the upload completed. Sign in again and try again.",
      action: "retry",
    };
  }

  if (normalizedMessage.includes("job not found") || normalizedMessage === "not found") {
    return {
      title: "Job unavailable",
      description: "This job is no longer available for uploads. Refresh the page and try again.",
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
  const [state, setState] = useState<UploadState>("idle");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastMethod, setLastMethod] = useState<UploadMethod | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogCountdown, setSuccessDialogCountdown] = useState(10);
  const [failureDialog, setFailureDialog] = useState<FailureDialogState | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    method: UploadMethod;
  } | null>(null);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [driveConnectMessage, setDriveConnectMessage] = useState<string | null>(null);
  const snapInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadingDialogRef = useRef<HTMLDivElement>(null);
  const failureDialogRef = useRef<HTMLDivElement>(null);
  const driveConnectWindowRef = useRef<Window | null>(null);
  const driveStatusPollRef = useRef<number | null>(null);
  const isUploading = state === "uploading";
  const isFailureDialogOpen = failureDialog !== null;
  const isAnyDialogOpen = isUploading || showSuccessDialog || isFailureDialogOpen;

  useEffect(() => {
    if (autoOpenSnap) {
      snapInputRef.current?.click();
    }
  }, [autoOpenSnap]);

  useEffect(() => {
    if (!showSuccessDialog) {
      return;
    }

    setSuccessDialogCountdown(10);

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
    if (isUploading) {
      uploadingDialogRef.current?.focus();
    }
  }, [isUploading]);

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

      if (driveConnectWindowRef.current && !driveConnectWindowRef.current.closed) {
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

    if (options?.closeWindow && driveConnectWindowRef.current && !driveConnectWindowRef.current.closed) {
      driveConnectWindowRef.current.close();
    }

    if (options?.closeWindow) {
      driveConnectWindowRef.current = null;
    }
  }

  function openFailureDialog(message: string, method: UploadMethod, file: File) {
    clearDriveConnectFlow({ closeWindow: true });
    setState("failed");
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
    setState("idle");
  }

  async function checkDriveConnection(stopIfPopupClosed: boolean) {
    try {
      const response = await fetch(`/api/businesses/${businessId}/drive/status`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        connected?: boolean;
      } | null;

      if (response.ok && payload?.connected) {
        clearDriveConnectFlow({ closeWindow: true });
        setDriveConnectMessage(null);
        setIsConnectingDrive(false);
        setFailureDialog(null);
        setState("idle");
        return;
      }
    } catch {
      // Keep the dialog open and continue polling while the popup flow is active.
    }

    if (stopIfPopupClosed) {
      clearDriveConnectFlow();
      setIsConnectingDrive(false);
      setDriveConnectMessage("Google Drive is still disconnected. Complete the connection flow and try again.");
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
      setDriveConnectMessage("Allow pop-ups to reconnect Google Drive, then try again.");
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
    if (state === "uploading") {
      return;
    }

    if (method === "snap") {
      snapInputRef.current?.click();
      return;
    }

    uploadInputRef.current?.click();
  }

  async function uploadFile(file: File, method: UploadMethod) {
    if (state === "uploading") {
      return;
    }

    if (file.size === 0) {
      openFailureDialog("Select an image to upload.", method, file);
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      openFailureDialog("Image uploads must be 15 MB or smaller.", method, file);
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    clearDriveConnectFlow({ closeWindow: true });
    setState("uploading");
    setSuccessMessage(null);
    setFailureDialog(null);
    setShowSuccessDialog(false);
    setPendingUpload({ file, method });
    setLastMethod(method);
    setDriveConnectMessage(null);
    setIsConnectingDrive(false);

    try {
      const response = await fetch(
        `/api/businesses/${businessId}/jobs/${jobId}/documents/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        document_id?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Upload failed.");
      }

      setState("uploaded");
      setSuccessMessage("Uploaded. Classifying the document...");
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
          disabled={isUploading}
          onClick={() => openPicker("snap")}
          type="button"
        >
          Snap
        </button>
        <button
          className="inline-flex rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUploading}
          onClick={() => openPicker("upload")}
          type="button"
        >
          Upload
        </button>
      </div>

      <input
        ref={snapInputRef}
        accept="image/*,.heic,.heif"
        capture="environment"
        className="sr-only"
        disabled={isUploading}
        onChange={(event) => onFileChange("snap", event)}
        type="file"
      />
      <input
        ref={uploadInputRef}
        accept="image/*,.heic,.heif"
        className="sr-only"
        disabled={isUploading}
        onChange={(event) => onFileChange("upload", event)}
        type="file"
      />

      {isUploading ? (
        <div
          aria-labelledby="job-upload-progress-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
        >
          <div
            ref={uploadingDialogRef}
            className="w-full max-w-sm rounded-[1.5rem] border border-[color:var(--border)] bg-white p-6 text-center shadow-xl outline-none"
            tabIndex={-1}
          >
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--border)] border-t-[color:var(--accent)]" />
            <h2
              className="mt-5 text-lg font-semibold text-[color:var(--foreground)]"
              id="job-upload-progress-title"
            >
              Uploading document. Please wait a moment...
            </h2>
          </div>
        </div>
      ) : null}

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
                  failureDialog.action === "connect" ? connectGoogleDrive : retryUpload
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
              Upload received
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
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
