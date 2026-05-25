import Link from "next/link";
import { cn } from "@/lib/utils";
import type { JobWithCategoryRow } from "@/lib/server/data/jobs";

export function JobList({
  businessId,
  jobs,
  currentStatus
}: {
  businessId: string;
  jobs: JobWithCategoryRow[];
  currentStatus: "active" | "archived" | "all";
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          { key: "active", label: "Active" },
          { key: "archived", label: "Archived" },
          { key: "all", label: "All" }
        ].map((filter) => (
          <Link
            key={filter.key}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition",
              currentStatus === filter.key
                ? "border-[color:var(--foreground)] bg-[color:var(--foreground)] text-white"
                : "border-[color:var(--border)] bg-white text-[color:var(--foreground)] hover:border-[color:var(--foreground)]"
            )}
            href={`/businesses/${businessId}/jobs?status=${filter.key}`}
          >
            {filter.label}
          </Link>
        ))}
      </div>
      <div className="grid gap-4">
        {jobs.map((job) => (
          <Link
            key={job.id}
            className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 transition hover:border-[color:var(--foreground)]"
            href={`/businesses/${businessId}/jobs/${job.id}`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {job.client_name} - {job.job_name}
                </h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  {job.category_name} · {job.job_date}
                </p>
                {job.address ? (
                  <p className="mt-2 text-sm text-[color:var(--muted)]">{job.address}</p>
                ) : null}
              </div>
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                  job.status === "archived"
                    ? "bg-slate-200 text-slate-800"
                    : "bg-emerald-100 text-emerald-800"
                )}
              >
                {job.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
