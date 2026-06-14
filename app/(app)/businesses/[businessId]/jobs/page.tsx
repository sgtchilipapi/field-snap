import { JobsWorkspace } from "@/components/business/jobs-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { redirect } from "next/navigation";
import { requireBusinessPageAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import { getCategoriesForBusiness } from "@/lib/server/data/categories";
import { listJobsForUser } from "@/lib/server/services/job-service";

export default async function BusinessJobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{
    status?: "active" | "completed" | "archived" | "all";
    category?: string;
    search?: string;
  }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  const { status, category, search } = await searchParams;
  const selectedStatus =
    status && ["active", "completed", "archived", "all"].includes(status)
      ? status
      : "active";
  const selectedCategoryId =
    typeof category === "string" && category.trim().length > 0 ? category : "";
  const searchQuery = typeof search === "string" ? search.trim() : "";
  const [details, categories, jobsResult] = await Promise.all([
    requireBusinessPageAccess({
      businessId,
      userId: session.userId,
      capability: "jobs:view",
    }),
    getCategoriesForBusiness(businessId),
    listJobsForUser({
      businessId,
      userId: session.userId,
      status: selectedStatus,
      categoryId: selectedCategoryId || null,
      search: searchQuery || null,
    }),
  ]);

  if (!jobsResult) {
    redirect("/forbidden");
  }

  return (
    <div className="space-y-3">
      <PageHeader eyebrow="Jobs for" title={details.business.name} />
      <JobsWorkspace
        businessId={businessId}
        canCreateJob={details.membership.role === "owner_admin"}
        canViewSettings={
          details.membership.role === "owner_admin" ||
          details.membership.role === "reviewer"
        }
        initialDriveConnected={details.business.drive_root_folder_id !== null}
        categories={categories}
        jobs={jobsResult.jobs}
      />
      {jobsResult.jobs.length === 0 ? (
        <EmptyState
          title={
            searchQuery || selectedCategoryId || selectedStatus !== "active"
              ? "No jobs match this filter"
              : "No jobs yet"
          }
          description={
            searchQuery || selectedCategoryId || selectedStatus !== "active"
              ? "Adjust the status, category, or search text to widen the list."
              : "Create the first job to start the Drive folder structure for this business."
          }
        />
      ) : null}
    </div>
  );
}
