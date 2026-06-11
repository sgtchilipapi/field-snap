"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InlineAlert } from "@/components/ui/inline-alert";

export type InvitationManagerItem = {
  id: string;
  invited_email: string;
  role: "field_user" | "reviewer";
  effectiveStatus: "pending" | "accepted" | "expired" | "revoked";
  inviter_name: string | null;
  inviter_email: string;
  expires_at: Date | string;
  created_at: Date | string;
  accepted_at: Date | string | null;
};

function formatDateTime(value: Date | string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getRoleLabel(role: InvitationManagerItem["role"]) {
  return role === "field_user" ? "Field user" : "Reviewer";
}

export function InvitationManager({
  businessId,
  invitations
}: {
  businessId: string;
  invitations: InvitationManagerItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/businesses/${businessId}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          invited_email: formData.get("invited_email"),
          role: formData.get("role")
        })
      });

      const payload = (await response.json()) as { error?: string; invite_url?: string };

      if (!response.ok) {
        setError(payload.error ?? "Fylerr could not create the invitation.");
        return;
      }

      setInviteUrl(payload.invite_url ?? null);
      router.refresh();
    } catch {
      setError("Fylerr could not create the invitation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyInviteUrl() {
    if (!inviteUrl) {
      return;
    }

    setIsCopying(true);

    try {
      await navigator.clipboard.writeText(inviteUrl);
    } finally {
      setTimeout(() => setIsCopying(false), 1200);
    }
  }

  return (
    <section className="space-y-6 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
      <div>
        <h2 className="text-xl font-semibold">Invitations</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Invite field users and reviewers with a copyable Google-sign-in link that expires in 7 days.
        </p>
      </div>

      <form
        action={handleSubmit}
        className="grid gap-4 rounded-[1.25rem] border border-[color:var(--border)] bg-white p-4 md:grid-cols-[minmax(0,1fr)_13rem_auto]"
      >
        <label className="space-y-2 text-sm font-medium">
          <span>Invite email</span>
          <input
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            name="invited_email"
            placeholder="crew@example.com"
            required
            type="email"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>Role</span>
          <select
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            defaultValue="field_user"
            name="role"
          >
            <option value="field_user">Field user</option>
            <option value="reviewer">Reviewer</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            className="w-full rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating..." : "Create invite"}
          </button>
        </div>
      </form>

      {error ? (
        <InlineAlert title="Invitation failed" description={error} variant="danger" />
      ) : null}

      {inviteUrl ? (
        <div className="space-y-3 rounded-[1.25rem] border border-[color:var(--border)] bg-white p-4">
          <InlineAlert
            title="Invite ready"
            description="Copy this link now. Fylerr stores only the token hash, so the raw URL is shown when the invite is created."
            variant="success"
          />
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm break-all">
            {inviteUrl}
          </div>
          <button
            className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
            onClick={copyInviteUrl}
            type="button"
          >
            {isCopying ? "Copied" : "Copy invite URL"}
          </button>
        </div>
      ) : null}

      <div className="space-y-4">
        {invitations.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">
            No invitations have been created for this business yet.
          </p>
        ) : (
          invitations.map((invitation) => (
            <div key={invitation.id} className="rounded-[1.25rem] border border-[color:var(--border)] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{invitation.invited_email}</p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{getRoleLabel(invitation.role)}</p>
                </div>
                <p className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  {invitation.effectiveStatus}
                </p>
              </div>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-[color:var(--muted)]">Invited by</dt>
                  <dd className="mt-1 font-medium">
                    {invitation.inviter_name ?? invitation.inviter_email}
                  </dd>
                </div>
                <div>
                  <dt className="text-[color:var(--muted)]">Created</dt>
                  <dd className="mt-1 font-medium">{formatDateTime(invitation.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--muted)]">Expires</dt>
                  <dd className="mt-1 font-medium">{formatDateTime(invitation.expires_at)}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--muted)]">Accepted</dt>
                  <dd className="mt-1 font-medium">{formatDateTime(invitation.accepted_at)}</dd>
                </div>
              </dl>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
