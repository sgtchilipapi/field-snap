import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className
}: {
  eyebrow: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3", className)}>
      <div className="space-y-1.5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
          {eyebrow}
        </p>
        {title ? (
          <h1 className="text-balance text-2xl font-semibold leading-tight tracking-[-0.03em] text-[color:var(--foreground)] md:text-3xl">
            {title}
          </h1>
        ) : null}
      </div>
      {description ? (
        <p className="max-w-2xl text-pretty text-sm leading-6 text-[color:var(--muted)] md:text-base">
          {description}
        </p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </header>
  );
}
