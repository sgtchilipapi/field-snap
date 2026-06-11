import Link from "next/link";
import { InlineAlert } from "@/components/ui/inline-alert";
import { getSession } from "@/lib/server/auth/session";
import { getInvitationPreview } from "@/lib/server/services/invitation-service";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function getRoleLabel(role: "field_user" | "reviewer") {
  return role === "field_user" ? "Field user" : "Reviewer";
}

function getLoginHref(token: string) {
  return `/login?next=${encodeURIComponent(`/invitations/${token}`)}`;
}

export default async function InvitationPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const { token } = await params;
  const [{ error }, preview] = await Promise.all([
    searchParams,
    getInvitationPreview({
      token,
      userId: session?.userId ?? null
    })
  ]);

  const mismatchEmail = preview.invitation?.invitedEmail ?? "the invited address";
  const alert =
    error === "unexpected"
      ? {
          title: "Invitation acceptance failed",
          description: "Fylerr could not complete this invitation action. Try again.",
          variant: "danger" as const
        }
      : preview.state === "invalid"
        ? {
            title: "Invitation not found",
            description: "This invitation link is invalid or no longer available.",
            variant: "danger" as const
          }
        : preview.state === "expired"
          ? {
              title: "Invitation expired",
              description: "This invitation expired after 7 days. Ask the business owner for a new link.",
              variant: "danger" as const
            }
          : preview.state === "revoked"
            ? {
                title: "Invitation revoked",
                description: "This invitation was revoked and can no longer be accepted.",
                variant: "danger" as const
              }
            : preview.state === "accepted"
              ? {
                  title: "Invitation already accepted",
                  description: "This invitation has already been used.",
                  variant: "info" as const
                }
              : preview.state === "email_mismatch"
                ? {
                    title: "Email mismatch",
                    description: `Sign in with ${mismatchEmail} to accept this invitation.`,
                    variant: "danger" as const
                  }
                : preview.state === "login_required"
                  ? {
                      title: "Sign in required",
                      description: "Continue with Google using the invited email address to accept this invitation.",
                      variant: "info" as const
                    }
                  : {
                      title: "Invitation ready",
                      description: "Your Google account matches this invitation and it can be accepted now.",
                      variant: "success" as const
                    };

  return (
    <>
      <section className="flex flex-col justify-center">
        <p className="text-sm uppercase tracking-[0.32em] text-[color:var(--muted)]">Fylerr</p>
        <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-tight">
          Join a business workspace.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[color:var(--muted)]">
          Invitations are matched to the invited Google email and expire exactly 7 days after creation.
        </p>
      </section>

      <section className="space-y-6 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-shell backdrop-blur">
        <InlineAlert title={alert.title} description={alert.description} variant={alert.variant} />

        {preview.invitation ? (
          <div className="grid gap-4 text-sm">
            <div>
              <p className="text-[color:var(--muted)]">Business</p>
              <p className="mt-1 text-lg font-semibold">{preview.invitation.businessName}</p>
            </div>
            <div>
              <p className="text-[color:var(--muted)]">Invited role</p>
              <p className="mt-1 font-medium">{getRoleLabel(preview.invitation.role)}</p>
            </div>
            <div>
              <p className="text-[color:var(--muted)]">Invited email</p>
              <p className="mt-1 font-medium">{preview.invitation.invitedEmail}</p>
            </div>
            <div>
              <p className="text-[color:var(--muted)]">Invited by</p>
              <p className="mt-1 font-medium">
                {preview.invitation.inviterName ?? preview.invitation.inviterEmail}
              </p>
            </div>
            <div>
              <p className="text-[color:var(--muted)]">Expires</p>
              <p className="mt-1 font-medium">{formatDateTime(preview.invitation.expiresAt)}</p>
            </div>
            {preview.viewerEmail ? (
              <div>
                <p className="text-[color:var(--muted)]">Signed in as</p>
                <p className="mt-1 font-medium">{preview.viewerEmail}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {preview.state === "login_required" ? (
          <Link
            className="inline-flex rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            href={getLoginHref(token)}
          >
            Sign in with Google
          </Link>
        ) : null}

        {preview.state === "pending" ? (
          <form action={`/invitations/${token}/accept`} method="post">
            <button
              className="rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              type="submit"
            >
              Accept invitation
            </button>
          </form>
        ) : null}
      </section>
    </>
  );
}
