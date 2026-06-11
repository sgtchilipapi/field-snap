"use client";

import Link from "next/link";
import { useState } from "react";
import { JobList } from "@/components/business/job-list";
import { NewJobForm } from "@/components/business/new-job-form";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import type { CategoryRow } from "@/lib/server/db/schema";
import type { JobWithCategoryRow } from "@/lib/server/data/jobs";

export function JobsWorkspace({
  businessId,
  categories,
  jobs,
  canCreateJob,
  canViewSettings
}: {
  businessId: string;
  categories: CategoryRow[];
  jobs: JobWithCategoryRow[];
  canCreateJob: boolean;
  canViewSettings: boolean;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <div className="space-y-5">
        {canCreateJob || canViewSettings ? (
          <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 -mb-1 flex justify-end gap-3 md:static md:mb-0">
            {canViewSettings ? (
              <Link
                className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-6 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
                href={`/businesses/${businessId}/settings`}
              >
                Setup
              </Link>
            ) : null}
            {canViewSettings ? (
              <Link
                className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-6 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
                href={`/businesses/${businessId}/review`}
              >
                Review
              </Link>
            ) : null}
            <button
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(213,111,62,0.28)] transition hover:bg-[color:var(--accent-strong)] md:min-h-[3.25rem]"
              onClick={() => setIsCreateOpen(true)}
              type="button"
            >
              New job
            </button>
          </div>
        ) : null}

        <JobList businessId={businessId} jobs={jobs} />
      </div>

      {isCreateOpen ? (
        <MobileSheet
          closeLabel="Close new job sheet"
          description="Create the job and Fylerr will build the Drive folder structure automatically."
          onClose={() => setIsCreateOpen(false)}
          title="Create a job"
        >
          <NewJobForm businessId={businessId} categories={categories} variant="sheet" />
        </MobileSheet>
      ) : null}
    </>
  );
}
