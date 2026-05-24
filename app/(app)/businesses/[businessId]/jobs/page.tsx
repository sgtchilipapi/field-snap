import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/server/auth/session";
import { getBusinessDetailsForUser } from "@/lib/server/services/business-service";

export default async function BusinessJobsPage({
  params
}: {
  params: Promise<{ businessId: string }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  const details = await getBusinessDetailsForUser(businessId, session.userId);

  if (!details) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Jobs"
        title={`${details.business.name} jobs`}
        description="Business-scoped routing is now active. Job creation arrives in WO-06 after Drive connection and folder templates exist."
      />
      <EmptyState
        title="No jobs yet"
        description="The business context is live, but job creation is intentionally deferred until later work orders."
      />
    </div>
  );
}
