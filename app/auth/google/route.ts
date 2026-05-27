import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthorizationUrl } from "@/lib/server/integrations/google/oauth";
import { getRequestContext, logWarn } from "@/lib/server/logger";
import { getClientAddress, consumeRateLimit } from "@/lib/server/security/rate-limit";
import {
  clearPostAuthRedirect,
  createOAuthState,
  normalizeReturnPath,
  setOAuthState,
  setPostAuthRedirect
} from "@/lib/server/auth/session";

export async function GET(request: NextRequest) {
  const requestContext = getRequestContext(request);
  const rateLimit = consumeRateLimit({
    bucket: "login-initiation",
    key: getClientAddress(request),
    limit: 10,
    windowMs: 5 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    logWarn("Login initiation rate limited", requestContext);
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": String(rateLimit.retryAfterSeconds)
      }
    });
  }

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
