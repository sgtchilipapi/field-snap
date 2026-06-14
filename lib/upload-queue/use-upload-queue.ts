"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteUpload,
  enqueueUpload,
  listUploads,
  updateUpload,
} from "./indexed-db";
import { runUploadQueue } from "./upload-runner";
import type {
  EnqueueUploadInput,
  UploadQueueFilter,
  UploadQueueViewItem,
} from "./types";

function toViewItem(
  item: Awaited<ReturnType<typeof listUploads>>[number],
): UploadQueueViewItem {
  return {
    id: item.id,
    idempotencyKey: item.idempotencyKey,
    businessId: item.businessId,
    jobId: item.jobId,
    captureContext: item.captureContext,
    endpointPath: item.endpointPath,
    originalFilename: item.originalFilename,
    mimeType: item.mimeType,
    fileSizeBytes: item.fileSizeBytes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    status: item.status,
    attemptCount: item.attemptCount,
    lastAttemptAt: item.lastAttemptAt,
    nextAttemptAt: item.nextAttemptAt,
    lastError: item.lastError,
    serverDocumentId: item.serverDocumentId,
  };
}

export function useUploadQueue(filter: UploadQueueFilter) {
  const [items, setItems] = useState<UploadQueueViewItem[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const stableFilter = useMemo(
    () => ({
      businessId: filter.businessId,
      jobId: filter.jobId,
      captureContext: filter.captureContext,
    }),
    [filter.businessId, filter.captureContext, filter.jobId],
  );

  const refresh = useCallback(async () => {
    try {
      const uploads = await listUploads(stableFilter);
      setItems(uploads.map(toViewItem));
      setStorageError(null);
    } catch (error) {
      setStorageError(
        error instanceof Error ? error.message : "Upload queue is unavailable.",
      );
    }
  }, [stableFilter]);

  const run = useCallback(async () => {
    await runUploadQueue({ filter: stableFilter, onChange: refresh });
    await refresh();
  }, [refresh, stableFilter]);

  const enqueue = useCallback(
    async (input: EnqueueUploadInput) => {
      const item = await enqueueUpload(input);
      await refresh();
      void run();
      return item;
    },
    [refresh, run],
  );

  const retry = useCallback(
    async (id: string) => {
      await updateUpload(id, {
        status: "queued",
        nextAttemptAt: undefined,
        lastError: undefined,
      });
      await refresh();
      void run();
    },
    [refresh, run],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteUpload(id);
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
    void run();

    const onOnline = () => void run();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void run();
      }
    };
    const intervalId = window.setInterval(() => void run(), 10_000);

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, run]);

  return {
    items,
    storageError,
    enqueue,
    retry,
    remove,
    refresh,
    run,
  };
}
