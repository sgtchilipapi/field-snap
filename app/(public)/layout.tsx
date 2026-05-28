import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <PageContainer className="flex min-h-screen items-center py-8 md:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-5 md:gap-6">{children}</div>
    </PageContainer>
  );
}
