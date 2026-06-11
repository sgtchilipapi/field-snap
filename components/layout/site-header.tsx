import Link from "next/link";
import { BusinessMenu } from "@/components/business/business-menu";

export async function SiteHeader() {
  return (
    <header className="flex min-h-[var(--top-bar-height)] items-center justify-between gap-4">
      <Link
        className="text-lg font-semibold tracking-tight text-[color:var(--foreground)] transition hover:text-[color:var(--muted)] md:text-2xl"
        href="/"
      >
        Fylerr
      </Link>
      <BusinessMenu />
    </header>
  );
}
