"use client";

import Link from "next/link";
import { BusinessMenu } from "@/components/business/business-menu";
import type { BusinessListItem } from "@/lib/server/data/businesses";
import type { BusinessMembershipRow } from "@/lib/server/db/schema";

export function BusinessTopBar({
  businesses,
  currentBusinessId,
  role
}: {
  businesses: BusinessListItem[];
  currentBusinessId: string;
  role: BusinessMembershipRow["role"];
}) {
  return (
    <div className="flex min-h-[var(--top-bar-height)] items-center justify-between gap-3">
      <Link
        className="text-lg font-semibold tracking-tight text-[color:var(--foreground)] transition hover:text-[color:var(--muted)] md:text-2xl"
        href="/"
      >
        JobFyl
      </Link>
      <BusinessMenu
        businesses={businesses}
        currentBusinessId={currentBusinessId}
        role={role}
      />
    </div>
  );
}
