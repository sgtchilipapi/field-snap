import { notFound } from "next/navigation";
import { ReviewDocumentList } from "@/components/business/review-document-list";
import { PageHeader } from "@/components/layout/page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { requireSession } from "@/lib/server/auth/session";
import {
  getReviewAccessForUser,
  listBusinessDocumentsForUser,
  listNeedsReviewDocumentsForUser
} from "@/lib/server/services/review-service";
import { parseReviewView } from "@/lib/server/services/review-view";

export default async function ReviewPage({
  params,
  searchParams
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;
  const { view: rawView } = await searchParams;
  const access = await getReviewAccessForUser(businessId, session.userId);

  if (!access) {
    notFound();
  }

  const view = parseReviewView(rawView);
  const result =
    view === "needs-review"
      ? await listNeedsReviewDocumentsForUser({
          businessId,
          userId: session.userId
        })
      : await listBusinessDocumentsForUser({
          businessId,
          userId: session.userId,
          status: view === "failed" ? "failed" : null
        });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Review"
        title={`${access.business.name} review dashboard`}
        description="Inspect uploads that need review, confirm recent routing decisions, and surface failed AI or Drive processing without leaving the business context."
      />
      <InlineAlert
        title="Review scope"
        description="Field-Snap keeps this view focused on document routing and metadata checks. Bulk actions, rerun AI, and accounting workflows stay out of the MVP."
      />
      <ReviewDocumentList businessId={businessId} currentView={view} documents={result.documents} />
    </div>
  );
}
