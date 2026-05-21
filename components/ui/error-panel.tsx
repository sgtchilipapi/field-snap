"use client";

export function ErrorPanel({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-8 shadow-shell">
      <p className="text-sm uppercase tracking-[0.28em] text-[color:var(--muted)]">Error</p>
      <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
      <p className="mt-4 text-[color:var(--muted)]">{description}</p>
      <button
        className="mt-6 rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
        onClick={onAction}
        type="button"
      >
        {actionLabel}
      </button>
    </div>
  );
}

