import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SiteHeader } from "@/components/layout/site-header";
import { requireSession } from "@/lib/server/auth/session";
import { NewBusinessForm } from "@/components/business/new-business-form";

export default async function NewBusinessPage() {
  await requireSession();

  return (
    <AppShell topBar={<SiteHeader />}>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Business setup"
          title="What's the name of your business?"
          // description="This creates the business record and your owner-admin membership."
        />
        <NewBusinessForm />
      </div>
    </AppShell>
  );
}
