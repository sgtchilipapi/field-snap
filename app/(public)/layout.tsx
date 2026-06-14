import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen py-[calc(1rem+env(safe-area-inset-top))] md:grid md:place-items-center md:py-12">
      <PageContainer size="public" className="min-h-[calc(100vh-2rem-env(safe-area-inset-top))] md:min-h-0">
        <div className="grid min-h-[calc(100vh-2rem-env(safe-area-inset-top))] content-center gap-4 md:min-h-0 md:gap-5">
          {children}
        </div>
      </PageContainer>
    </main>
  );
}
