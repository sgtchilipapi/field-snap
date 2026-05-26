import Link from "next/link";
import type { BusinessMembershipRow } from "@/lib/server/db/schema";

function NavLink({
  href,
  label
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      className="block rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
      href={href}
    >
      {label}
    </Link>
  );
}

export function BusinessNav({
  businessId,
  role
}: {
  businessId: string;
  role: BusinessMembershipRow["role"];
}) {
  return (
    <div className="space-y-3 text-sm text-[color:var(--muted)]">
      <p className="font-medium text-[color:var(--foreground)]">Role: {role}</p>
      <NavLink href={`/businesses/${businessId}/jobs`} label="Jobs" />
      {role !== "field_user" ? (
        <NavLink href={`/businesses/${businessId}/upload-general`} label="General upload" />
      ) : null}
      {role !== "field_user" ? (
        <NavLink href="/businesses" label="Businesses" />
      ) : null}
      {role === "owner_admin" ? (
        <NavLink href={`/businesses/${businessId}/settings`} label="Settings" />
      ) : null}
    </div>
  );
}
