import { BusinessesWorkspace } from "@/components/business/businesses-workspace";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SiteHeader } from "@/components/layout/site-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/server/auth/session";
import { listBusinessesForUser } from "@/lib/server/services/business-service";
import { findUserById } from "@/lib/server/data/users";

export default async function BusinessesPage() {
  const session = await requireSession();
  const businesses = await listBusinessesForUser(session.userId);
  const user = await findUserById(session.userId);

  return (
    <AppShell topBar={<SiteHeader />}>
      <div className="space-y-8">
        <PageHeader
          eyebrow={`${user?.name}'s`} //It should be "<User Name>'s".
          title="Businesses"
          description="Open an existing business or create a new one."
        />
        <BusinessesWorkspace businesses={businesses} />
        {businesses.length === 0 ? (
          <EmptyState
            title="No businesses yet"
            description="Create your first business to start connecting Drive, creating jobs, and capturing documents."
          />
        ) : null}
      </div>
    </AppShell>
  );
}
