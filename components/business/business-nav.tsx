"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BusinessMembershipRow } from "@/lib/server/db/schema";

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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-[color:var(--surface-strong)]/96 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_rgba(18,36,58,0.12)] backdrop-blur md:sticky md:top-4 md:mx-auto md:mb-6 md:max-w-3xl md:rounded-[1.5rem] md:border md:px-3 md:pb-3 md:shadow-[var(--shadow-shell)]"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.label === "Jobs" && pathname.startsWith(`${link.href}/`)) ||
            (link.label === "Review" && pathname.includes("/review")) ||
            (link.label === "Upload" && pathname.endsWith("/upload-general"));

          return (
            <Link
              className={`flex min-h-[3.25rem] items-center justify-center rounded-[1rem] px-4 text-sm font-semibold transition ${
                isActive
                  ? "bg-[color:var(--foreground)] text-white"
                  : "bg-[color:var(--surface-muted)] text-[color:var(--foreground)] hover:bg-white"
              }`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
