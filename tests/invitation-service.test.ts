import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/data/invitations", () => ({
  acceptInvitation: vi.fn(),
  createInvitation: vi.fn(),
  getInvitationByTokenHash: vi.fn(),
  listInvitationsForBusiness: vi.fn(),
  revokePendingInvitationsForEmail: vi.fn(),
  updateInvitationStatus: vi.fn()
}));

vi.mock("@/lib/server/data/users", () => ({
  findUserById: vi.fn()
}));

vi.mock("@/lib/server/services/business-service", () => ({
  getBusinessOwnerDetailsForUser: vi.fn()
}));

import {
  acceptInvitation as acceptInvitationRecord,
  createInvitation,
  getInvitationByTokenHash,
  revokePendingInvitationsForEmail,
  updateInvitationStatus
} from "@/lib/server/data/invitations";
import { findUserById } from "@/lib/server/data/users";
import { getBusinessOwnerDetailsForUser } from "@/lib/server/services/business-service";
import {
  InvitationServiceError,
  acceptInvitation,
  createInvitationForBusiness,
  getInvitationPreview
} from "@/lib/server/services/invitation-service";

const mockedAcceptInvitationRecord = vi.mocked(acceptInvitationRecord);
const mockedCreateInvitation = vi.mocked(createInvitation);
const mockedGetInvitationByTokenHash = vi.mocked(getInvitationByTokenHash);
const mockedRevokePendingInvitationsForEmail = vi.mocked(revokePendingInvitationsForEmail);
const mockedUpdateInvitationStatus = vi.mocked(updateInvitationStatus);
const mockedFindUserById = vi.mocked(findUserById);
const mockedGetBusinessOwnerDetailsForUser = vi.mocked(getBusinessOwnerDetailsForUser);

describe("invitation-service", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedGetBusinessOwnerDetailsForUser.mockResolvedValue({
      business: {
        id: "business-1",
        name: "ABC Landscaping",
        owner_user_id: "owner-1",
        drive_root_folder_id: null,
        general_docs_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      membership: {
        role: "owner_admin",
        status: "active"
      }
    });
  });

  it("creates a fresh invitation and returns a copyable invite URL", async () => {
    mockedCreateInvitation.mockResolvedValue({
      id: "invite-1",
      business_id: "business-1",
      invited_email: "crew@example.com",
      role: "field_user",
      token_hash: "hash-1",
      status: "pending",
      invited_by_user_id: "owner-1",
      expires_at: new Date("2026-06-02T00:00:00.000Z"),
      created_at: new Date("2026-05-26T00:00:00.000Z"),
      accepted_at: null
    });

    const result = await createInvitationForBusiness({
      businessId: "business-1",
      userId: "owner-1",
      values: {
        invited_email: "crew@example.com",
        role: "field_user"
      },
      baseUrl: "https://field-snap.example"
    });

    expect(mockedRevokePendingInvitationsForEmail).toHaveBeenCalledWith(
      "business-1",
      "crew@example.com"
    );
    expect(mockedCreateInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "business-1",
        invitedEmail: "crew@example.com",
        role: "field_user",
        invitedByUserId: "owner-1"
      })
    );
    expect(result.inviteUrl).toMatch(/^https:\/\/field-snap\.example\/invitations\//);
  });

  it("rejects invitation creation for non-owners", async () => {
    mockedGetBusinessOwnerDetailsForUser.mockResolvedValue(null);

    await expect(
      createInvitationForBusiness({
        businessId: "business-1",
        userId: "user-2",
        values: {
          invited_email: "crew@example.com",
          role: "field_user"
        },
        baseUrl: "https://field-snap.example"
      })
    ).rejects.toMatchObject({
      code: "forbidden"
    } satisfies Partial<InvitationServiceError>);
  });

  it("validates invited email and allowed roles", async () => {
    await expect(
      createInvitationForBusiness({
        businessId: "business-1",
        userId: "owner-1",
        values: {
          invited_email: "invalid-email",
          role: "owner_admin"
        },
        baseUrl: "https://field-snap.example"
      })
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("accepts a pending invitation for the matching Google email", async () => {
    mockedGetInvitationByTokenHash.mockResolvedValue({
      id: "invite-1",
      business_id: "business-1",
      business_name: "ABC Landscaping",
      invited_email: "crew@example.com",
      role: "reviewer",
      status: "pending",
      invited_by_user_id: "owner-1",
      inviter_name: "Owner",
      inviter_email: "owner@example.com",
      expires_at: new Date(Date.now() + 60_000),
      created_at: new Date(),
      accepted_at: null
    });
    mockedFindUserById.mockResolvedValue({
      id: "user-1",
      google_sub: "google-sub",
      email: "CREW@example.com",
      name: "Crew User",
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date()
    });

    const result = await acceptInvitation({
      token: "token-123",
      userId: "user-1"
    });

    expect(mockedAcceptInvitationRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: "invite-1",
        businessId: "business-1",
        userId: "user-1",
        role: "reviewer"
      })
    );
    expect(result.businessId).toBe("business-1");
  });

  it("returns explicit mismatch preview state for the wrong signed-in email", async () => {
    mockedGetInvitationByTokenHash.mockResolvedValue({
      id: "invite-1",
      business_id: "business-1",
      business_name: "ABC Landscaping",
      invited_email: "crew@example.com",
      role: "field_user",
      status: "pending",
      invited_by_user_id: "owner-1",
      inviter_name: "Owner",
      inviter_email: "owner@example.com",
      expires_at: new Date(Date.now() + 60_000),
      created_at: new Date(),
      accepted_at: null
    });
    mockedFindUserById.mockResolvedValue({
      id: "user-2",
      google_sub: "google-sub-2",
      email: "other@example.com",
      name: "Other User",
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date()
    });

    const preview = await getInvitationPreview({
      token: "token-123",
      userId: "user-2"
    });

    expect(preview.state).toBe("email_mismatch");
  });

  it("expires a stale pending invitation before previewing or accepting it", async () => {
    mockedGetInvitationByTokenHash.mockResolvedValue({
      id: "invite-1",
      business_id: "business-1",
      business_name: "ABC Landscaping",
      invited_email: "crew@example.com",
      role: "field_user",
      status: "pending",
      invited_by_user_id: "owner-1",
      inviter_name: "Owner",
      inviter_email: "owner@example.com",
      expires_at: new Date(Date.now() - 60_000),
      created_at: new Date(),
      accepted_at: null
    });

    const preview = await getInvitationPreview({
      token: "token-123"
    });

    expect(mockedUpdateInvitationStatus).toHaveBeenCalledWith("invite-1", "expired");
    expect(preview.state).toBe("expired");
  });
});
