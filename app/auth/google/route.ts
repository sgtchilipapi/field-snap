import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthorizationUrl } from "@/lib/server/integrations/google/oauth";
import {
  clearPostAuthRedirect,
  createOAuthState,
  normalizeReturnPath,
  setOAuthState,
  setPostAuthRedirect
} from "@/lib/server/auth/session";

export async function GET(request: NextRequest) {
  const state = createOAuthState();
  const nextPath = normalizeReturnPath(request.nextUrl.searchParams.get("next"));

  await setOAuthState(state);
  if (nextPath) {
    await setPostAuthRedirect(nextPath);
  } else {
    await clearPostAuthRedirect();
  }

  return NextResponse.redirect(buildGoogleAuthorizationUrl(state));
}
