export function LoadingState({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-8 py-10 text-center shadow-shell">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--border)] border-t-[color:var(--accent)]" />
        <h2 className="mt-5 text-xl font-semibold">{title}</h2>
        {description ? <p className="mt-2 text-[color:var(--muted)]">{description}</p> : null}
      </div>
    </div>
  );
}

