import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/lib/server/services/invitation-service", () => ({
  InvitationServiceError: class extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
  createInvitationForBusiness: vi.fn()
}));

import { POST } from "@/app/api/businesses/[businessId]/invitations/route";
import { getSession } from "@/lib/server/auth/session";
import {
  InvitationServiceError,
  createInvitationForBusiness
} from "@/lib/server/services/invitation-service";

const mockedGetSession = vi.mocked(getSession);
const mockedCreateInvitationForBusiness = vi.mocked(createInvitationForBusiness);

describe("/api/businesses/[businessId]/invitations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates an invitation for an owner-admin", async () => {
    mockedGetSession.mockResolvedValue({ userId: "owner-1", issuedAt: 1 });
    mockedCreateInvitationForBusiness.mockResolvedValue({
      invitation: {
        id: "invite-1",
        invited_email: "crew@example.com",
        role: "field_user",
        status: "pending",
        expires_at: new Date("2026-06-02T00:00:00.000Z"),
        created_at: new Date("2026-05-26T00:00:00.000Z")
      },
      inviteUrl: "https://field-snap.example/invitations/token-123"
    } as never);

    const response = await POST(
      new Request("http://localhost/api/businesses/business-1/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          invited_email: "crew@example.com",
          role: "field_user"
        })
      }),
      {
        params: Promise.resolve({ businessId: "business-1" })
      }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      invitation: {
        id: "invite-1",
        invited_email: "crew@example.com",
        role: "field_user",
        status: "pending",
        expires_at: new Date("2026-06-02T00:00:00.000Z").toJSON(),
        created_at: new Date("2026-05-26T00:00:00.000Z").toJSON()
      },
      invite_url: "https://field-snap.example/invitations/token-123"
    });
  });

  it("rejects unauthenticated invitation creation", async () => {
    mockedGetSession.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ businessId: "business-1" })
    });

    expect(response.status).toBe(401);
  });

  it("rejects forbidden invitation creation attempts", async () => {
    mockedGetSession.mockResolvedValue({ userId: "reviewer-1", issuedAt: 1 });
    mockedCreateInvitationForBusiness.mockRejectedValue(
      new InvitationServiceError("Forbidden", "forbidden")
    );

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          invited_email: "crew@example.com",
          role: "field_user"
        })
      }),
      {
        params: Promise.resolve({ businessId: "business-1" })
      }
    );

    expect(response.status).toBe(403);
  });

  it("returns validation failures for invalid invitation payloads", async () => {
    mockedGetSession.mockResolvedValue({ userId: "owner-1", issuedAt: 1 });
    mockedCreateInvitationForBusiness.mockRejectedValue(
      new ZodError([
        {
          code: "custom",
          message: "Invitation email must be valid.",
          path: ["invited_email"]
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
          invited_email: "invalid-email",
          role: "field_user"
        })
      }),
      {
        params: Promise.resolve({ businessId: "business-1" })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invitation email must be valid."
    });
  });
});
