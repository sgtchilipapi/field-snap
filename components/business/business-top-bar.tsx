"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { BusinessSwitcher } from "@/components/business/business-switcher";
import type { BusinessListItem } from "@/lib/server/data/businesses";
import type { BusinessMembershipRow } from "@/lib/server/db/schema";

function getSectionLabel(pathname: string) {
  if (pathname.includes("/documents/")) {
    return "Document";
  }

  if (pathname.endsWith("/upload-general")) {
    return "Upload";
  }

  if (pathname.endsWith("/review")) {
    return "Review";
  }

  if (pathname.endsWith("/settings")) {
    return "Settings";
  }

  if (pathname.endsWith("/snap")) {
    return "Snap";
  }

  if (pathname.includes("/jobs/")) {
    return "Job";
  }

  return "Jobs";
}

export function BusinessTopBar({
  businesses,
  currentBusinessId,
  currentBusinessName,
  role
}: {
  businesses: BusinessListItem[];
  currentBusinessId: string;
  currentBusinessName: string;
  role: BusinessMembershipRow["role"];
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const sectionLabel = getSectionLabel(pathname);
  const canViewSettings = role === "owner_admin" || role === "reviewer";

  return (
    <>
      <div className="flex min-h-[var(--top-bar-height)] items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
            {currentBusinessName}
          </p>
          <h1 className="mt-1 truncate text-lg font-semibold tracking-tight md:text-2xl">
            {sectionLabel}
          </h1>
        </div>
        <button
          aria-controls="business-overflow-sheet"
          aria-expanded={isOpen}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white/90 px-4 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          Menu
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-[color:var(--foreground)]/28"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <aside
            className="absolute inset-x-3 top-3 rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5 shadow-[var(--shadow-shell)] md:left-auto md:right-6 md:top-6 md:w-[24rem]"
            id="business-overflow-sheet"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Field-Snap
                </p>
                <h2 className="mt-2 text-lg font-semibold">Business menu</h2>
              </div>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-sm font-medium transition hover:border-[color:var(--foreground)]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <BusinessSwitcher
                businesses={businesses}
                currentBusinessId={currentBusinessId}
                onNavigate={() => setIsOpen(false)}
              />

              <div className="space-y-3">
                {canViewSettings ? (
                  <Link
                    className="flex items-center justify-between rounded-[1rem] border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm font-medium transition hover:border-[color:var(--foreground)]"
                    href={`/businesses/${currentBusinessId}/settings`}
                    onClick={() => setIsOpen(false)}
                  >
                    Settings
                    <span className="text-[color:var(--muted)]">Open</span>
                  </Link>
                ) : null}
                <Link
                  className="flex items-center justify-between rounded-[1rem] border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm font-medium transition hover:border-[color:var(--foreground)]"
                  href="/businesses"
                  onClick={() => setIsOpen(false)}
                >
                  Businesses
                  <span className="text-[color:var(--muted)]">View all</span>
                </Link>
                <LogoutButton className="w-full justify-between rounded-[1rem] px-4 py-3" />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
