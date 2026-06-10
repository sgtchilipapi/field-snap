"use client";

import Link from "next/link";
import { BusinessMenu } from "@/components/business/business-menu";

export function BusinessTopBar({
}: Record<string, never>) {
  return (
    <div className="flex min-h-[var(--top-bar-height)] items-center justify-between gap-3">
      <Link
        className="text-lg font-semibold tracking-tight text-[color:var(--foreground)] transition hover:text-[color:var(--muted)] md:text-2xl"
        href="/"
      >
        JobFyl
      </Link>
      <BusinessMenu />
    </div>
  );
}
