import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/server/auth/session";
import { NewBusinessForm } from "@/components/business/new-business-form";

export default async function NewBusinessPage() {
  await requireSession();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Business setup"
        title="Create a Field-Snap business"
        description="This creates the business record and your owner-admin membership. Drive connection happens next, in the business settings flow."
      />
      <NewBusinessForm />
    </div>
  );
}
