import { redirect } from "next/navigation";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { getSession, normalizeReturnPath } from "@/lib/server/auth/session";
import { getPostLoginRedirectForUser } from "@/lib/server/services/auth-service";

const alertByError = {
  access_denied: {
    title: "Access denied",
    description: "Google sign-in was cancelled or Fylerr did not receive approved access.",
    variant: "danger" as const
  },
  email_not_verified: {
    title: "Access denied",
    description: "Fylerr requires a verified Google email address before sign-in can continue.",
    variant: "danger" as const
  },
  callback_failed: {
    title: "Callback failed",
    description: "Fylerr could not complete the Google callback. Check OAuth configuration and try again.",
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
          Fylerr
        </p>
        <h1 className="mt-4 max-w-xl text-4xl italic font-semibold tracking-tight">
          Don't waste your precious time on paperworks.
        </h1>
        <p className="mt-3 text-1xl font-semibold text-[color:var(--muted)]">
          Fylerr does the documentation for you so you can focus on value-producing work.
        </p>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-shell backdrop-blur">
        <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--muted)]">
          Authentication
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
          {/* {wasLoggedOut ? (
            <InlineAlert
              title="Signed out"
              variant="success"
              description="Your Fylerr session has been cleared."
            />
          ) : null} */}
        </div>
      </section>
    </>
  );
}
