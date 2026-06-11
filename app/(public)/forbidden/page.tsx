import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <>
      <section className="space-y-6 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Access denied
        </p>
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--foreground)]">
            You do not have permission to open this Fylerr view.
          </h1>
          <p className="max-w-xl text-base leading-7 text-[color:var(--muted)]">
            Your current business membership does not allow this page or action. Use a permitted
            route instead or ask an owner-admin to adjust your role.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            href="/businesses"
          >
            Back to businesses
          </Link>
          <Link
            className="rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
            href="/login"
          >
            Sign in again
          </Link>
        </div>
      </section>
      <section className="rounded-[2rem] border border-dashed border-[color:var(--border)] bg-white/70 p-8">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">MVP role summary</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--muted)]">
          <li>`owner_admin`: full business setup, Drive, jobs, review, and invitations.</li>
          <li>`reviewer`: jobs, general upload, review, and document audit detail.</li>
          <li>`field_user`: jobs and job uploads only.</li>
        </ul>
      </section>
    </>
  );
}
