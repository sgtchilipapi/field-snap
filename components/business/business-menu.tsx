"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

export function BusinessMenu({
  triggerClassName,
  triggerLabel = "Menu"
}: {
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        aria-controls="business-overflow-sheet"
        aria-expanded={isOpen}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white/90 px-4 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]",
          triggerClassName
        )}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {triggerLabel}
      </button>

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
                  Fylerr
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

            <div className="mt-6 space-y-3">
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
          </aside>
        </div>
      ) : null}
    </>
  );
}
