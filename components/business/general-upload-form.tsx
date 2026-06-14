"use client";

import { useState } from "react";
import { UploadQueueList } from "@/components/upload-queue/upload-queue-list";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useUploadQueue } from "@/lib/upload-queue/use-upload-queue";

type UploadState = "idle" | "uploading" | "uploaded" | "failed";
const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;

export function GeneralUploadForm({ businessId }: { businessId: string }) {
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const uploadQueue = useUploadQueue({ businessId, captureContext: "general" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (state === "uploading") {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setState("failed");
      setMessage("Select an image to upload.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setState("failed");
      setMessage("Image uploads must be 15 MB or smaller.");
      return;
    }

    setState("uploading");
    setMessage(null);

    try {
      await uploadQueue.enqueue({
        businessId,
        captureContext: "general",
        endpointPath: `/api/businesses/${businessId}/documents/upload-general`,
        file,
      });

      form.reset();
      setState("uploaded");
      setMessage(
        "Queued. Keep Fylerr open and it will upload to Google Drive automatically.",
      );
    } catch (error) {
      setState("failed");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-5 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 md:p-6"
        onSubmit={onSubmit}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[color:var(--foreground)]">
            Snap or choose a business document image
          </span>
          <input
            accept="image/*,.heic,.heif"
            capture="environment"
            className="block w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--foreground)]"
            disabled={state === "uploading"}
            name="file"
            required
            type="file"
          />
        </label>
        <p className="text-sm text-[color:var(--muted)]">
          Use this only for business-level documents. Max: 15 MB.
        </p>
        {state === "failed" && message ? (
          <InlineAlert
            description={message}
            title="Upload failed"
            variant="danger"
          />
        ) : null}
        {state === "uploaded" && message ? (
          <InlineAlert
            description={message}
            title="Uploaded"
            variant="success"
          />
        ) : null}
        <button
          className="w-full rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          disabled={state === "uploading"}
          type="submit"
        >
          {state === "uploading" ? "Uploading..." : "Upload"}
        </button>
      </form>
      <UploadQueueList
        items={uploadQueue.items}
        onRemove={(id) => void uploadQueue.remove(id)}
        onRetry={(id) => void uploadQueue.retry(id)}
        storageError={uploadQueue.storageError}
      />
    </div>
  );
}
