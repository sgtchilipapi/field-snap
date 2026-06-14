import { deleteUpload, listUploads, updateUpload } from "./indexed-db";
import {
  getBlockedUploadMessage,
  getUploadRetryDelayMs,
  isRetryableUploadStatus,
} from "./retry";
import type { UploadQueueFilter, UploadQueueItem } from "./types";

let isRunning = false;

export type UploadRunnerOptions = {
  filter?: UploadQueueFilter;
  onChange?: () => void;
};

async function parseUploadError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return payload?.error ?? "Upload failed. Try again.";
}

function canAttempt(item: UploadQueueItem) {
  if (
    item.status === "uploading" ||
    item.status === "uploaded" ||
    item.status === "blocked"
  ) {
    return false;
  }

  if (item.nextAttemptAt && Date.parse(item.nextAttemptAt) > Date.now()) {
    return false;
  }

  return item.status === "queued" || item.status === "failed";
}

async function uploadOne(item: UploadQueueItem, onChange?: () => void) {
  const now = new Date().toISOString();
  const uploadingItem = await updateUpload(item.id, {
    status: "uploading",
    lastAttemptAt: now,
    lastError: undefined,
  });
  onChange?.();

  if (!uploadingItem) {
    return;
  }

  const formData = new FormData();
  formData.set("file", uploadingItem.file, uploadingItem.originalFilename);

  try {
    const response = await fetch(uploadingItem.endpointPath, {
      method: "POST",
      body: formData,
      headers: {
        "X-Upload-Idempotency-Key": uploadingItem.idempotencyKey,
      },
    });

    if (!response.ok) {
      const message = await parseUploadError(response);

      if (!isRetryableUploadStatus(response.status)) {
        await updateUpload(uploadingItem.id, {
          status: "blocked",
          lastError: getBlockedUploadMessage(response.status, message),
        });
        onChange?.();
        return;
      }

      throw new Error(message);
    }

    const payload = (await response.json().catch(() => null)) as {
      document_id?: string;
    } | null;
    await updateUpload(uploadingItem.id, {
      status: "uploaded",
      serverDocumentId: payload?.document_id,
      lastError: undefined,
      nextAttemptAt: undefined,
    });
    onChange?.();
    await deleteUpload(uploadingItem.id);
    onChange?.();
  } catch (error) {
    const attemptCount = uploadingItem.attemptCount + 1;
    const delayMs = getUploadRetryDelayMs(attemptCount);
    const nextAttemptAt = new Date(Date.now() + delayMs).toISOString();

    await updateUpload(uploadingItem.id, {
      status: "failed",
      attemptCount,
      nextAttemptAt,
      lastError:
        error instanceof Error ? error.message : "Upload failed. Try again.",
    });
    onChange?.();
  }
}

export async function runUploadQueue(options: UploadRunnerOptions = {}) {
  if (isRunning) {
    return;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return;
  }

  isRunning = true;

  try {
    const items = await listUploads(options.filter);
    const nextItem = items.reverse().find(canAttempt);

    if (nextItem) {
      await uploadOne(nextItem, options.onChange);
    }
  } finally {
    isRunning = false;
  }
}
