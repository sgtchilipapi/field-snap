import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/server/auth/session";
import { getUserWithMemberships } from "@/lib/server/data/users";

export default async function NewBusinessPage() {
  const session = await requireSession();
  const details = await getUserWithMemberships(session.userId);

  if (details && details.memberships.length > 0) {
    redirect("/businesses");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="First-time setup"
        title="Your account is ready for business creation"
        description="Google sign-in is complete. The actual business setup form lands in WO-03, and this route now acts as the correct post-login destination for first-time users."
      />
      <EmptyState
        title="No business memberships yet"
        description="This account has no active business memberships, so Field-Snap routes here until business creation is implemented."
      />
    </div>
  );
}
