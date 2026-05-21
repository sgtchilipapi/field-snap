import { cn } from "@/lib/utils";

const variantStyles = {
  info: "border-[color:var(--border)] bg-white text-[color:var(--foreground)]",
  success: "border-transparent bg-[color:var(--success)]/12 text-[color:var(--foreground)]",
  danger: "border-transparent bg-[color:var(--danger)]/12 text-[color:var(--foreground)]"
} as const;

export function InlineAlert({
  title,
  description,
  variant = "info"
}: {
  title: string;
  description: string;
  variant?: keyof typeof variantStyles;
}) {
  return (
    <div className={cn("rounded-2xl border p-4", variantStyles[variant])}>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p>
    </div>
  );
}

