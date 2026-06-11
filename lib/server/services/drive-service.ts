import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/server/audit/logs";
import {
  updateBusinessDriveRootFolder
} from "@/lib/server/data/businesses";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import {
  getDriveConnectionForBusiness,
  upsertDriveConnection
} from "@/lib/server/data/drive-connections";
import {
  createGoogleDriveFolder,
  exchangeCodeForGoogleDriveTokens,
  fetchGoogleDriveAccountEmail,
  getGoogleDriveFolder,
  type GoogleDriveTokens
} from "@/lib/server/integrations/google/drive";
import { logInfo } from "@/lib/server/logger";
import { encryptSecret } from "@/lib/server/security/encryption";
import { markDriveConnectionIssue } from "@/lib/server/services/drive-connection-health";

export type BusinessDriveStatus = {
  connected: boolean;
  googleAccountEmail: string | null;
  rootFolderId: string | null;
  driveOpenUrl: string | null;
  connectionStatus: "not_connected" | "active" | "revoked" | "error";
};

export function getBusinessDriveOpenUrl(rootFolderId: string | null) {
  return rootFolderId ? `https://drive.google.com/drive/folders/${rootFolderId}` : null;
}

export async function getBusinessDriveStatusForUser(businessId: string, userId: string) {
  const authorization = await authorizeBusinessAccess({
    businessId,
    userId,
    capability: "settings:view"
  });

  if (!authorization.allowed) {
    return null;
  }

  const [details, connection] = await Promise.all([
    Promise.resolve(authorization.details),
    getDriveConnectionForBusiness(businessId)
  ]);

  const connected = Boolean(
    details.business.drive_root_folder_id && connection && connection.status === "active"
  );

  return {
    connected,
    googleAccountEmail: connection?.google_account_email ?? null,
    rootFolderId: details.business.drive_root_folder_id,
    driveOpenUrl: getBusinessDriveOpenUrl(details.business.drive_root_folder_id),
    connectionStatus: connection?.status ?? "not_connected"
  } satisfies BusinessDriveStatus;
}

async function ensureBusinessRootFolder(input: {
  businessId: string;
  businessName: string;
  accessToken: string;
  existingRootFolderId: string | null;
}) {
  if (input.existingRootFolderId) {
    const existingFolder = await getGoogleDriveFolder(input.accessToken, input.existingRootFolderId);

    if (existingFolder) {
      return existingFolder.id;
    }
  }

  const folder = await createGoogleDriveFolder(
    input.accessToken,
    `Fylerr - ${input.businessName}`
  );

  await updateBusinessDriveRootFolder(input.businessId, folder.id);

  return folder.id;
}

async function persistBusinessDriveConnection(input: {
  accessToken: string;
  businessId: string;
  connectedByUserId: string;
  existingRefreshTokenEncrypted: string | null;
  googleAccountEmail: string;
  rootFolderId: string;
  tokens: GoogleDriveTokens;
}) {
  await upsertDriveConnection({
    businessId: input.businessId,
    connectedByUserId: input.connectedByUserId,
    googleAccountEmail: input.googleAccountEmail,
    accessTokenEncrypted: encryptSecret(input.tokens.accessToken),
    refreshTokenEncrypted: input.tokens.refreshToken
      ? encryptSecret(input.tokens.refreshToken)
      : input.existingRefreshTokenEncrypted,
    scopes: input.tokens.scopes,
    status: "active"
  });

  await updateBusinessDriveRootFolder(input.businessId, input.rootFolderId);
}

export async function connectBusinessDriveFromCode(input: {
  businessId: string;
  connectedByUserId: string;
  code: string;
}) {
  const authorization = await authorizeBusinessAccess({
    businessId: input.businessId,
    userId: input.connectedByUserId,
    capability: "drive:manage"
  });

  if (!authorization.allowed) {
    return null;
  }

  const details = authorization.details;

  const existingConnection = await getDriveConnectionForBusiness(input.businessId);

  try {
    const tokens = await exchangeCodeForGoogleDriveTokens({
      code: input.code
    });
    const googleAccountEmail = await fetchGoogleDriveAccountEmail(tokens.accessToken);
    const rootFolderId = await ensureBusinessRootFolder({
      businessId: input.businessId,
      businessName: details.business.name,
      accessToken: tokens.accessToken,
      existingRootFolderId: details.business.drive_root_folder_id
    });

    await persistBusinessDriveConnection({
      accessToken: tokens.accessToken,
      businessId: input.businessId,
      connectedByUserId: input.connectedByUserId,
      existingRefreshTokenEncrypted: existingConnection?.refresh_token_encrypted ?? null,
      googleAccountEmail,
      rootFolderId,
      tokens
    });

    await recordAuditEvent({
      businessId: input.businessId,
      actorUserId: input.connectedByUserId,
      entityType: "business",
      entityId: input.businessId,
      action: AUDIT_ACTIONS.driveConnected,
      newValue: {
        google_account_email: googleAccountEmail,
        root_folder_id: rootFolderId
      }
    });

    logInfo("Drive connection refreshed", {
      businessId: input.businessId,
      userId: input.connectedByUserId,
      rootFolderId,
      googleAccountEmail
    });

    return {
      rootFolderId,
      googleAccountEmail
    };
  } catch (error) {
    if (existingConnection) {
      await markDriveConnectionIssue(input.businessId, error, {
        userId: input.connectedByUserId
      });
    }

    throw error;
  }
}
