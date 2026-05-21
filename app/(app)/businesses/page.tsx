import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/server/auth/session";
import { getUserWithMemberships } from "@/lib/server/data/users";

export default async function BusinessesPage() {
  const session = await requireSession();
  const details = await getUserWithMemberships(session.userId);

  if (!details || details.memberships.length === 0) {
    redirect("/businesses/new");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Business access"
        title="Field-Snap knows your memberships"
        description="Business selection and routing become the focus of WO-03. Your current memberships are already available through the authenticated data layer."
      />
      <div className="grid gap-4">
        {details.memberships.map((membership) => (
          <div
            className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
            key={membership.businessId}
          >
            <h2 className="text-xl font-semibold">{membership.businessName}</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Role: {membership.role} | Status: {membership.status}
            </p>
          </div>
        ))}
      </div>
      <EmptyState
        title="Business-scoped navigation is next"
        description="WO-03 will turn this membership data into the actual business picker and onboarding flow."
      />
    </div>
  );
}

