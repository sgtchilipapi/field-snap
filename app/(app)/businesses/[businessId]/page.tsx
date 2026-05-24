import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/auth/session";
import {
  getBusinessDetailsForUser,
  getBusinessLandingPath
} from "@/lib/server/services/business-service";

export default async function BusinessIndexPage({
  params
}: {
  params: Promise<{ businessId: string }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  const details = await getBusinessDetailsForUser(businessId, session.userId);

  if (!details) {
    redirect("/businesses");
  }

  redirect(
    getBusinessLandingPath({
      id: businessId,
      role: details.membership.role,
      driveConnected: details.business.drive_root_folder_id !== null
    })
  );
}
