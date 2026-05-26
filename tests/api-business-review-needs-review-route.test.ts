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
  listNeedsReviewDocumentsForUser: vi.fn()
}));

import { GET } from "@/app/api/businesses/[businessId]/review/needs-review/route";
import { getSession } from "@/lib/server/auth/session";
import {
  ReviewServiceError,
  listNeedsReviewDocumentsForUser
} from "@/lib/server/services/review-service";

const mockedGetSession = vi.mocked(getSession);
const mockedListNeedsReviewDocumentsForUser = vi.mocked(listNeedsReviewDocumentsForUser);

describe("/api/businesses/[businessId]/review/needs-review", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the needs-review queue for an authorized reviewer", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedListNeedsReviewDocumentsForUser.mockResolvedValue({
      documents: [{ id: "document-1", status: "needs_review" }]
    } as never);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      documents: [{ id: "document-1", status: "needs_review" }]
    });
  });

  it("rejects unauthenticated requests", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(401);
  });

  it("returns forbidden when the member cannot access review flows", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedListNeedsReviewDocumentsForUser.mockRejectedValue(
      new ReviewServiceError("Forbidden", "forbidden")
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(403);
  });
});
