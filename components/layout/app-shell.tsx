import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";

export function AppShell({
  topBar,
  children,
  className
}: {
  topBar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen pb-[var(--bottom-nav-offset)] md:pb-0">
      {topBar ? (
        <div className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--surface-strong)]/92 shadow-[0_8px_28px_rgba(18,36,58,0.06)] backdrop-blur-xl">
          <PageContainer size="app" className="py-3">
            {topBar}
          </PageContainer>
        </div>
      ) : null}
      <PageContainer
        size="app"
        className={cn("py-4 md:py-6", className)}
      >
        <main className="mobile-page-grid">{children}</main>
      </PageContainer>
    </div>
  );
}
