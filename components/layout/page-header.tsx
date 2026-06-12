export function PageHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title?: string;
  description?: string;
}) {
  return (
    <header className="space-y-2">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
        {eyebrow}
      </p>
      <h3 className="text-[1rem] font-semibold tracking-tight md:text-[1.1rem]">{title}</h3>
      {description ? (
        <p className="max-w-3xl text-sm leading-6 text-[color:var(--muted)] md:text-[0.98rem]">
          {description}
        </p>
      ) : null}
    </header>
  );
}
