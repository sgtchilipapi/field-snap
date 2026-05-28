import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";

export function AppShell({
  topBar,
  nav,
  children,
  className
}: {
  topBar?: ReactNode;
  nav?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen">
      {topBar ? (
        <div className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--surface-strong)]/88 backdrop-blur">
          <PageContainer className="py-3">{topBar}</PageContainer>
        </div>
      ) : null}
      {nav ? <PageContainer className="pt-4 md:pt-5">{nav}</PageContainer> : null}
      <PageContainer
        className={cn(
          "pb-[var(--bottom-nav-offset)] pt-5 md:pb-10 md:pt-6",
          className
        )}
      >
        <main className="mobile-page-grid">{children}</main>
      </PageContainer>
    </div>
  );
}
