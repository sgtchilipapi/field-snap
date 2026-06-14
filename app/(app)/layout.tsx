import type { ReactNode } from "react";
import { ForegroundUploadRunner } from "@/components/upload-queue/foreground-upload-runner";
import { requireSession } from "@/lib/server/auth/session";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession();

  return (
    <>
      <ForegroundUploadRunner />
      {children}
    </>
  );
}
