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
  getDocumentDetailForUser: vi.fn()
}));

import { GET } from "@/app/api/businesses/[businessId]/documents/[documentId]/route";
import { getSession } from "@/lib/server/auth/session";
import {
  ReviewServiceError,
  getDocumentDetailForUser
} from "@/lib/server/services/review-service";

const mockedGetSession = vi.mocked(getSession);
const mockedGetDocumentDetailForUser = vi.mocked(getDocumentDetailForUser);

describe("/api/businesses/[businessId]/documents/[documentId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns document detail plus audit history for an authorized reviewer", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetDocumentDetailForUser.mockResolvedValue({
      document: { id: "document-1", status: "needs_review" },
      auditLogs: [{ id: "audit-1", action: "document.uploaded" }]
    } as never);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
    });

    expect(response.status).toBe(200);
  });

  it("returns forbidden when the member is not allowed to review documents", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetDocumentDetailForUser.mockRejectedValue(
      new ReviewServiceError("Forbidden", "forbidden")
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
    });

    expect(response.status).toBe(403);
  });

  it("returns not found for a missing document", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedGetDocumentDetailForUser.mockRejectedValue(
      new ReviewServiceError("Not found", "not_found")
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
    });

    expect(response.status).toBe(404);
  });
});
