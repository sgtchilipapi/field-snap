import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SiteHeader } from "@/components/layout/site-header";
import { requireSession } from "@/lib/server/auth/session";

export default async function AuthenticatedLayout({
  children
}: {
  children: ReactNode;
}) {
  await requireSession();

  return (
    <AppShell topBar={<SiteHeader />}>{children}</AppShell>
  );
}
