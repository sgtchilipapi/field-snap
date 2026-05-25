import { notFound } from "next/navigation";
import { NewJobForm } from "@/components/business/new-job-form";
import { JobList } from "@/components/business/job-list";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/server/auth/session";
import { getBusinessDetailsForUser } from "@/lib/server/services/business-service";
import { getCategoriesForBusiness } from "@/lib/server/data/categories";
import { listJobsForUser } from "@/lib/server/services/job-service";

export default async function BusinessJobsPage({
  params,
  searchParams
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{
    status?: "active" | "archived" | "all";
    category?: string;
    search?: string;
  }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  const { status, category, search } = await searchParams;
  const selectedStatus = status && ["active", "archived", "all"].includes(status) ? status : "active";
  const selectedCategoryId = typeof category === "string" && category.trim().length > 0 ? category : "";
  const searchQuery = typeof search === "string" ? search.trim() : "";
  const [details, categories, jobsResult] = await Promise.all([
    getBusinessDetailsForUser(businessId, session.userId),
    getCategoriesForBusiness(businessId),
    listJobsForUser({
      businessId,
      userId: session.userId,
      status: selectedStatus,
      categoryId: selectedCategoryId || null,
      search: searchQuery || null
    })
  ]);

  if (!details || !jobsResult) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Jobs"
        title={`${details.business.name} jobs`}
        description="Create jobs with a predictable Google Drive folder tree and review active or archived work by business."
      />
      {details.membership.role === "owner_admin" ? (
        <NewJobForm businessId={businessId} categories={categories} />
      ) : null}
      <JobList
        businessId={businessId}
        categories={categories}
        currentStatus={selectedStatus}
        jobs={jobsResult.jobs}
        searchQuery={searchQuery}
        selectedCategoryId={selectedCategoryId}
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
              : "Create the first job to build the category-specific Drive folder tree for this business."
          }
        />
      ) : null}
    </div>
  );
}
