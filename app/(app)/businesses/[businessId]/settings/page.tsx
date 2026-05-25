import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { requireSession } from "@/lib/server/auth/session";
import { getBusinessDetailsForUser } from "@/lib/server/services/business-service";
import { getBusinessDriveStatusForUser } from "@/lib/server/services/drive-service";
import Link from "next/link";

export default async function BusinessSettingsPage({
  params,
  searchParams
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ drive?: string; drive_error?: string }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  const [{ drive, drive_error: driveError }, details, driveStatus] = await Promise.all([
    searchParams,
    getBusinessDetailsForUser(businessId, session.userId),
    getBusinessDriveStatusForUser(businessId, session.userId)
  ]);

  if (!details || !driveStatus) {
    notFound();
  }

  const driveConnected = driveStatus.connected;
  const driveAlert = driveError
    ? {
        title: "Drive connection failed",
        description: `Google Drive setup did not complete: ${driveError}.`,
        variant: "danger" as const
      }
    : drive === "connected"
      ? {
          title: "Drive connected",
          description: "Google Drive is connected and the business root folder is available.",
          variant: "success" as const
        }
      : {
          title: driveConnected ? "Drive connected" : "Drive not connected",
          description: driveConnected
            ? "This business already has an active Drive connection."
            : "Connect the owner's Google Drive next so Field-Snap can create and manage the business root folder.",
          variant: driveConnected ? ("success" as const) : ("info" as const)
        };
  const isOwner = details.membership.role === "owner_admin";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Business settings"
        title={details.business.name}
        description="Connect the owner's Google Drive for this business and confirm the root folder Field-Snap will manage."
      />
      <InlineAlert
        title={driveAlert.title}
        description={driveAlert.description}
        variant={driveAlert.variant}
      />
      {isOwner ? (
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Google Drive connection</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {driveConnected
                  ? "Reconnect to refresh token material or confirm access to the existing business root folder."
                  : "Authorize Drive access with the owner account. Field-Snap will create or reuse one root folder for this business."}
              </p>
            </div>
            <form action={`/api/businesses/${businessId}/drive/connect`} method="post">
              <button
                className="rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                type="submit"
              >
                {driveConnected ? "Reconnect Google Drive" : "Connect Google Drive"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
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
          <dt className="text-sm text-[color:var(--muted)]">Connection status</dt>
          <dd className="mt-2 text-lg font-semibold">{driveStatus.connectionStatus}</dd>
        </div>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <dt className="text-sm text-[color:var(--muted)]">Connected Google account</dt>
          <dd className="mt-2 break-all text-lg font-semibold">
            {driveStatus.googleAccountEmail ?? "Not connected yet"}
          </dd>
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
      {driveStatus.driveOpenUrl ? (
        <Link
          className="inline-flex rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
          href={driveStatus.driveOpenUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open in Drive
        </Link>
      ) : null}
    </div>
  );
}
