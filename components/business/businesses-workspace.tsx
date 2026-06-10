"use client";

import { useState } from "react";
import { BusinessList } from "@/components/business/business-list";
import { NewBusinessForm } from "@/components/business/new-business-form";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import type { BusinessListItem } from "@/lib/server/data/businesses";

export function BusinessesWorkspace({
  businesses
}: {
  businesses: BusinessListItem[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <div className="space-y-5">
        <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 -mb-1 flex justify-end md:static md:mb-0">
          <button
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(213,111,62,0.28)] transition hover:bg-[color:var(--accent-strong)] md:min-h-[3.25rem]"
            onClick={() => setIsCreateOpen(true)}
            type="button"
          >
            New business
          </button>
        </div>

        <BusinessList businesses={businesses} />
      </div>

      {isCreateOpen ? (
        <MobileSheet
          closeLabel="Close new business sheet"
          description="Create another business workspace and continue setup from its Drive connection."
          onClose={() => setIsCreateOpen(false)}
          title="Create a business"
        >
          <NewBusinessForm variant="sheet" />
        </MobileSheet>
      ) : null}
    </>
  );
}
