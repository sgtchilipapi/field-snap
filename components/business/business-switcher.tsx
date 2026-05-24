"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BusinessListItem } from "@/lib/server/data/businesses";

function getSwitchHref(pathname: string, targetBusinessId: string) {
  const segments = pathname.split("/");

  if (segments[1] === "businesses" && segments[2]) {
    segments[2] = targetBusinessId;
    return segments.join("/");
  }

  return `/businesses/${targetBusinessId}/jobs`;
}

export function BusinessSwitcher({
  businesses,
  currentBusinessId
}: {
  businesses: BusinessListItem[];
  currentBusinessId: string;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]">
          Current business
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Field-Snap business context</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {businesses.map((business) => {
          const isCurrent = business.id === currentBusinessId;

          return (
            <Link
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isCurrent
                  ? "border-[color:var(--foreground)] bg-[color:var(--foreground)] text-white"
                  : "border-[color:var(--border)] bg-white text-[color:var(--foreground)] hover:border-[color:var(--foreground)]"
              }`}
              href={getSwitchHref(pathname, business.id)}
              key={business.id}
            >
              {business.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
