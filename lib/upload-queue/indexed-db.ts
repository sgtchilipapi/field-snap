import type {
  EnqueueUploadInput,
  UploadQueueFilter,
  UploadQueueItem,
} from "./types";

const DB_NAME = "fylerr-upload-queue";
const DB_VERSION = 1;
const STORE_NAME = "queued_uploads";

let dbPromise: Promise<IDBDatabase> | null = null;

function assertIndexedDbAvailable() {
  if (typeof indexedDB === "undefined") {
    throw new Error(
      "Local upload queue storage is not available in this browser.",
    );
  }
}

function openDatabase() {
  assertIndexedDbAvailable();

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.objectStoreNames.contains(STORE_NAME)
          ? request.transaction?.objectStore(STORE_NAME)
          : db.createObjectStore(STORE_NAME, { keyPath: "id" });

        if (store && !store.indexNames.contains("status")) {
          store.createIndex("status", "status", { unique: false });
        }

        if (store && !store.indexNames.contains("businessId")) {
          store.createIndex("businessId", "businessId", { unique: false });
        }

        if (store && !store.indexNames.contains("createdAt")) {
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Could not open upload queue."));
    });
  }

  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void,
) {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);
    let requestResult: T | undefined;

    if (request) {
      request.onsuccess = () => {
        requestResult = request.result;
      };
      request.onerror = () =>
        reject(request.error ?? new Error("Upload queue request failed."));
    }

    transaction.oncomplete = () => resolve(requestResult as T);
    transaction.onerror = () =>
      reject(
        transaction.error ?? new Error("Upload queue transaction failed."),
      );
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error("Upload queue transaction aborted."),
      );
  });
}

function toViewComparableDate(value?: string) {
  return value ? Date.parse(value) : 0;
}

export async function enqueueUpload(input: EnqueueUploadInput) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const item: UploadQueueItem = {
    id,
    idempotencyKey: crypto.randomUUID(),
    businessId: input.businessId,
    jobId: input.jobId,
    captureContext: input.captureContext,
    endpointPath: input.endpointPath,
    file: input.file,
    originalFilename: input.file.name || "upload-image",
    mimeType: input.file.type || "application/octet-stream",
    fileSizeBytes: input.file.size,
    createdAt: now,
    updatedAt: now,
    status: "queued",
    attemptCount: 0,
  };

  await withStore<IDBValidKey>("readwrite", (store) => store.add(item));
  return item;
}

export async function listUploads(filter: UploadQueueFilter = {}) {
  const items = await withStore<UploadQueueItem[]>("readonly", (store) =>
    store.getAll(),
  );

  return items
    .filter((item) => {
      if (filter.businessId && item.businessId !== filter.businessId) {
        return false;
      }

      if (filter.jobId && item.jobId !== filter.jobId) {
        return false;
      }

      if (
        filter.captureContext &&
        item.captureContext !== filter.captureContext
      ) {
        return false;
      }

      return true;
    })
    .sort(
      (left, right) =>
        toViewComparableDate(right.createdAt) -
        toViewComparableDate(left.createdAt),
    );
}

export async function getUpload(id: string) {
  return withStore<UploadQueueItem | undefined>("readonly", (store) =>
    store.get(id),
  );
}

export async function updateUpload(
  id: string,
  patch: Partial<UploadQueueItem>,
) {
  const existing = await getUpload(id);

  if (!existing) {
    return undefined;
  }

  const updated: UploadQueueItem = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await withStore<IDBValidKey>("readwrite", (store) => store.put(updated));
  return updated;
}

export async function deleteUpload(id: string) {
  await withStore<undefined>("readwrite", (store) => store.delete(id));
}
