"use client";

import { useUploadQueue } from "@/lib/upload-queue/use-upload-queue";

export function ForegroundUploadRunner() {
  useUploadQueue({});
  return null;
}
