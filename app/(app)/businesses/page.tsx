import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/server/auth/session";
import Link from "next/link";
import {
  getBusinessLandingPath,
  listBusinessesForUser
} from "@/lib/server/services/business-service";

export default async function BusinessesPage() {
  const session = await requireSession();
  const businesses = await listBusinessesForUser(session.userId);

  if (businesses.length === 0) {
    redirect("/businesses/new");
  }

  if (businesses.length === 1) {
    redirect(getBusinessLandingPath(businesses[0]));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Businesses"
        title="Choose a business"
        description=""
      />
      <div className="grid gap-4">
        {businesses.map((business) => (
          <div
            className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
            key={business.id}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{business.name}</h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Role: {business.role} | Status: {business.status}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Drive: {business.driveConnected ? "Connected" : "Not connected"}
                </p>
              </div>
              <Link
                className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
                href={getBusinessLandingPath(business)}
              >
                Open business
              </Link>
            </div>
          </div>
        ))}
      </div>
      <Link
        className="inline-flex rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
        href="/businesses/new"
      >
        Create another business
      </Link>
    </div>
  );
}
