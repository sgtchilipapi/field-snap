import { NextResponse } from "next/server";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import { getSession, createOAuthState, setDriveOAuthState } from "@/lib/server/auth/session";
import { buildGoogleDriveAuthorizationUrl } from "@/lib/server/integrations/google/drive";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ businessId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  const { businessId } = await context.params;
  const authorization = await authorizeBusinessAccess({
    businessId,
    userId: session.userId,
    capability: "drive:manage"
  });

  if (!authorization.allowed) {
    return forbidden();
  }

  const nonce = createOAuthState();

  await setDriveOAuthState({
    businessId,
    nonce,
    userId: session.userId
  });

  return NextResponse.redirect(
    buildGoogleDriveAuthorizationUrl({
      state: nonce
    })
  );
}
