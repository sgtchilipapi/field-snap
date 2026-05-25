import { NextRequest, NextResponse } from "next/server";
import { AuthFlowError } from "@/lib/server/auth/errors";
import {
  clearDriveOAuthState,
  getDriveOAuthState,
  getSession
} from "@/lib/server/auth/session";
import { env } from "@/lib/server/env";
import { logError } from "@/lib/server/logger";
import { connectBusinessDriveFromCode } from "@/lib/server/services/drive-service";

function redirectAfterDriveCallback(businessId: string | null | undefined, errorCode?: string) {
  const pathname = businessId ? `/businesses/${businessId}/settings` : "/businesses";
  const url = new URL(pathname, env.APP_BASE_URL);

  if (errorCode) {
    url.searchParams.set("drive_error", errorCode);
  } else {
    url.searchParams.set("drive", "connected");
  }

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const [session, expectedState] = await Promise.all([getSession(), getDriveOAuthState()]);
  const businessId = expectedState?.businessId;

  if (error === "access_denied") {
    await clearDriveOAuthState();
    return redirectAfterDriveCallback(businessId, "access_denied");
  }

  if (
    !session ||
    !code ||
    !state ||
    !expectedState ||
    !businessId ||
    expectedState.userId !== session.userId ||
    expectedState.nonce !== state
  ) {
    logError("Drive callback validation failed", undefined, {
      businessId,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasSession: Boolean(session),
      hasExpectedState: Boolean(expectedState)
    });
    await clearDriveOAuthState();
    return redirectAfterDriveCallback(businessId, "callback_failed");
  }

  try {
    const result = await connectBusinessDriveFromCode({
      businessId,
      connectedByUserId: session.userId,
      code
    });

    await clearDriveOAuthState();

    if (!result) {
      return redirectAfterDriveCallback(businessId, "forbidden");
    }

    return redirectAfterDriveCallback(businessId);
  } catch (caughtError) {
    await clearDriveOAuthState();

    if (caughtError instanceof AuthFlowError) {
      logError("Drive auth flow failed", caughtError, {
        businessId,
        code: caughtError.code
      });
      return redirectAfterDriveCallback(businessId, caughtError.code);
    }

    logError("Unexpected Drive callback failure", caughtError, {
      businessId
    });
    return redirectAfterDriveCallback(businessId, "unexpected");
  }
}
