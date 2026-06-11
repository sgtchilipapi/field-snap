import { AuthFlowError } from "@/lib/server/auth/errors";
import { env } from "@/lib/server/env";

const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const GOOGLE_DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
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

export type GoogleDriveFileBytes = {
  bytes: Uint8Array;
};

export function getGoogleDriveCallbackUrl() {
  return new URL("/auth/google/drive/callback", env.APP_BASE_URL).toString();
}

function createGoogleDriveApiError(response: Response, action: string) {
  return new AuthFlowError(
    response.status === 401 || response.status === 403 ? "access_denied" : "callback_failed",
    `Google Drive ${action} failed: ${response.status} ${response.statusText}`
  );
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
    throw createGoogleDriveApiError(response, "account email fetch");
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
    throw createGoogleDriveApiError(response, "folder lookup");
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
    throw createGoogleDriveApiError(response, "folder creation");
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
    throw createGoogleDriveApiError(response, "folder search");
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

export async function uploadGoogleDriveFile(input: {
  accessToken: string;
  folderId: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
}) {
  const boundary = `fylerr-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: input.filename,
    parents: [input.folderId]
  });
  const prefix =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${input.mimeType}\r\n\r\n`;
  const suffix = `\r\n--${boundary}--`;
  const prefixBytes = new TextEncoder().encode(prefix);
  const suffixBytes = new TextEncoder().encode(suffix);
  const body = new Uint8Array(prefixBytes.length + input.bytes.length + suffixBytes.length);

  body.set(prefixBytes, 0);
  body.set(input.bytes, prefixBytes.length);
  body.set(suffixBytes, prefixBytes.length + input.bytes.length);

  const response = await fetch(`${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });

  const payload = await parseJson<GoogleDriveFileResponse>(response);

  if (!response.ok || !payload.id || !payload.name) {
    throw createGoogleDriveApiError(response, "file upload");
  }

  return {
    id: payload.id,
    name: payload.name
  } satisfies GoogleDriveFile;
}

export async function getGoogleDriveFileBytes(accessToken: string, fileId: string) {
  const response = await fetch(
    `${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw createGoogleDriveApiError(response, "file download");
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer())
  } satisfies GoogleDriveFileBytes;
}

export async function moveGoogleDriveFile(input: {
  accessToken: string;
  fileId: string;
  fromFolderId: string;
  toFolderId: string;
}) {
  const response = await fetch(
    `${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(input.fileId)}?addParents=${encodeURIComponent(
      input.toFolderId
    )}&removeParents=${encodeURIComponent(input.fromFolderId)}&fields=id,name`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${input.accessToken}`
      }
    }
  );

  const payload = await parseJson<GoogleDriveFileResponse>(response);

  if (!response.ok || !payload.id || !payload.name) {
    throw createGoogleDriveApiError(response, "file move");
  }

  return {
    id: payload.id,
    name: payload.name
  } satisfies GoogleDriveFile;
}

export async function renameGoogleDriveFile(input: {
  accessToken: string;
  fileId: string;
  filename: string;
}) {
  const response = await fetch(
    `${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(input.fileId)}?fields=id,name`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: input.filename
      })
    }
  );

  const payload = await parseJson<GoogleDriveFileResponse>(response);

  if (!response.ok || !payload.id || !payload.name) {
    throw createGoogleDriveApiError(response, "file rename");
  }

  return {
    id: payload.id,
    name: payload.name
  } satisfies GoogleDriveFile;
}
