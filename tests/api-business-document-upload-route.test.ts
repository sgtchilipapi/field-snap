import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn()
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
  uploadJobDocument: vi.fn()
}));

import { POST } from "@/app/api/businesses/[businessId]/jobs/[jobId]/documents/upload/route";
import { getSession } from "@/lib/server/auth/session";
import { uploadJobDocument } from "@/lib/server/services/document-upload-service";

const mockedGetSession = vi.mocked(getSession);
const mockedUploadJobDocument = vi.mocked(uploadJobDocument);

describe("/api/businesses/[businessId]/jobs/[jobId]/documents/upload", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createMultipartRequest(formData: FormData) {
    return {
      formData: vi.fn().mockResolvedValue(formData)
    } as unknown as Request;
  }

  it("uploads an image for an authenticated business member", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedUploadJobDocument.mockResolvedValue({
      documentId: "document-1",
      status: "uploaded_to_in_process"
    });

    const formData = new FormData();
    formData.set("file", new File(["image"], "receipt.jpg", { type: "image/jpeg" }));

    const response = await POST(createMultipartRequest(formData), {
      params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
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
    formData.set("file", new File(["image"], "receipt.jpg", { type: "image/jpeg" }));

    const response = await POST(createMultipartRequest(formData), {
      params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
    });

    expect(response.status).toBe(401);
  });

  it("returns validation failures for missing files", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });

    const response = await POST(createMultipartRequest(new FormData()), {
      params: Promise.resolve({ businessId: "business-1", jobId: "job-1" })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Attach one image file."
    });
  });
});
