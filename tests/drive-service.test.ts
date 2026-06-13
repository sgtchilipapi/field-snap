import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/data/businesses", () => ({
  getBusinessForUser: vi.fn(),
  updateBusinessDriveRootFolder: vi.fn()
}));

vi.mock("@/lib/server/audit/logs", () => ({
  AUDIT_ACTIONS: {
    driveConnected: "drive.connected",
    driveDisconnected: "drive.disconnected"
  },
  recordAuditEvent: vi.fn()
}));

vi.mock("@/lib/server/data/drive-connections", () => ({
  disconnectDriveConnectionForBusiness: vi.fn(),
  getDriveConnectionForBusiness: vi.fn(),
  updateDriveConnectionStatus: vi.fn(),
  upsertDriveConnection: vi.fn()
}));

vi.mock("@/lib/server/integrations/google/drive", () => ({
  createGoogleDriveFolder: vi.fn(),
  exchangeCodeForGoogleDriveTokens: vi.fn(),
  fetchGoogleDriveAccountEmail: vi.fn(),
  getGoogleDriveFolder: vi.fn()
}));

vi.mock("@/lib/server/security/encryption", () => ({
  encryptSecret: vi.fn((value: string) => `encrypted:${value}`)
}));

import {
  getBusinessDriveOpenUrl,
  getBusinessDriveStatusForUser,
  connectBusinessDriveFromCode,
  disconnectBusinessDrive
} from "@/lib/server/services/drive-service";
import { recordAuditEvent } from "@/lib/server/audit/logs";
import {
  getBusinessForUser,
  updateBusinessDriveRootFolder
} from "@/lib/server/data/businesses";
import {
  disconnectDriveConnectionForBusiness,
  getDriveConnectionForBusiness,
  upsertDriveConnection
} from "@/lib/server/data/drive-connections";
import {
  createGoogleDriveFolder,
  exchangeCodeForGoogleDriveTokens,
  fetchGoogleDriveAccountEmail,
  getGoogleDriveFolder
} from "@/lib/server/integrations/google/drive";

const mockedGetBusinessForUser = vi.mocked(getBusinessForUser);
const mockedUpdateBusinessDriveRootFolder = vi.mocked(updateBusinessDriveRootFolder);
const mockedRecordAuditEvent = vi.mocked(recordAuditEvent);
const mockedDisconnectDriveConnectionForBusiness = vi.mocked(
  disconnectDriveConnectionForBusiness
);
const mockedGetDriveConnectionForBusiness = vi.mocked(getDriveConnectionForBusiness);
const mockedUpsertDriveConnection = vi.mocked(upsertDriveConnection);
const mockedCreateGoogleDriveFolder = vi.mocked(createGoogleDriveFolder);
const mockedExchangeCodeForGoogleDriveTokens = vi.mocked(exchangeCodeForGoogleDriveTokens);
const mockedFetchGoogleDriveAccountEmail = vi.mocked(fetchGoogleDriveAccountEmail);
const mockedGetGoogleDriveFolder = vi.mocked(getGoogleDriveFolder);

