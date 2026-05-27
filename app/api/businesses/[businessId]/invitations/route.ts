import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import { env } from "@/lib/server/env";
import { getRequestContext, logWarn } from "@/lib/server/logger";
import { consumeRateLimit, getClientAddress } from "@/lib/server/security/rate-limit";
import { InvitationServiceError, createInvitationForBusiness } from "@/lib/server/services/invitation-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  const { businessId } = await context.params;
  const requestContext = getRequestContext(request, {
    businessId,
    userId: session.userId
  });
  const rateLimit = consumeRateLimit({
    bucket: "invitation-create",
    key: `${businessId}:${session.userId}:${getClientAddress(request)}`,
    limit: 10,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    logWarn("Invitation creation rate limited", requestContext);
    return NextResponse.json(
      { error: "Too many invitations created. Please wait and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  try {
    const body = await request.json();
    const result = await createInvitationForBusiness({
      businessId,
      userId: session.userId,
      values: body,
      baseUrl: env.APP_BASE_URL
    });

    return NextResponse.json(
      {
        invitation: {
          id: result.invitation.id,
          invited_email: result.invitation.invited_email,
          role: result.invitation.role,
          status: result.invitation.status,
          expires_at: result.invitation.expires_at,
          created_at: result.invitation.created_at
        },
        invite_url: result.inviteUrl
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Invitation payload is invalid."
        },
        { status: 400 }
      );
    }

    if (error instanceof InvitationServiceError && error.code === "forbidden") {
      return forbidden();
    }

    throw error;
  }
}
