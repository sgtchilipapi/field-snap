import Link from "next/link";
import { BusinessMenu } from "@/components/business/business-menu";
import { requireSession } from "@/lib/server/auth/session";
import { listBusinessesForUser } from "@/lib/server/services/business-service";

export async function SiteHeader() {
  const session = await requireSession();
  const businesses = await listBusinessesForUser(session.userId);

  return (
    <header className="flex min-h-[var(--top-bar-height)] items-center justify-between gap-4">
      <Link
        className="text-lg font-semibold tracking-tight text-[color:var(--foreground)] transition hover:text-[color:var(--muted)] md:text-2xl"
        href="/"
      >
        JobFyl
      </Link>
      <BusinessMenu businesses={businesses} showSettingsLink={false} />
    </header>
  );
}
