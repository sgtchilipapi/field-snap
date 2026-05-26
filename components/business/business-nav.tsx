import {
  hasBusinessCapability,
  type BusinessCapability
} from "@/lib/server/auth/business-authorization";
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
  const membership = {
    role,
    status: "active" as const
  };
  const links: Array<{ href: string; label: string; capability: BusinessCapability }> = [
    {
      href: `/businesses/${businessId}/jobs`,
      label: "Jobs",
      capability: "jobs:view"
    },
    {
      href: `/businesses/${businessId}/upload-general`,
      label: "General upload",
      capability: "documents:upload_general"
    },
    {
      href: `/businesses/${businessId}/review`,
      label: "Review",
      capability: "review:access"
    },
    {
      href: `/businesses/${businessId}/settings`,
      label: "Settings",
      capability: "settings:view"
    }
  ];

  return (
    <div className="space-y-3 text-sm text-[color:var(--muted)]">
      <p className="font-medium text-[color:var(--foreground)]">Role: {role}</p>
      {links
        .filter((link) => hasBusinessCapability(membership, link.capability))
        .map((link) => (
          <NavLink key={link.href} href={link.href} label={link.label} />
        ))}
      <NavLink href="/businesses" label="Businesses" />
    </div>
  );
}
