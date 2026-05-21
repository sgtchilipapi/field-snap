import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";

export default function NotFound() {
  return (
    <PageContainer className="py-24">
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-10 shadow-shell">
        <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--muted)]">Not found</p>
        <h1 className="mt-3 text-3xl font-semibold">That page does not exist.</h1>
        <p className="mt-4 max-w-2xl text-[color:var(--muted)]">
          Return to the public entry point and continue from there.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
          href="/"
        >
          Go home
        </Link>
      </div>
    </PageContainer>
  );
}

