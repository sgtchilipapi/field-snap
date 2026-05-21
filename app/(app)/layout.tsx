import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/server/auth/session";

export default async function AuthenticatedLayout({
  children
}: {
  children: ReactNode;
}) {
  await requireSession();

  return (
    <AppShell
      nav={
        <div className="space-y-3 text-sm text-[color:var(--muted)]">
          <p className="font-medium text-[color:var(--foreground)]">Authenticated shell</p>
          <p>Business-scoped navigation lands in later work orders.</p>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}

