import { InlineAlert } from "@/components/ui/inline-alert";

export default function LoginPage() {
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
        <h2 className="mt-3 text-2xl font-semibold">Google sign-in arrives in WO-02</h2>
        <p className="mt-4 text-[color:var(--muted)]">
          This scaffold already protects authenticated routes. The actual OAuth flow is the next
          work order.
        </p>
        <div className="mt-8 space-y-4">
          <button
            className="inline-flex w-full items-center justify-center rounded-full bg-[color:var(--foreground)] px-5 py-3 font-semibold text-white opacity-60"
            disabled
            type="button"
          >
            Continue with Google
          </button>
          <InlineAlert
            title="Protected routes are live"
            variant="info"
            description="Visit /app while signed out and the base auth guard will redirect back here."
          />
        </div>
      </section>
    </>
  );
}

