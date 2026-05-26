import { ZodError } from "zod";
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
  markDocumentReviewedForUser: vi.fn()
}));

import { POST } from "@/app/api/businesses/[businessId]/documents/[documentId]/mark-reviewed/route";
import { getSession } from "@/lib/server/auth/session";
import {
  ReviewServiceError,
  markDocumentReviewedForUser
} from "@/lib/server/services/review-service";

const mockedGetSession = vi.mocked(getSession);
const mockedMarkDocumentReviewedForUser = vi.mocked(markDocumentReviewedForUser);

describe("/api/businesses/[businessId]/documents/[documentId]/mark-reviewed", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("marks a document reviewed for an authorized reviewer", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedMarkDocumentReviewedForUser.mockResolvedValue({
      document: { id: "document-1", status: "reviewed" },
      auditLogs: []
    } as never);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mark_reviewed: true
        })
      }),
      {
        params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
      }
    );

    expect(response.status).toBe(200);
  });

  it("rejects unauthenticated mark-reviewed requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
    });

    expect(response.status).toBe(401);
  });

  it("returns validation failures for invalid mark-reviewed payloads", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedMarkDocumentReviewedForUser.mockRejectedValue(
      new ZodError([
        {
          code: "custom",
          message: "Invalid literal value, expected true",
          path: ["mark_reviewed"]
        }
      ])
    );

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mark_reviewed: false
        })
      }),
      {
        params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
      }
    );

    expect(response.status).toBe(400);
  });

  it("returns a not-found response for a missing document", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedMarkDocumentReviewedForUser.mockRejectedValue(
      new ReviewServiceError("Not found", "not_found")
    );

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mark_reviewed: true
        })
      }),
      {
        params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
      }
    );

    expect(response.status).toBe(404);
  });
});
