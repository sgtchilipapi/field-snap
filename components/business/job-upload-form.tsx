"use client";

import { useEffect, useRef, useState } from "react";
import { InlineAlert } from "@/components/ui/inline-alert";

type UploadState = "idle" | "uploading" | "uploaded" | "failed";
type UploadMethod = "snap" | "upload";

const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;

function getMethodLabel(method: UploadMethod | null) {
  return method === "snap" ? "Another Snap" : "Upload Another";
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
  const [message, setMessage] = useState<string | null>(null);
  const [lastMethod, setLastMethod] = useState<UploadMethod | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const snapInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoOpenSnap) {
      snapInputRef.current?.click();
    }
  }, [autoOpenSnap]);

  useEffect(() => {
    if (!showSuccessDialog) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowSuccessDialog(false);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [showSuccessDialog, message]);

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
      setState("failed");
      setMessage("Select an image to upload.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setState("failed");
      setMessage("Image uploads must be 15 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    setState("uploading");
    setMessage(null);
    setShowSuccessDialog(false);
    setLastMethod(method);

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
        status?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Upload failed.");
      }

      setState("uploaded");
      setMessage(`Status: ${payload?.status ?? "uploaded_to_in_process"}`);
      setShowSuccessDialog(true);
    } catch (error) {
      setState("failed");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
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

  const isUploading = state === "uploading";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:hidden"
          disabled={isUploading}
          onClick={() => openPicker("snap")}
          type="button"
        >
          {isUploading && lastMethod === "snap" ? "Uploading..." : "Snap"}
        </button>
        <button
          className="inline-flex rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUploading}
          onClick={() => openPicker("upload")}
          type="button"
        >
          {isUploading && lastMethod === "upload" ? "Uploading..." : "Upload"}
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

      <p className="text-sm text-[color:var(--muted)]">
        Snap is available on mobile. Upload is available on mobile and desktop.
        One image per upload, up to 15 MB.
      </p>

      {state === "failed" && message ? (
        <InlineAlert
          description={message}
          title="Upload failed"
          variant="danger"
        />
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
              {message ?? "Status: uploaded_to_in_process"}
            </p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              We’ll file it automatically. This dialog will close in 5 seconds.
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
