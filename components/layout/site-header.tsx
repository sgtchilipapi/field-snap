import { LogoutButton } from "@/components/auth/logout-button";

export function SiteHeader() {
  return (
    <header className="flex min-h-[var(--top-bar-height)] items-center justify-between gap-4">
      <div>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
          Field-Snap
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight md:text-2xl">Workspace</h1>
      </div>
      <LogoutButton />
    </header>
  );
}
