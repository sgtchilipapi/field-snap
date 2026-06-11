import type { AIProviderClassificationInput } from "@/lib/server/integrations/ai/types";

export function buildDocumentClassificationPrompt(
  input: AIProviderClassificationInput,
) {
  const context = {
    business_name: input.businessName,
    capture_context: input.captureContext,
    job: input.job
      ? {
          client_name: input.job.clientName,
          job_name: input.job.jobName,
          category: input.job.category,
        }
      : null,
    allowed_folders: input.allowedTargetFolders.map((folder) => ({
      key: folder.key,
      name: folder.name,
    })),
  };

  return [
    "Classify this single field-service business document image for Field-Snap.",
    "Return strict JSON only. Do not wrap the JSON in markdown fences.",
    "Use only the allowed target folders provided in the context.",
    "Do not assign accounting categories, payment status, or any bookkeeping treatment beyond the requested fields.",
    "If the document is ambiguous, set needs_review to true and explain why briefly.",
    "Use needs_review=false only when the image is clear enough to auto-file into a non-review folder with confidence of at least 0.90.",
    "For job capture context, clear non-document worksite, progress, material, equipment, or completed-work photos should normally target job_photos with needs_review=false; do not require visible text or extracted metadata for a clear job photo.",
    "Set metadata fields to null when they are not visible; null metadata alone is not a reason to route a clear job photo to Needs Review.",
    "Routing hints: retail receipts -> receipts; vendor bills asking the business to pay -> vendor_bills; invoices issued to customers -> customer_invoices; worksite or material photos -> job_photos; signed agreements -> contracts; permits -> permits; change orders -> change_orders; equipment-related documents -> equipment.",
    "For general capture context, map insurance, licenses, tax, payroll, bank/credit-card, loans/financing, and contracts/legal documents to the matching allowed folder key.",
    "If no allowed folder clearly fits, use target_folder_key needs_review and set needs_review to true.",
    "Use ISO dates when present. Use null for fields you cannot determine.",
    "Allowed document types: receipt, vendor_bill, customer_invoice, job_photo, contract, permit, change_order, equipment, insurance, license, tax_document, payroll_document, bank_credit_card_document, loan_financing_document, legal_document, other.",
    "",
    "Context:",
    JSON.stringify(context, null, 2),
    "",
    "Return this exact JSON shape:",
    JSON.stringify(
      {
        document_type: "receipt",
        target_folder_key: "receipts",
        suggested_filename: "Home Depot - 182.44 - 2026-05-21.jpg",
        vendor_or_party: "Home Depot",
        document_date: "2026-05-21",
        amount: 182.44,
        currency: "USD",
        invoice_number: null,
        due_date: null,
        confidence: 0.97,
        needs_review: false,
        reason:
          "Image appears to be a retail purchase receipt with vendor, date, and total amount visible.",
      },
      null,
      2,
    ),
  ].join("\n");
}
