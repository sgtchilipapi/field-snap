import { redirect } from "next/navigation";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { getSession, normalizeReturnPath } from "@/lib/server/auth/session";
import { getPostLoginRedirectForUser } from "@/lib/server/services/auth-service";

const alertByError = {
  access_denied: {
    title: "Access denied",
    description: "Google sign-in was cancelled or Field-Snap did not receive approved access.",
    variant: "danger" as const
  },
  email_not_verified: {
    title: "Access denied",
    description: "Field-Snap requires a verified Google email address before sign-in can continue.",
    variant: "danger" as const
  },
  callback_failed: {
    title: "Callback failed",
    description: "Field-Snap could not complete the Google callback. Check OAuth configuration and try again.",
    variant: "danger" as const
  },
  unexpected: {
    title: "Unexpected sign-in error",
    description: "An unexpected provider error interrupted sign-in. Try again after confirming the OAuth setup.",
    variant: "danger" as const
  }
};

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();

  if (session) {
    redirect(await getPostLoginRedirectForUser(session.userId));
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const errorParam = resolvedSearchParams.error;
  const errorCode = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const alert = errorCode ? alertByError[errorCode as keyof typeof alertByError] : null;
  const loggedOutParam = resolvedSearchParams.logged_out;
  const wasLoggedOut = Array.isArray(loggedOutParam) ? loggedOutParam[0] === "1" : loggedOutParam === "1";
  const nextParam = resolvedSearchParams.next;
  const nextPath = normalizeReturnPath(Array.isArray(nextParam) ? nextParam[0] : nextParam);
  const loginHref = nextPath ? `/auth/google?next=${encodeURIComponent(nextPath)}` : "/auth/google";

  return (
    <>
      <section className="flex flex-col justify-center">
        <p className="text-sm uppercase tracking-[0.32em] text-[color:var(--muted)]">
          Field-Snap
        </p>
        <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-tight">
          Capture once. File into the right job folder.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[color:var(--muted)]">
          The MVP keeps upload, review, and Drive filing workflows consistent from day one.
        </p>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-shell backdrop-blur">
        <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--muted)]">
          Authentication
        </p>
        <h2 className="mt-3 text-2xl font-semibold">Sign in with Google</h2>
        <p className="mt-4 text-[color:var(--muted)]">
          Field-Snap uses Google identity for team access, invitation matching, and protected
          business workflows.
        </p>
        <div className="mt-8 space-y-4">
          <GoogleLoginButton href={loginHref} />
          {alert ? (
            <InlineAlert
              title={alert.title}
              variant={alert.variant}
              description={alert.description}
            />
          ) : null}
          {wasLoggedOut ? (
            <InlineAlert
              title="Signed out"
              variant="success"
              description="Your Field-Snap session has been cleared."
            />
          ) : null}
          <InlineAlert
            title="Protected routes are live"
            variant="info"
            description="Visit /app while signed out and Field-Snap will redirect back here."
          />
        </div>
      </section>
    </>
  );
}
