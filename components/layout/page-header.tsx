export function PageHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="space-y-3">
      <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]">{eyebrow}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description ? <p className="max-w-3xl text-[color:var(--muted)]">{description}</p> : null}
    </header>
  );
}

