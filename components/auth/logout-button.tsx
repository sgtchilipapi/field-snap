import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action="/auth/logout" method="post">
      <button
        className={cn(
          "inline-flex items-center rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]",
          className
        )}
        type="submit"
      >
        Log out
      </button>
    </form>
  );
}
