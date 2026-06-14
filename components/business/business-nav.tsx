"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BusinessMembershipRow } from "@/lib/server/db/schema";

const linkIcons: Record<string, string> = {
  Jobs: "▦",
  Review: "✓",
  Upload: "+"
};

export function BusinessNav({
  businessId,
  role
}: {
  businessId: string;
  role: BusinessMembershipRow["role"];
}) {
  const pathname = usePathname();
  const links =
    role === "field_user"
      ? [{ href: `/businesses/${businessId}/jobs`, label: "Jobs" }]
      : [
          { href: `/businesses/${businessId}/jobs`, label: "Jobs" },
          { href: `/businesses/${businessId}/review`, label: "Review" },
          { href: `/businesses/${businessId}/upload-general`, label: "Upload" }
        ];

  return (
    <nav
      aria-label="Business navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-[color:var(--surface-strong)]/96 px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_36px_rgba(18,36,58,0.13)] backdrop-blur-xl md:sticky md:top-[4.75rem] md:mx-auto md:mb-5 md:max-w-3xl md:rounded-[1.35rem] md:border md:p-2 md:shadow-[var(--shadow-soft)]"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-1.5">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.label === "Jobs" && pathname.startsWith(`${link.href}/`)) ||
            (link.label === "Review" && pathname.includes("/review")) ||
            (link.label === "Upload" && pathname.endsWith("/upload-general"));

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[3.15rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] px-3 text-xs font-semibold transition md:min-h-11 md:flex-row md:gap-2 md:text-sm ${
                isActive
                  ? "bg-[color:var(--foreground)] text-white shadow-[0_10px_24px_rgba(18,36,58,0.18)]"
                  : "bg-transparent text-[color:var(--muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--foreground)]"
              }`}
              href={link.href}
              key={link.href}
            >
              <span aria-hidden="true" className="text-base leading-none md:text-sm">
                {linkIcons[link.label]}
              </span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
