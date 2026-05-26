import { NextRequest, NextResponse } from "next/server";
import { getSession, normalizeReturnPath } from "@/lib/server/auth/session";
import { env } from "@/lib/server/env";
import { InvitationServiceError, acceptInvitation } from "@/lib/server/services/invitation-service";

function getInvitationPath(token: string) {
  return `/invitations/${token}`;
}

function getLoginUrl(token: string) {
  const url = new URL("/login", env.APP_BASE_URL);
  url.searchParams.set("next", getInvitationPath(token));
  return url;
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const session = await getSession();
  const { token } = await context.params;

  if (!session) {
    return NextResponse.redirect(getLoginUrl(token));
  }

  try {
    const result = await acceptInvitation({
      token,
      userId: session.userId
    });

    const redirectPath = normalizeReturnPath(
      `/businesses/${result.businessId}/jobs?invitation=accepted`
    )!;

    return NextResponse.redirect(new URL(redirectPath, env.APP_BASE_URL));
  } catch (error) {
    const inviteUrl = new URL(getInvitationPath(token), env.APP_BASE_URL);

    if (error instanceof InvitationServiceError) {
      inviteUrl.searchParams.set("error", error.code);
      return NextResponse.redirect(inviteUrl);
    }

    inviteUrl.searchParams.set("error", "unexpected");
    return NextResponse.redirect(inviteUrl);
  }
}
