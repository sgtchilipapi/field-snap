import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { requireSession } from "@/lib/server/auth/session";
import { getBusinessDetailsForUser } from "@/lib/server/services/business-service";

export default async function BusinessSettingsPage({
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

  const driveConnected = details.business.drive_root_folder_id !== null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Business settings"
        title={details.business.name}
        description="WO-03 establishes the business container and routes owners toward Drive connection next."
      />
      <InlineAlert
        title={driveConnected ? "Drive connected" : "Drive not connected"}
        description={
          driveConnected
            ? "A Drive root folder is already stored for this business."
            : "Drive connection lands in WO-04. This is the onboarding destination for newly created businesses."
        }
        variant={driveConnected ? "success" : "info"}
      />
      <dl className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <dt className="text-sm text-[color:var(--muted)]">Role</dt>
          <dd className="mt-2 text-lg font-semibold">{details.membership.role}</dd>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <dt className="text-sm text-[color:var(--muted)]">Membership status</dt>
          <dd className="mt-2 text-lg font-semibold">{details.membership.status}</dd>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <dt className="text-sm text-[color:var(--muted)]">Drive root folder id</dt>
          <dd className="mt-2 break-all text-lg font-semibold">
            {details.business.drive_root_folder_id ?? "Not connected yet"}
          </dd>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <dt className="text-sm text-[color:var(--muted)]">General docs folder id</dt>
          <dd className="mt-2 break-all text-lg font-semibold">
            {details.business.general_docs_folder_id ?? "Not created yet"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
