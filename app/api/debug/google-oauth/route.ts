import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import { env } from "@/lib/server/env";
import { buildGoogleAuthorizationUrl } from "@/lib/server/integrations/google/oauth";
import {
  buildGoogleDriveAuthorizationUrl,
  getGoogleDriveCallbackUrl
} from "@/lib/server/integrations/google/drive";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function parseAuthorizationUrl(url: string) {
  const parsed = new URL(url);

  return {
    client_id: parsed.searchParams.get("client_id"),
    redirect_uri: parsed.searchParams.get("redirect_uri"),
    scope: parsed.searchParams.get("scope"),
    access_type: parsed.searchParams.get("access_type"),
    prompt: parsed.searchParams.get("prompt")
  };
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const loginOAuth = parseAuthorizationUrl(buildGoogleAuthorizationUrl("debug-login-state"));
    const driveOAuth = parseAuthorizationUrl(
      buildGoogleDriveAuthorizationUrl({ state: "debug-drive-state" })
    );

    return NextResponse.json({
      app_base_url: env.APP_BASE_URL,
      active_google_client_id: env.GOOGLE_CLIENT_ID,
      login_oauth: loginOAuth,
      drive_oauth: {
        ...driveOAuth,
        callback_url: getGoogleDriveCallbackUrl()
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to inspect Google OAuth config."
      },
      { status: 500 }
    );
  }
}
