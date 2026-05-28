import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  hint,
  error,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[color:var(--foreground)]">{label}</span>
      {children}
      {hint ? <span className="block text-sm text-[color:var(--muted)]">{hint}</span> : null}
      {error ? <span className={cn("block text-sm text-[color:var(--danger)]")}>{error}</span> : null}
    </label>
  );
}
