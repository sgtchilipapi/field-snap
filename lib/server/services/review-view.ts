import type { DocumentListItemRow } from "@/lib/server/data/documents";

export type ReviewView = "needs-review" | "recent" | "failed";

export function parseReviewView(value: string | undefined): ReviewView {
  if (value === "recent" || value === "failed") {
    return value;
  }

  return "needs-review";
}

export function getDocumentContextLabel(
  document: Pick<DocumentListItemRow, "capture_context" | "job_client_name" | "job_job_name">
) {
  if (document.capture_context === "job" && document.job_client_name && document.job_job_name) {
    return `${document.job_client_name} - ${document.job_job_name}`;
  }

  return "General Business Docs";
}
