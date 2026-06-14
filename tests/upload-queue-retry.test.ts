import { describe, expect, it } from "vitest";
import {
  getBlockedUploadMessage,
  getUploadRetryDelayMs,
  isRetryableUploadStatus,
} from "@/lib/upload-queue/retry";

describe("upload queue retry policy", () => {
  it("retries transient upload failures", () => {
    expect(isRetryableUploadStatus(408)).toBe(true);
    expect(isRetryableUploadStatus(429)).toBe(true);
    expect(isRetryableUploadStatus(500)).toBe(true);
    expect(isRetryableUploadStatus(503)).toBe(true);
  });

  it("blocks permanent upload failures", () => {
    expect(isRetryableUploadStatus(400)).toBe(false);
    expect(isRetryableUploadStatus(401)).toBe(false);
    expect(isRetryableUploadStatus(403)).toBe(false);
    expect(isRetryableUploadStatus(404)).toBe(false);
  });

  it("uses conservative backoff delays", () => {
    expect(getUploadRetryDelayMs(1)).toBe(0);
    expect(getUploadRetryDelayMs(2)).toBe(5_000);
    expect(getUploadRetryDelayMs(3)).toBe(15_000);
    expect(getUploadRetryDelayMs(4)).toBe(60_000);
    expect(getUploadRetryDelayMs(5)).toBe(300_000);
  });

  it("returns actionable messages for blocked uploads", () => {
    expect(getBlockedUploadMessage(401, "fallback")).toContain(
      "session expired",
    );
    expect(getBlockedUploadMessage(403, "fallback")).toContain("permission");
    expect(getBlockedUploadMessage(404, "fallback")).toContain(
      "no longer available",
    );
    expect(getBlockedUploadMessage(400, "fallback")).toBe("fallback");
  });
});
