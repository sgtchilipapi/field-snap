export function SiteHeader() {
  return (
    <header className="flex flex-col gap-3 border-b border-[color:var(--border)] pb-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]">Field-Snap</p>
        <h1 className="mt-2 text-2xl font-semibold">Authenticated app shell</h1>
      </div>
      <p className="max-w-xl text-sm text-[color:var(--muted)]">
        Shared layout primitives live here so later work orders focus on business behavior instead
        of rebuilding app chrome.
      </p>
    </header>
  );
}

