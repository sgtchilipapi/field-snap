import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import { logError } from "@/lib/server/logger";
import { getBusinessOwnerDetailsForUser } from "@/lib/server/services/business-service";
import { ensureBusinessFolderTemplate } from "@/lib/server/services/folder-template-service";

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
  const details = await getBusinessOwnerDetailsForUser(businessId, session.userId);

  if (!details) {
    return forbidden();
  }

  try {
    await ensureBusinessFolderTemplate(businessId);
  } catch (error) {
    logError("Business folder template repair failed", error, {
      businessId,
      userId: session.userId
    });

    return NextResponse.redirect(
      new URL(`/businesses/${businessId}/settings?folders_error=repair_failed`, _request.url)
    );
  }

  return NextResponse.redirect(
    new URL(`/businesses/${businessId}/settings?folders=repaired`, _request.url)
  );
}
