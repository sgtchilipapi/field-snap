import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/server/security/rate-limit", () => ({
  consumeRateLimit: vi.fn(() => ({
    allowed: true,
    remaining: 19,
    retryAfterSeconds: 60
  })),
  getClientAddress: vi.fn(() => "127.0.0.1")
}));

vi.mock("@/lib/server/logger", () => ({
  getRequestContext: vi.fn(() => ({ requestId: "req-1" })),
  logWarn: vi.fn()
}));

vi.mock("@/lib/server/services/document-upload-service", () => ({
  DocumentUploadError: class extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
  getMaxUploadSizeBytes: vi.fn(() => 15 * 1024 * 1024),
  uploadGeneralDocument: vi.fn()
}));

import { POST } from "@/app/api/businesses/[businessId]/documents/upload-general/route";
import { getSession } from "@/lib/server/auth/session";
import { consumeRateLimit } from "@/lib/server/security/rate-limit";
import {
  DocumentUploadError,
  uploadGeneralDocument
} from "@/lib/server/services/document-upload-service";

const mockedGetSession = vi.mocked(getSession);
const mockedConsumeRateLimit = vi.mocked(consumeRateLimit);
const mockedUploadGeneralDocument = vi.mocked(uploadGeneralDocument);

describe("/api/businesses/[businessId]/documents/upload-general", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMultipartRequest(formData: FormData) {
    return {
      formData: vi.fn().mockResolvedValue(formData)
    } as unknown as Request;
  }

  it("uploads a business document for an authenticated owner or reviewer", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedUploadGeneralDocument.mockResolvedValue({
      documentId: "document-1",
      status: "uploaded_to_in_process"
    });

    const formData = new FormData();
    formData.set("file", new File(["image"], "insurance.jpg", { type: "image/jpeg" }));

    const response = await POST(createMultipartRequest(formData), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      document_id: "document-1",
      status: "uploaded_to_in_process"
    });
  });

  it("rejects unauthenticated uploads", async () => {
    mockedGetSession.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("file", new File(["image"], "insurance.jpg", { type: "image/jpeg" }));

    const response = await POST(createMultipartRequest(formData), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(401);
  });

  it("returns validation failures for missing files", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });

    const response = await POST(createMultipartRequest(new FormData()), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Attach one image file."
    });
  });

  it("rejects field users and other unauthorized members", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedUploadGeneralDocument.mockRejectedValue(new DocumentUploadError("Forbidden", "forbidden"));

    const formData = new FormData();
    formData.set("file", new File(["image"], "insurance.jpg", { type: "image/jpeg" }));

    const response = await POST(createMultipartRequest(formData), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden"
    });
  });

  it("rate limits repeated general uploads", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedConsumeRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60
    });

    const formData = new FormData();
    formData.set("file", new File(["image"], "insurance.jpg", { type: "image/jpeg" }));

    const response = await POST(createMultipartRequest(formData), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many uploads. Please wait and try again."
    });
  });
});
