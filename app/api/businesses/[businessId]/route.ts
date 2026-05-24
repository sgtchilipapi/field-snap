import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import { getBusinessDetailsForUser } from "@/lib/server/services/business-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ businessId: string }>;
  }
) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  const { businessId } = await context.params;
  const details = await getBusinessDetailsForUser(businessId, session.userId);

  if (!details) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: details.business.id,
    name: details.business.name,
    owner_user_id: details.business.owner_user_id,
    drive_root_folder_id: details.business.drive_root_folder_id,
    general_docs_folder_id: details.business.general_docs_folder_id,
    created_at: details.business.created_at,
    updated_at: details.business.updated_at,
    membership: details.membership,
    drive_connected: details.business.drive_root_folder_id !== null
  });
}
