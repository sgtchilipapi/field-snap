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
  listBusinessDocumentsForUser: vi.fn()
}));

import { GET } from "@/app/api/businesses/[businessId]/documents/route";
import { getSession } from "@/lib/server/auth/session";
import {
  ReviewServiceError,
  listBusinessDocumentsForUser
} from "@/lib/server/services/review-service";

const mockedGetSession = vi.mocked(getSession);
const mockedListBusinessDocumentsForUser = vi.mocked(listBusinessDocumentsForUser);

describe("/api/businesses/[businessId]/documents", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns recent documents for an authorized reviewer", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedListBusinessDocumentsForUser.mockResolvedValue({
      documents: [{ id: "document-1", status: "auto_filed" }]
    } as never);

    const response = await GET(new Request("http://localhost/api/documents"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(200);
  });

  it("rejects unauthenticated requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/documents"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(401);
  });

  it("returns a validation error for an invalid status filter", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedListBusinessDocumentsForUser.mockRejectedValue(
      new ReviewServiceError("Status filter is invalid.", "invalid_filter")
    );

    const response = await GET(new Request("http://localhost/api/documents?status=bad"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Status filter is invalid."
    });
  });
});
