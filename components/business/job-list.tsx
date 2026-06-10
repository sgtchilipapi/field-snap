import Link from "next/link";
import type { JobWithCategoryRow } from "@/lib/server/data/jobs";

export function JobList({
  businessId,
  jobs
}: {
  businessId: string;
  jobs: JobWithCategoryRow[];
}) {
  return (
    <div className="space-y-5">
      {/* <div className="space-y-3">
        <details className="surface-card overflow-hidden p-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
            <div>
              <p className="text-sm font-semibold">Search</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {hasSearch ? searchQuery : "Search by client, job name, or address."}
              </p>
            </div>
            <span className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
              {hasSearch ? "Active" : "Open"}
            </span>
          </summary>
          <form
            action={`/businesses/${businessId}/jobs`}
            className="space-y-4 border-t border-[color:var(--border)] px-5 py-4"
            method="get"
          >
            <input name="status" type="hidden" value={currentStatus} />
            <input name="category" type="hidden" value={selectedCategoryId} />
            <label className="space-y-2">
              <span className="text-sm font-medium text-[color:var(--foreground)]">Search jobs</span>
              <input
                className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--foreground)]"
                defaultValue={searchQuery}
                name="search"
                placeholder="Client, job name, or address"
                type="search"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="w-full rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition sm:w-auto"
                type="submit"
              >
                Apply search
              </button>
              <Link
                className="inline-flex w-full items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)] sm:w-auto"
                href={buildJobsHref({
                  businessId,
                  status: currentStatus,
                  categoryId: selectedCategoryId,
                  searchQuery: ""
                })}
              >
                Clear search
              </Link>
            </div>
          </form>
        </details>

        <details className="surface-card overflow-hidden p-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
            <div>
              <p className="text-sm font-semibold">Filters</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {hasFilters
                  ? `${statusLabel} jobs${selectedCategoryName ? ` in ${selectedCategoryName}` : ""}`
                  : "Active jobs across all categories."}
              </p>
            </div>
            <span className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
              {hasFilters ? "Active" : "Open"}
            </span>
          </summary>
          <form
            action={`/businesses/${businessId}/jobs`}
            className="space-y-4 border-t border-[color:var(--border)] px-5 py-4"
            method="get"
          >
            <input name="search" type="hidden" value={searchQuery} />
            <div className="space-y-2">
              <span className="text-sm font-medium text-[color:var(--foreground)]">Status</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "active", label: "Active" },
                  { key: "archived", label: "Archived" },
                  { key: "all", label: "All" }
                ].map((filter) => (
                  <label
                    className={cn(
                      "cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition",
                      currentStatus === filter.key
                        ? "border-[color:var(--foreground)] bg-[color:var(--foreground)] text-white"
                        : "border-[color:var(--border)] bg-white text-[color:var(--foreground)]"
                    )}
                    key={filter.key}
                  >
                    <input
                      className="sr-only"
                      defaultChecked={currentStatus === filter.key}
                      name="status"
                      type="radio"
                      value={filter.key}
                    />
                    {filter.label}
                  </label>
                ))}
              </div>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[color:var(--foreground)]">Category</span>
              <select
                className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--foreground)]"
                defaultValue={selectedCategoryId}
                name="category"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="w-full rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition sm:w-auto"
                type="submit"
              >
                Apply filters
              </button>
              <Link
                className="inline-flex w-full items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)] sm:w-auto"
                href={buildJobsHref({
                  businessId,
                  status: "active",
                  categoryId: "",
                  searchQuery
                })}
              >
                Reset filters
              </Link>
            </div>
          </form>
        </details>
      </div> */}

      <div className="grid gap-4">
        {jobs.map((job) => (
          <Link
            key={job.id}
            className="surface-card p-5 transition hover:border-[color:var(--foreground)]"
            href={`/businesses/${businessId}/jobs/${job.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {job.client_name} - {job.job_name}
                  </h2>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                      job.status === "archived"
                        ? "bg-slate-200 text-slate-800"
                        : job.status === "completed"
                          ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-800"
                    )}
                  >
                    {job.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  {job.category_name} · {job.job_date}
                </p>
                {job.address ? (
                  <p className="mt-2 text-sm text-[color:var(--muted)]">{job.address}</p>
                ) : null}
              </div>
              <span className="text-sm font-medium text-[color:var(--foreground)]">Open</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
