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
  patchDocumentForReview: vi.fn()
}));

import { PATCH } from "@/app/api/businesses/[businessId]/documents/[documentId]/review/route";
import { getSession } from "@/lib/server/auth/session";
import {
  ReviewServiceError,
  patchDocumentForReview
} from "@/lib/server/services/review-service";

const mockedGetSession = vi.mocked(getSession);
const mockedPatchDocumentForReview = vi.mocked(patchDocumentForReview);

describe("/api/businesses/[businessId]/documents/[documentId]/review", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates document routing and metadata for an authorized reviewer", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedPatchDocumentForReview.mockResolvedValue({
      document: { id: "document-1", status: "reviewed" },
      auditLogs: []
    } as never);

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          job_id: null,
          target_folder_key: "tax",
          vendor_or_party: "Vendor Co"
        })
      }),
      {
        params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
      }
    );

    expect(response.status).toBe(200);
  });

  it("rejects unauthenticated review corrections", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH" }), {
      params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
    });

    expect(response.status).toBe(401);
  });

  it("returns validation failures for invalid review payloads", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedPatchDocumentForReview.mockRejectedValue(
      new ZodError([
        {
          code: "custom",
          message: "Target folder is required.",
          path: ["target_folder_key"]
        }
      ])
    );

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
      }
    );

    expect(response.status).toBe(400);
  });

  it("returns Drive integration failures as 503", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedPatchDocumentForReview.mockRejectedValue(
      new ReviewServiceError("Field-Snap could not move the document in Google Drive.", "drive_unavailable")
    );

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          job_id: null,
          target_folder_key: "tax"
        })
      }),
      {
        params: Promise.resolve({ businessId: "business-1", documentId: "document-1" })
      }
    );

    expect(response.status).toBe(503);
  });
});
