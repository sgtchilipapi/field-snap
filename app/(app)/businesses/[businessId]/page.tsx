import { redirect } from "next/navigation";
import { requireBusinessPageAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { getBusinessLandingPath } from "@/lib/server/services/business-service";

export default async function BusinessIndexPage({
  params
}: {
  params: Promise<{ businessId: string }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  const details = await requireBusinessPageAccess({
    businessId,
    userId: session.userId,
    capability: "business:view"
  });

  redirect(
    getBusinessLandingPath({
      id: businessId,
      role: details.membership.role,
      driveConnected: details.business.drive_root_folder_id !== null
    })
  );
}
