import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import { getBusinessDriveStatusForUser } from "@/lib/server/services/drive-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ businessId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  const { businessId } = await context.params;
  const status = await getBusinessDriveStatusForUser(businessId, session.userId);

  if (!status) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    connected: status.connected,
    google_account_email: status.googleAccountEmail,
    root_folder_id: status.rootFolderId
  });
}
