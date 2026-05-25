import { z } from "zod";
import type {
  AIClassificationResult,
  AllowedTargetFolder,
  DocumentCaptureContext
} from "@/lib/server/integrations/ai/types";

const DOCUMENT_TYPES = [
  "receipt",
  "vendor_bill",
  "customer_invoice",
  "job_photo",
  "contract",
  "permit",
  "change_order",
  "equipment",
  "insurance",
  "license",
  "tax_document",
  "payroll_document",
  "bank_credit_card_document",
  "loan_financing_document",
  "legal_document",
  "other"
] as const;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const providerResponseSchema = z
  .object({
    document_type: z.enum(DOCUMENT_TYPES),
    target_folder_key: z.string().min(1),
    suggested_filename: z.string().trim().min(1).max(255).nullable(),
    vendor_or_party: z.string().trim().min(1).max(255).nullable(),
    document_date: isoDateSchema.nullable(),
    amount: z.number().finite().nullable(),
    currency: z.string().trim().min(1).max(8).nullable(),
    invoice_number: z.string().trim().min(1).max(120).nullable(),
    due_date: isoDateSchema.nullable(),
    confidence: z.number().finite(),
    needs_review: z.boolean(),
    reason: z.string().trim().min(1).max(500)
  })
  .strict();

function clampConfidence(value: number) {
  return Math.min(1, Math.max(0, value));
}

function buildFallbackResult(input: {
  rawProviderPayload: unknown;
  reason: string;
  documentType?: string | null;
  confidence?: number | null;
}): AIClassificationResult {
  return {
    document_type: input.documentType && DOCUMENT_TYPES.includes(input.documentType as never)
      ? input.documentType
      : "other",
    target_folder_key: "needs_review",
    suggested_filename: null,
    vendor_or_party: null,
    document_date: null,
    amount: null,
    currency: null,
    invoice_number: null,
    due_date: null,
    confidence: clampConfidence(input.confidence ?? 0),
    needs_review: true,
    reason: input.reason,
    raw_provider_payload: input.rawProviderPayload,
    valid: false
  };
}

export function parseProviderJsonPayload(rawText: string) {
  const trimmed = rawText.trim();
  const withoutFence = trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");

  return JSON.parse(withoutFence) as unknown;
}

export function normalizeAIClassificationResult(input: {
  rawProviderPayload: unknown;
  allowedTargetFolders: AllowedTargetFolder[];
  captureContext: DocumentCaptureContext;
}) {
  const parsed = providerResponseSchema.safeParse(input.rawProviderPayload);

  if (!parsed.success) {
    return buildFallbackResult({
      rawProviderPayload: input.rawProviderPayload,
      reason: "AI output was invalid and requires review."
    });
  }

  const allowedFolderKeys = new Set(input.allowedTargetFolders.map((folder) => folder.key));

  if (!allowedFolderKeys.has(parsed.data.target_folder_key)) {
    return buildFallbackResult({
      rawProviderPayload: input.rawProviderPayload,
      reason: `AI selected an unsupported folder for ${input.captureContext} capture context and requires review.`,
      documentType: parsed.data.document_type,
      confidence: parsed.data.confidence
    });
  }

  return {
    document_type: parsed.data.document_type,
    target_folder_key: parsed.data.target_folder_key,
    suggested_filename: parsed.data.suggested_filename,
    vendor_or_party: parsed.data.vendor_or_party,
    document_date: parsed.data.document_date,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    invoice_number: parsed.data.invoice_number,
    due_date: parsed.data.due_date,
    confidence: clampConfidence(parsed.data.confidence),
    needs_review: parsed.data.needs_review,
    reason: parsed.data.reason,
    raw_provider_payload: input.rawProviderPayload,
    valid: true
  } satisfies AIClassificationResult;
}
