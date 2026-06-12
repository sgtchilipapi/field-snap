import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { BusinessTopBar } from "@/components/business/business-top-bar";
import { requireBusinessPageAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { recordBusinessOpenedForUser } from "@/lib/server/services/business-service";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  await requireBusinessPageAccess({
    businessId,
    userId: session.userId,
    capability: "business:view",
  });
  await recordBusinessOpenedForUser({
    businessId,
    userId: session.userId,
  });

  return <AppShell topBar={<BusinessTopBar />}>{children}</AppShell>;
}
