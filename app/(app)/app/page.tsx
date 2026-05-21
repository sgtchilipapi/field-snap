import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function AuthenticatedHomePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Authenticated landing"
        title="Field-Snap is ready for business-scoped pages"
        description="This protected route is the placeholder destination until memberships and business routing are implemented."
      />
      <EmptyState
        title="No business context yet"
        description="WO-03 will route authenticated users into their businesses once memberships exist."
      />
    </div>
  );
}

