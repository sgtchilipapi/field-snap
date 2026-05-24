import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { BusinessSwitcher } from "@/components/business/business-switcher";
import { BusinessNav } from "@/components/business/business-nav";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireSession } from "@/lib/server/auth/session";
import { getBusinessDetailsForUser, listBusinessesForUser } from "@/lib/server/services/business-service";

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
    getBusinessDetailsForUser(businessId, session.userId),
    listBusinessesForUser(session.userId)
  ]);

  if (!details) {
    notFound();
  }

  return (
    <AppShell
      header={<BusinessSwitcher businesses={businesses} currentBusinessId={businessId} />}
      nav={
        <div className="space-y-6">
          <BusinessNav businessId={businessId} role={details.membership.role} />
          <div className="pt-2">
            <LogoutButton />
          </div>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
