import { NextResponse } from "next/server";
import { buildGoogleAuthorizationUrl } from "@/lib/server/integrations/google/oauth";
import { createOAuthState, setOAuthState } from "@/lib/server/auth/session";

export async function GET() {
  const state = createOAuthState();
  await setOAuthState(state);

  return NextResponse.redirect(buildGoogleAuthorizationUrl(state));
}

