export type UploadQueueStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "failed"
  | "blocked";

export type UploadCaptureContext = "job" | "general";

export type UploadQueueItem = {
  id: string;
  idempotencyKey: string;
  businessId: string;
  jobId?: string;
  captureContext: UploadCaptureContext;
  endpointPath: string;
  file: Blob;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  updatedAt: string;
  status: UploadQueueStatus;
  attemptCount: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  lastError?: string;
  serverDocumentId?: string;
};

export type UploadQueueViewItem = Omit<UploadQueueItem, "file">;

export type EnqueueUploadInput = {
  businessId: string;
  jobId?: string;
  captureContext: UploadCaptureContext;
  endpointPath: string;
  file: File;
};

export type UploadQueueFilter = {
  businessId?: string;
  jobId?: string;
  captureContext?: UploadCaptureContext;
};
