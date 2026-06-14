export function isRetryableUploadStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

export function getUploadRetryDelayMs(attemptCount: number) {
  if (attemptCount <= 1) {
    return 0;
  }

  if (attemptCount === 2) {
    return 5_000;
  }

  if (attemptCount === 3) {
    return 15_000;
  }

  if (attemptCount === 4) {
    return 60_000;
  }

  return 5 * 60_000;
}

export function getBlockedUploadMessage(status: number, fallback: string) {
  if (status === 401) {
    return "Your session expired before the upload completed. Sign in again and try again.";
  }

  if (status === 403) {
    return "You don't have permission to upload this document.";
  }

  if (status === 404) {
    return "This upload destination is no longer available.";
  }

  return fallback;
}
