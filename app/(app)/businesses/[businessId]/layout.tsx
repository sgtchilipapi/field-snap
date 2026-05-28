import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { BusinessNav } from "@/components/business/business-nav";
import { BusinessTopBar } from "@/components/business/business-top-bar";
import { requireBusinessPageAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { listBusinessesForUser } from "@/lib/server/services/business-service";

export default async function BusinessLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  const [details, businesses] = await Promise.all([
    requireBusinessPageAccess({
      businessId,
      userId: session.userId,
      capability: "business:view"
    }),
    listBusinessesForUser(session.userId)
  ]);

  return (
    <AppShell
      nav={<BusinessNav businessId={businessId} role={details.membership.role} />}
      topBar={
        <BusinessTopBar
          businesses={businesses}
          currentBusinessId={businessId}
          currentBusinessName={details.business.name}
          role={details.membership.role}
        />
      }
    >
      {children}
    </AppShell>
  );
}
