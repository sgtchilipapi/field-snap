import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import { disconnectBusinessDrive } from "@/lib/server/services/drive-service";

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
  const result = await disconnectBusinessDrive({
    businessId,
    disconnectedByUserId: session.userId
  });

  if (!result) {
    return forbidden();
  }

  return NextResponse.redirect(
    new URL(`/businesses/${businessId}/settings?drive=disconnected`, request.url),
    { status: 303 }
  );
}
