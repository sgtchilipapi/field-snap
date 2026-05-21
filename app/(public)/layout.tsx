import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <PageContainer className="flex min-h-screen items-center py-12">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">{children}</div>
    </PageContainer>
  );
}

