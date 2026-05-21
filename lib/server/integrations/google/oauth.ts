import { AuthFlowError } from "@/lib/server/auth/errors";
import { env } from "@/lib/server/env";

const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
};

export function buildGoogleAuthorizationUrl(state: string) {
  const url = new URL(GOOGLE_AUTHORIZATION_URL);

  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", new URL("/auth/google/callback", env.APP_BASE_URL).toString());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);

  return url.toString();
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function exchangeCodeForGoogleTokens(code: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: new URL("/auth/google/callback", env.APP_BASE_URL).toString(),
      grant_type: "authorization_code"
    })
  });

  const payload = await parseJson<GoogleTokenResponse>(response);

  if (!response.ok || !payload.access_token) {
    throw new AuthFlowError(
      "callback_failed",
      `Google token exchange failed: ${payload.error ?? response.statusText}`
    );
  }

  return payload.access_token;
}

export async function fetchGoogleIdentity(accessToken: string): Promise<GoogleIdentity> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await parseJson<GoogleUserInfoResponse>(response);

  if (!response.ok || !payload.sub || !payload.email) {
    throw new AuthFlowError(
      "callback_failed",
      `Google userinfo fetch failed: ${response.status} ${response.statusText}`
    );
  }

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: Boolean(payload.email_verified),
    name: payload.name ?? null,
    avatarUrl: payload.picture ?? null
  };
}

export async function fetchGoogleIdentityFromCode(code: string) {
  const accessToken = await exchangeCodeForGoogleTokens(code);
  return fetchGoogleIdentity(accessToken);
}

