"use client";

import Link from "next/link";
import type { BusinessListItem } from "@/lib/server/data/businesses";

function getBusinessLandingPath(business: Pick<BusinessListItem, "id" | "driveConnected" | "role">) {
  if (business.role === "owner_admin" && !business.driveConnected) {
    return `/businesses/${business.id}/settings`;
  }

  return `/businesses/${business.id}/jobs`;
}

export function BusinessList({
  businesses
}: {
  businesses: BusinessListItem[];
}) {
  return (
    <div className="grid gap-4">
      {businesses.map((business) => (
        <Link
          key={business.id}
          className="surface-card p-5 transition hover:border-[color:var(--foreground)]"
          href={getBusinessLandingPath(business)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{business.name}</h2>

              </div>
              {/* <p className="mt-2 text-sm text-[color:var(--muted)]">
                {business.role} · {business.status}
              </p> */}
            </div>
                            <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    business.driveConnected
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {business.driveConnected ? "Drive connected" : "Drive setup"}
                </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
