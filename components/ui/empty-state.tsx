export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-[color:var(--muted)]">{description}</p>
    </div>
  );
}

