import { NextRequest, NextResponse } from "next/server";
import { AuthFlowError } from "@/lib/server/auth/errors";
import {
  clearOAuthState,
  clearPostAuthRedirect,
  getOAuthState,
  getPostAuthRedirect,
  setSession
} from "@/lib/server/auth/session";
import { env } from "@/lib/server/env";
import { fetchGoogleIdentityFromCode } from "@/lib/server/integrations/google/oauth";
import { logError } from "@/lib/server/logger";
import { loginOrCreateUserFromGoogle } from "@/lib/server/services/auth-service";

function redirectToLogin(errorCode: string) {
  const url = new URL("/login", env.APP_BASE_URL);
  url.searchParams.set("error", errorCode);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const [expectedState, postAuthRedirect] = await Promise.all([getOAuthState(), getPostAuthRedirect()]);

  if (error === "access_denied") {
    await Promise.all([clearOAuthState(), clearPostAuthRedirect()]);
    return redirectToLogin("access_denied");
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    logError("Google callback validation failed", undefined, {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasExpectedState: Boolean(expectedState),
      stateMatched: Boolean(state && expectedState && state === expectedState)
    });
    await Promise.all([clearOAuthState(), clearPostAuthRedirect()]);
    return redirectToLogin("callback_failed");
  }

  try {
    const identity = await fetchGoogleIdentityFromCode(code);
    const result = await loginOrCreateUserFromGoogle(identity);

    await Promise.all([clearOAuthState(), clearPostAuthRedirect()]);
    await setSession(result.user.id);

    return NextResponse.redirect(new URL(postAuthRedirect ?? result.redirectTo, env.APP_BASE_URL));
  } catch (caughtError) {
    await Promise.all([clearOAuthState(), clearPostAuthRedirect()]);

    if (caughtError instanceof AuthFlowError) {
      logError("Google auth flow failed", caughtError, {
        code: caughtError.code,
        callback: "/auth/google/callback"
      });
      return redirectToLogin(caughtError.code);
    }

    logError("Unexpected Google auth callback failure", caughtError, {
      callback: "/auth/google/callback"
    });
    return redirectToLogin("unexpected");
  }
}
