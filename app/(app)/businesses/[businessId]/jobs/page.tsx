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
  searchParams: Promise<{ status?: "active" | "archived" | "all" }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  const { status } = await searchParams;
  const selectedStatus = status && ["active", "archived", "all"].includes(status) ? status : "active";
  const [details, categories, jobsResult] = await Promise.all([
    getBusinessDetailsForUser(businessId, session.userId),
    getCategoriesForBusiness(businessId),
    listJobsForUser({
      businessId,
      userId: session.userId,
      status: selectedStatus
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
      {jobsResult.jobs.length === 0 ? (
        <EmptyState
          title={selectedStatus === "archived" ? "No archived jobs" : "No jobs yet"}
          description={
            selectedStatus === "archived"
              ? "Archived jobs will stay in Drive and appear here when you filter for them."
              : "Create the first job to build the category-specific Drive folder tree for this business."
          }
        />
      ) : (
        <JobList businessId={businessId} currentStatus={selectedStatus} jobs={jobsResult.jobs} />
      )}
    </div>
  );
}
