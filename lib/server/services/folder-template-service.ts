import {
  DEFAULT_CATEGORIES,
  GENERAL_BUSINESS_DOCS_FOLDER_NAME,
  GENERAL_FOLDER_TEMPLATES
} from "@/lib/server/constants/folder-template";
import {
  getBusinessById,
  updateBusinessDriveRootFolder,
  updateBusinessGeneralDocsFolder
} from "@/lib/server/data/businesses";
import {
  getCategoriesForBusiness,
  upsertCategory
} from "@/lib/server/data/categories";
import { getDriveConnectionForBusiness } from "@/lib/server/data/drive-connections";
import {
  getGeneralFoldersForBusiness,
  upsertGeneralFolder
} from "@/lib/server/data/general-folders";
import { decryptSecret } from "@/lib/server/security/encryption";
import {
  createGoogleDriveFolder,
  createGoogleDriveFolderInParent,
  findGoogleDriveFolderByName,
  getGoogleDriveFolder
} from "@/lib/server/integrations/google/drive";
import { markDriveConnectionIssue } from "@/lib/server/services/drive-connection-health";

async function ensureFolder(input: {
  accessToken: string;
  folderName: string;
  existingFolderId: string | null;
  parentFolderId?: string;
}) {
  if (input.existingFolderId) {
    const existingFolder = await getGoogleDriveFolder(input.accessToken, input.existingFolderId);

    if (existingFolder) {
      return existingFolder;
    }
  }

  if (input.parentFolderId) {
    const matchingFolder = await findGoogleDriveFolderByName(
      input.accessToken,
      input.parentFolderId,
      input.folderName
    );

    if (matchingFolder) {
      return matchingFolder;
    }

    return createGoogleDriveFolderInParent(
      input.accessToken,
      input.folderName,
      input.parentFolderId
    );
  }

  return createGoogleDriveFolder(input.accessToken, input.folderName);
}

export async function ensureBusinessFolderTemplate(businessId: string) {
  const [business, connection, existingCategories, existingGeneralFolders] = await Promise.all([
    getBusinessById(businessId),
    getDriveConnectionForBusiness(businessId),
    getCategoriesForBusiness(businessId),
    getGeneralFoldersForBusiness(businessId)
  ]);

  if (!business) {
    throw new Error("Business not found.");
  }

  if (!connection || connection.status !== "active" || !connection.access_token_encrypted) {
    throw new Error("Active Drive connection required.");
  }

  const accessToken = decryptSecret(connection.access_token_encrypted);

  try {
    const rootFolder = await ensureFolder({
      accessToken,
      folderName: `Fylerr - ${business.name}`,
      existingFolderId: business.drive_root_folder_id
    });

    if (business.drive_root_folder_id !== rootFolder.id) {
      await updateBusinessDriveRootFolder(businessId, rootFolder.id);
    }

    const generalDocsFolder = await ensureFolder({
      accessToken,
      folderName: GENERAL_BUSINESS_DOCS_FOLDER_NAME,
      existingFolderId: business.general_docs_folder_id,
      parentFolderId: rootFolder.id
    });

    if (business.general_docs_folder_id !== generalDocsFolder.id) {
      await updateBusinessGeneralDocsFolder(businessId, generalDocsFolder.id);
    }

    const existingCategoryMap = new Map(existingCategories.map((category) => [category.slug, category]));
    const existingGeneralFolderMap = new Map(
      existingGeneralFolders.map((folder) => [folder.folder_key, folder])
    );

    await Promise.all(
      DEFAULT_CATEGORIES.map(async (category) => {
        const driveFolder = await ensureFolder({
          accessToken,
          folderName: category.name,
          existingFolderId: existingCategoryMap.get(category.slug)?.drive_folder_id ?? null,
          parentFolderId: rootFolder.id
        });

        await upsertCategory({
          businessId,
          name: category.name,
          slug: category.slug,
          isDefault: true,
          driveFolderId: driveFolder.id
        });
      })
    );

    await Promise.all(
      GENERAL_FOLDER_TEMPLATES.map(async (folder) => {
        const driveFolder = await ensureFolder({
          accessToken,
          folderName: folder.name,
          existingFolderId: existingGeneralFolderMap.get(folder.key)?.drive_folder_id ?? null,
          parentFolderId: generalDocsFolder.id
        });

        await upsertGeneralFolder({
          businessId,
          folderKey: folder.key,
          folderName: folder.name,
          driveFolderId: driveFolder.id
        });
      })
    );
  } catch (error) {
    await markDriveConnectionIssue(businessId, error, {
      businessId
    });
    throw error;
  }
}
