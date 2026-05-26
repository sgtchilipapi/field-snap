import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/server/services/review-service", () => ({
  ReviewServiceError: class extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
  getDocumentPreviewForUser: vi.fn()
}));

import { GET } from "@/app/api/businesses/[businessId]/documents/[documentId]/preview/route";
import { getSession } from "@/lib/server/auth/session";
import {
  ReviewServiceError,
  getDocumentPreviewForUser
} from "@/lib/server/services/review-service";

const mockedGetSession = vi.mocked(getSession);
const mockedGetDocumentPreviewForUser = vi.mocked(getDocumentPreviewForUser);

describe("/api/businesses/[businessId]/documents/[documentId]/preview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns preview bytes for an authorized reviewer", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetDocumentPreviewForUser.mockResolvedValue({
      document: { mime_type: "image/jpeg" },
      bytes: new Uint8Array([1, 2, 3])
    } as never);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("rejects unauthenticated requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
    });

    expect(response.status).toBe(401);
  });

  it("returns a Drive availability failure when preview bytes cannot be loaded", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetDocumentPreviewForUser.mockRejectedValue(
      new ReviewServiceError("Document preview is temporarily unavailable.", "drive_unavailable")
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
    });

    expect(response.status).toBe(503);
  });
});
