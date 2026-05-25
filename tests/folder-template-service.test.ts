import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/data/businesses", () => ({
  getBusinessById: vi.fn(),
  updateBusinessDriveRootFolder: vi.fn(),
  updateBusinessGeneralDocsFolder: vi.fn()
}));

vi.mock("@/lib/server/data/categories", () => ({
  getCategoriesForBusiness: vi.fn(),
  upsertCategory: vi.fn()
}));

vi.mock("@/lib/server/data/drive-connections", () => ({
  getDriveConnectionForBusiness: vi.fn(),
  updateDriveConnectionStatus: vi.fn()
}));

vi.mock("@/lib/server/data/general-folders", () => ({
  getGeneralFoldersForBusiness: vi.fn(),
  upsertGeneralFolder: vi.fn()
}));

vi.mock("@/lib/server/security/encryption", () => ({
  decryptSecret: vi.fn()
}));

vi.mock("@/lib/server/integrations/google/drive", () => ({
  createGoogleDriveFolder: vi.fn(),
  createGoogleDriveFolderInParent: vi.fn(),
  findGoogleDriveFolderByName: vi.fn(),
  getGoogleDriveFolder: vi.fn()
}));

import { DEFAULT_CATEGORIES, GENERAL_FOLDER_TEMPLATES } from "@/lib/server/constants/folder-template";
import {
  getBusinessById,
  updateBusinessGeneralDocsFolder
} from "@/lib/server/data/businesses";
import { getCategoriesForBusiness, upsertCategory } from "@/lib/server/data/categories";
import {
  getDriveConnectionForBusiness,
  updateDriveConnectionStatus
} from "@/lib/server/data/drive-connections";
import { getGeneralFoldersForBusiness, upsertGeneralFolder } from "@/lib/server/data/general-folders";
import { createGoogleDriveFolderInParent, findGoogleDriveFolderByName, getGoogleDriveFolder } from "@/lib/server/integrations/google/drive";
import { decryptSecret } from "@/lib/server/security/encryption";
import { ensureBusinessFolderTemplate } from "@/lib/server/services/folder-template-service";

const mockedGetBusinessById = vi.mocked(getBusinessById);
const mockedUpdateBusinessGeneralDocsFolder = vi.mocked(updateBusinessGeneralDocsFolder);
const mockedGetCategoriesForBusiness = vi.mocked(getCategoriesForBusiness);
const mockedUpsertCategory = vi.mocked(upsertCategory);
const mockedGetDriveConnectionForBusiness = vi.mocked(getDriveConnectionForBusiness);
const mockedUpdateDriveConnectionStatus = vi.mocked(updateDriveConnectionStatus);
const mockedGetGeneralFoldersForBusiness = vi.mocked(getGeneralFoldersForBusiness);
const mockedUpsertGeneralFolder = vi.mocked(upsertGeneralFolder);
const mockedCreateGoogleDriveFolderInParent = vi.mocked(createGoogleDriveFolderInParent);
const mockedFindGoogleDriveFolderByName = vi.mocked(findGoogleDriveFolderByName);
const mockedGetGoogleDriveFolder = vi.mocked(getGoogleDriveFolder);
const mockedDecryptSecret = vi.mocked(decryptSecret);

describe("folder-template-service", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedGetBusinessById.mockResolvedValue({
      id: "business-1",
      name: "ABC Landscaping",
      owner_user_id: "user-1",
      drive_root_folder_id: "root-1",
      general_docs_folder_id: null,
      created_at: new Date(),
      updated_at: new Date()
    });
    mockedGetDriveConnectionForBusiness.mockResolvedValue({
      id: "connection-1",
      business_id: "business-1",
      connected_by_user_id: "user-1",
      google_account_email: "owner@example.com",
      access_token_encrypted: "encrypted-access",
      refresh_token_encrypted: "encrypted-refresh",
      scopes: ["https://www.googleapis.com/auth/drive.file"],
      status: "active",
      created_at: new Date(),
      updated_at: new Date()
    });
    mockedGetCategoriesForBusiness.mockResolvedValue([]);
    mockedGetGeneralFoldersForBusiness.mockResolvedValue([]);
    mockedDecryptSecret.mockReturnValue("access-token");
    mockedGetGoogleDriveFolder.mockImplementation(async (_accessToken, folderId) => {
      if (folderId === "root-1") {
        return { id: "root-1", name: "Field-Snap - ABC Landscaping" };
      }

      return null;
    });
    mockedFindGoogleDriveFolderByName.mockResolvedValue(null);
    mockedCreateGoogleDriveFolderInParent.mockImplementation(async (_accessToken, name, parentFolderId) => ({
      id: `${parentFolderId ?? "root"}-${name}`,
      name
    }));
  });

  it("creates and persists missing default folders for a connected business", async () => {
    await ensureBusinessFolderTemplate("business-1");

    expect(mockedUpdateBusinessGeneralDocsFolder).toHaveBeenCalledWith(
      "business-1",
      "root-1-General Business Docs"
    );
    expect(mockedUpsertCategory).toHaveBeenCalledTimes(DEFAULT_CATEGORIES.length);
    expect(mockedUpsertGeneralFolder).toHaveBeenCalledTimes(GENERAL_FOLDER_TEMPLATES.length);
  });

  it("reuses matching drive folders instead of creating duplicates during repair", async () => {
    mockedGetCategoriesForBusiness.mockResolvedValue([
      {
        id: "category-1",
        business_id: "business-1",
        name: "Landscaping",
        slug: "landscaping",
        is_default: true,
        drive_folder_id: "missing-landscaping",
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    mockedGetGeneralFoldersForBusiness.mockResolvedValue([
      {
        id: "general-folder-1",
        business_id: "business-1",
        folder_key: "insurance",
        folder_name: "01 Insurance",
        drive_folder_id: "missing-insurance",
        created_at: new Date()
      }
    ]);
    mockedFindGoogleDriveFolderByName.mockImplementation(async (_accessToken, _parentFolderId, name) => ({
      id: `existing-${name}`,
      name
    }));

    await ensureBusinessFolderTemplate("business-1");

    expect(mockedCreateGoogleDriveFolderInParent).not.toHaveBeenCalledWith(
      "access-token",
      "Landscaping",
      "root-1"
    );
    expect(mockedUpsertCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "landscaping",
        driveFolderId: "existing-Landscaping"
      })
    );
    expect(mockedUpsertGeneralFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        folderKey: "insurance",
        driveFolderId: "existing-01 Insurance"
      })
    );
  });

  it("marks the drive connection as error when template creation fails", async () => {
    mockedCreateGoogleDriveFolderInParent.mockRejectedValue(new Error("drive failed"));

    await expect(ensureBusinessFolderTemplate("business-1")).rejects.toThrow("drive failed");

    expect(mockedUpdateDriveConnectionStatus).toHaveBeenCalledWith("business-1", "error");
  });
});
