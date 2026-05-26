import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn(),
  normalizeReturnPath: vi.fn((value: string) => value)
}));

vi.mock("@/lib/server/services/invitation-service", () => ({
  InvitationServiceError: class extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
  acceptInvitation: vi.fn()
}));

import { POST } from "@/app/(public)/invitations/[token]/accept/route";
import { getSession } from "@/lib/server/auth/session";
import {
  InvitationServiceError,
  acceptInvitation
} from "@/lib/server/services/invitation-service";

const mockedGetSession = vi.mocked(getSession);
const mockedAcceptInvitation = vi.mocked(acceptInvitation);

describe("/invitations/[token]/accept", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("accepts the invitation and redirects into the invited business", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-1", issuedAt: 1 });
    mockedAcceptInvitation.mockResolvedValue({
      businessId: "business-1",
      role: "field_user",
      acceptedAt: new Date()
    });

    const response = await POST(new Request("http://localhost", { method: "POST" }) as never, {
      params: Promise.resolve({ token: "token-123" })
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/businesses/business-1/jobs?invitation=accepted"
    );
  });

  it("redirects unauthenticated invitees to Google sign-in", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost", { method: "POST" }) as never, {
      params: Promise.resolve({ token: "token-123" })
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/login?next=%2Finvitations%2Ftoken-123"
    );
  });

  it("redirects back to the invite preview when the signed-in email does not match", async () => {
    mockedGetSession.mockResolvedValue({ userId: "user-2", issuedAt: 1 });
    mockedAcceptInvitation.mockRejectedValue(
      new InvitationServiceError("Signed-in email does not match the invitation.", "email_mismatch")
    );

    const response = await POST(new Request("http://localhost", { method: "POST" }) as never, {
      params: Promise.resolve({ token: "token-123" })
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/invitations/token-123?error=email_mismatch"
    );
  });
});
