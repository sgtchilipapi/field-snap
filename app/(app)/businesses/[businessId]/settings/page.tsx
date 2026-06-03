import { InvitationManager } from "@/components/business/invitation-manager";
import { PageHeader } from "@/components/layout/page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { redirect } from "next/navigation";
import { requireBusinessPageAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { getBusinessDriveStatusForUser } from "@/lib/server/services/drive-service";
import { listInvitationsForBusinessForOwner } from "@/lib/server/services/invitation-service";
import Link from "next/link";

export default async function BusinessSettingsPage({
  params,
  searchParams
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{
    drive?: string;
    drive_error?: string;
    folders?: string;
    folders_error?: string;
  }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  const [
    { folders, folders_error: foldersError },
    details,
    driveStatus
  ] = await Promise.all([
    searchParams,
    requireBusinessPageAccess({
      businessId,
      userId: session.userId,
      capability: "settings:view"
    }),
    getBusinessDriveStatusForUser(businessId, session.userId)
  ]);

  if (!driveStatus) {
    redirect("/forbidden");
  }

  const driveConnected = driveStatus.connected;
  const isOwner = details.membership.role === "owner_admin";
  const invitations = isOwner
    ? (
      await listInvitationsForBusinessForOwner({
        businessId,
        userId: session.userId
      })
    ).map((invitation) => ({
      ...invitation,
      expires_at: invitation.expires_at.toISOString(),
      created_at: invitation.created_at.toISOString(),
      accepted_at: invitation.accepted_at?.toISOString() ?? null
    }))
    : [];
  const needsReconnect =
    driveStatus.connectionStatus === "error" || driveStatus.connectionStatus === "revoked";
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Business settings"
        title={details.business.name}
      // description="Connect the owner's Google Drive for this business and confirm the root folder Field-Snap will manage."
      />
      {/* <InlineAlert title={driveAlert.title} description={driveAlert.description} variant={driveAlert.variant} /> */}
      {foldersError ? (
        <InlineAlert
          title="Folder repair failed"
          description="Field-Snap could not recreate the required default Drive folders for this business."
          variant="danger"
        />
      ) : folders === "repaired" ? (
        <InlineAlert
          title="Folders repaired"
          description="Field-Snap verified the default category and general document folders for this business."
          variant="success"
        />
      ) : null}
      {isOwner ? (
        <div className="space-y-4 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Google Drive is { driveConnected
                ? needsReconnect
                  ? "needing connection refresh."
                  : "connected."
                : "disconnected"}</h2>

            </div>
            <form action={`/api/businesses/${businessId}/drive/connect`} method="post" className="space-x-2">
              <button
                className={`rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 display=${driveConnected ? "block" : "none"}`}
                type="submit"
              >
                {driveConnected ? needsReconnect ? "Refresh Connection" : "Connected" : "Connect"}
              </button>
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
            </form>

          </div>
          {/* {driveConnected ? (
            <div className="flex flex-col gap-3 border-t border-[color:var(--border)] pt-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-semibold">Default folder template</h3>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Recreate missing category or general document folders if they were changed or deleted in Google Drive.
                </p>
              </div>
              <form action={`/api/businesses/${businessId}/drive/repair`} method="post">
                <button
                  className="rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
                  type="submit"
                >
                  Repair Drive folders
                </button>
              </form>
            </div>
          ) : null} */}
        </div>
      ) : null}
      {/* <dl className="grid gap-4 md:grid-cols-2">
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
      </dl> */}

      {isOwner ? <InvitationManager businessId={businessId} invitations={invitations} /> : null}
    </div>
  );
}
