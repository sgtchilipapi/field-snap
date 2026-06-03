import type { ReactNode } from "react";
import { requireSession } from "@/lib/server/auth/session";

export default async function AuthenticatedLayout({
  children
}: {
  children: ReactNode;
}) {
  await requireSession();

  return children;
}