describe("drive-service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("builds an open-in-drive URL from the root folder id", () => {
    expect(getBusinessDriveOpenUrl("folder-123")).toBe(
      "https://drive.google.com/drive/folders/folder-123"
    );
    expect(getBusinessDriveOpenUrl(null)).toBeNull();
  });

  it("returns Drive status for an in-scope business member", async () => {
    mockedGetBusinessForUser.mockResolvedValue({
      business: {
        id: "business-1",
        name: "ABC Landscaping",
        owner_user_id: "user-1",
        drive_root_folder_id: "folder-123",
        general_docs_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      membership: {
        role: "reviewer",
        status: "active"
      }
    });
    mockedGetDriveConnectionForBusiness.mockResolvedValue({
      id: "connection-1",
      business_id: "business-1",
      connected_by_user_id: "user-1",
      google_account_email: "owner@example.com",
      access_token_encrypted: "encrypted:access",
      refresh_token_encrypted: "encrypted:refresh",
      scopes: ["https://www.googleapis.com/auth/drive.file"],
      status: "active",
      created_at: new Date(),
      updated_at: new Date()
    });

    await expect(getBusinessDriveStatusForUser("business-1", "user-2")).resolves.toEqual({
      connected: true,
      googleAccountEmail: "owner@example.com",
      rootFolderId: "folder-123",
      driveOpenUrl: "https://drive.google.com/drive/folders/folder-123",
      connectionStatus: "active"
    });
  });

  it("creates or reuses the business root folder and upserts the Drive connection", async () => {
    mockedGetBusinessForUser.mockResolvedValue({
      business: {
        id: "business-1",
        name: "ABC Landscaping",
        owner_user_id: "user-1",
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
    mockedGetDriveConnectionForBusiness.mockResolvedValue(null);
    mockedExchangeCodeForGoogleDriveTokens.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      scopes: ["https://www.googleapis.com/auth/drive.file"]
    });
    mockedFetchGoogleDriveAccountEmail.mockResolvedValue("owner@example.com");
    mockedCreateGoogleDriveFolder.mockResolvedValue({
      id: "folder-123",
      name: "Fylerr - ABC Landscaping"
    });
    mockedGetGoogleDriveFolder.mockResolvedValue(null);

    await expect(
      connectBusinessDriveFromCode({
        businessId: "business-1",
        connectedByUserId: "user-1",
        code: "oauth-code"
      })
    ).resolves.toEqual({
      rootFolderId: "folder-123",
      googleAccountEmail: "owner@example.com"
    });

    expect(mockedUpsertDriveConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "business-1",
        googleAccountEmail: "owner@example.com",
        accessTokenEncrypted: "encrypted:access-token",
        refreshTokenEncrypted: "encrypted:refresh-token",
        status: "active"
      })
    );
    expect(mockedUpdateBusinessDriveRootFolder).toHaveBeenCalledWith("business-1", "folder-123");
    expect(mockedRecordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "business-1",
        actorUserId: "user-1",
        entityType: "business",
        entityId: "business-1",
        action: "drive.connected"
      })
    );
  });

  it("disconnects an active Drive connection for an owner-admin", async () => {
    mockedGetBusinessForUser.mockResolvedValue({
      business: {
        id: "business-1",
        name: "ABC Landscaping",
        owner_user_id: "user-1",
        drive_root_folder_id: "folder-123",
        general_docs_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      membership: {
        role: "owner_admin",
        status: "active"
      }
    });
    mockedGetDriveConnectionForBusiness.mockResolvedValue({
      id: "connection-1",
      business_id: "business-1",
      connected_by_user_id: "user-1",
      google_account_email: "owner@example.com",
      access_token_encrypted: "encrypted:access",
      refresh_token_encrypted: "encrypted:refresh",
      scopes: ["https://www.googleapis.com/auth/drive.file"],
      status: "active",
      created_at: new Date(),
      updated_at: new Date()
    });
    mockedDisconnectDriveConnectionForBusiness.mockResolvedValue({
      id: "connection-1",
      business_id: "business-1",
      connected_by_user_id: "user-1",
      google_account_email: "owner@example.com",
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
      status: "revoked",
      created_at: new Date(),
      updated_at: new Date()
    });

    await expect(
      disconnectBusinessDrive({
        businessId: "business-1",
        disconnectedByUserId: "user-1"
      })
    ).resolves.toEqual({
      disconnected: true,
      rootFolderId: "folder-123"
    });

    expect(mockedDisconnectDriveConnectionForBusiness).toHaveBeenCalledWith("business-1");
    expect(mockedRecordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "business-1",
        actorUserId: "user-1",
        entityType: "business",
        entityId: "business-1",
        action: "drive.disconnected"
      })
    );
  });
});
