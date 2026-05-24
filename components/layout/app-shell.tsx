import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { SiteHeader } from "@/components/layout/site-header";

export function AppShell({
  header,
  nav,
  children
}: {
  header?: ReactNode;
  nav?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageContainer className="py-8">
      <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-shell backdrop-blur md:p-6">
        {header ?? <SiteHeader />}
        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/70 p-5">
            {nav}
          </aside>
          <main className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/80 p-6">
            {children}
          </main>
        </div>
      </div>
    </PageContainer>
  );
}
