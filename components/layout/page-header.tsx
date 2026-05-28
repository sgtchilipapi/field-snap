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
    <header className="space-y-2">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
        {eyebrow}
      </p>
      <h1 className="text-[1.75rem] font-semibold tracking-tight md:text-[2.2rem]">{title}</h1>
      {description ? (
        <p className="max-w-3xl text-sm leading-6 text-[color:var(--muted)] md:text-[0.98rem]">
          {description}
        </p>
      ) : null}
    </header>
  );
}
