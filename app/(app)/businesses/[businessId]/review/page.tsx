import { ReviewDocumentList } from "@/components/business/review-document-list";
import { PageHeader } from "@/components/layout/page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { requireBusinessPageAccess } from "@/lib/server/auth/business-authorization";
import { requireSession } from "@/lib/server/auth/session";
import {
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
  const access = await requireBusinessPageAccess({
    businessId,
    userId: session.userId,
    capability: "review:access"
  });

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
        description="Fylerr keeps this view focused on document routing and metadata checks. Bulk actions, rerun AI, and accounting workflows stay out of the MVP."
      />
      <ReviewDocumentList businessId={businessId} currentView={view} documents={result.documents} />
    </div>
  );
}
