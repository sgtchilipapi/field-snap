import type { AIProviderClassificationInput } from "@/lib/server/integrations/ai/types";

export function buildDocumentClassificationPrompt(input: AIProviderClassificationInput) {
  const context = {
    business_name: input.businessName,
    capture_context: input.captureContext,
    job: input.job
      ? {
          client_name: input.job.clientName,
          job_name: input.job.jobName,
          category: input.job.category
        }
      : null,
    allowed_folders: input.allowedTargetFolders.map((folder) => ({
      key: folder.key,
      name: folder.name
    }))
  };

  return [
    "Classify this single field-service business document image for Field-Snap.",
    "Return strict JSON only. Do not wrap the JSON in markdown fences.",
    "Use only the allowed target folders provided in the context.",
    "Do not assign accounting categories, payment status, or any bookkeeping treatment beyond the requested fields.",
    "If the document is ambiguous, set needs_review to true and explain why briefly.",
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
        confidence: 0.93,
        needs_review: false,
        reason:
          "Image appears to be a retail purchase receipt with vendor, date, and total amount visible."
      },
      null,
      2
    )
  ].join("\n");
}
