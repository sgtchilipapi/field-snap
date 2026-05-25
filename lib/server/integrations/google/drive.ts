import { AuthFlowError } from "@/lib/server/auth/errors";
import { env } from "@/lib/server/env";

const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

type GoogleDriveTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleDriveUserInfoResponse = {
  email?: string;
};

type GoogleDriveFileResponse = {
  id?: string;
  name?: string;
};

export type GoogleDriveTokens = {
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
};

export type GoogleDriveFile = {
  id: string;
  name: string;
};

export function getGoogleDriveCallbackUrl() {
  return new URL("/auth/google/drive/callback", env.APP_BASE_URL).toString();
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function buildGoogleDriveAuthorizationUrl(input: { state: string }) {
  const url = new URL(GOOGLE_AUTHORIZATION_URL);

  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", getGoogleDriveCallbackUrl());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", `openid email profile ${GOOGLE_DRIVE_SCOPE}`);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("state", input.state);

  return url.toString();
}

export async function exchangeCodeForGoogleDriveTokens(input: { code: string }) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code: input.code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getGoogleDriveCallbackUrl(),
      grant_type: "authorization_code"
    })
  });

  const payload = await parseJson<GoogleDriveTokenResponse>(response);

  if (!response.ok || !payload.access_token) {
    throw new AuthFlowError(
      "callback_failed",
      `Google Drive token exchange failed: ${payload.error ?? response.statusText}`
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    scopes: payload.scope?.split(" ").filter(Boolean) ?? [GOOGLE_DRIVE_SCOPE]
  } satisfies GoogleDriveTokens;
}

export async function fetchGoogleDriveAccountEmail(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await parseJson<GoogleDriveUserInfoResponse>(response);

  if (!response.ok || !payload.email) {
    throw new AuthFlowError(
      "callback_failed",
      `Google account email fetch failed: ${response.status} ${response.statusText}`
    );
  }

  return payload.email;
}

export async function getGoogleDriveFolder(accessToken: string, folderId: string) {
  const response = await fetch(
    `${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(folderId)}?fields=id,name,mimeType`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new AuthFlowError(
      "callback_failed",
      `Google Drive folder lookup failed: ${response.status} ${response.statusText}`
    );
  }

  const payload = await parseJson<GoogleDriveFileResponse & { mimeType?: string }>(response);

  if (!payload.id || !payload.name) {
    throw new AuthFlowError("callback_failed", "Google Drive returned an invalid folder lookup.");
  }

  return {
    id: payload.id,
    name: payload.name
  } satisfies GoogleDriveFile;
}

export async function createGoogleDriveFolder(accessToken: string, name: string) {
  return createGoogleDriveFolderInParent(accessToken, name);
}

export async function createGoogleDriveFolderInParent(
  accessToken: string,
  name: string,
  parentFolderId?: string
) {
  const response = await fetch(`${GOOGLE_DRIVE_FILES_URL}?fields=id,name`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentFolderId ? [parentFolderId] : undefined
    })
  });

  const payload = await parseJson<GoogleDriveFileResponse>(response);

  if (!response.ok || !payload.id || !payload.name) {
    throw new AuthFlowError(
      "callback_failed",
      `Google Drive folder creation failed: ${response.status} ${response.statusText}`
    );
  }

  return {
    id: payload.id,
    name: payload.name
  } satisfies GoogleDriveFile;
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function findGoogleDriveFolderByName(
  accessToken: string,
  parentFolderId: string,
  name: string
) {
  const query = [
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${escapeDriveQueryValue(name)}'`,
    `'${escapeDriveQueryValue(parentFolderId)}' in parents`,
    "trashed = false"
  ].join(" and ");
  const url = new URL(GOOGLE_DRIVE_FILES_URL);

  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id,name)");
  url.searchParams.set("pageSize", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new AuthFlowError(
      "callback_failed",
      `Google Drive folder search failed: ${response.status} ${response.statusText}`
    );
  }

  const payload = await parseJson<{ files?: GoogleDriveFileResponse[] }>(response);
  const match = payload.files?.[0];

  if (!match?.id || !match.name) {
    return null;
  }

  return {
    id: match.id,
    name: match.name
  } satisfies GoogleDriveFile;
}
