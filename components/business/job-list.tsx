import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "@/lib/server/db/schema";
import type { JobWithCategoryRow } from "@/lib/server/data/jobs";

function buildJobsHref(input: {
  businessId: string;
  status: "active" | "archived" | "all";
  categoryId: string;
  searchQuery: string;
}) {
  const params = new URLSearchParams();
  params.set("status", input.status);

  if (input.categoryId) {
    params.set("category", input.categoryId);
  }

  if (input.searchQuery) {
    params.set("search", input.searchQuery);
  }

  return `/businesses/${input.businessId}/jobs?${params.toString()}`;
}

export function JobList({
  businessId,
  categories,
  jobs,
  currentStatus,
  searchQuery,
  selectedCategoryId
}: {
  businessId: string;
  categories: CategoryRow[];
  jobs: JobWithCategoryRow[];
  currentStatus: "active" | "archived" | "all";
  searchQuery: string;
  selectedCategoryId: string;
}) {
  return (
    <div className="space-y-5">
      <form
        action={`/businesses/${businessId}/jobs`}
        className="grid gap-3 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 md:grid-cols-[minmax(0,1fr)_16rem_auto_auto]"
        method="get"
      >
        <input name="status" type="hidden" value={currentStatus} />
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
        <button
          className="self-end rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition"
          type="submit"
        >
          Apply filters
        </button>
        <Link
          className="self-end rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
          href={`/businesses/${businessId}/jobs`}
        >
          Reset
        </Link>
      </form>
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
            href={buildJobsHref({
              businessId,
              status: filter.key as "active" | "archived" | "all",
              categoryId: selectedCategoryId,
              searchQuery
            })}
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
              <div className="flex flex-wrap gap-2">
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
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
