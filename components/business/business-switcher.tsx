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
  currentBusinessId,
  onNavigate
}: {
  businesses: BusinessListItem[];
  currentBusinessId: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
          Switch business
        </p>
        <h3 className="mt-2 text-base font-semibold">Current route follows the selected business</h3>
      </div>
      <div className="grid gap-2">
        {businesses.map((business) => {
          const isCurrent = business.id === currentBusinessId;

          return (
            <Link
              className={`flex items-center justify-between rounded-[1rem] border px-4 py-3 text-sm font-medium transition ${
                isCurrent
                  ? "border-[color:var(--foreground)] bg-[color:var(--foreground)] text-white"
                  : "border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--foreground)] hover:border-[color:var(--foreground)]"
              }`}
              href={getSwitchHref(pathname, business.id)}
              key={business.id}
              onClick={onNavigate}
            >
              <span className="truncate">{business.name}</span>
              <span className={isCurrent ? "text-white/80" : "text-[color:var(--muted)]"}>
                {isCurrent ? "Current" : "Open"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
