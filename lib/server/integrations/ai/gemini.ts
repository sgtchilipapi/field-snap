import { env } from "@/lib/server/env";
import { buildDocumentClassificationPrompt } from "@/lib/server/integrations/ai/prompt";
import {
  normalizeAIClassificationResult,
  parseProviderJsonPayload,
} from "@/lib/server/integrations/ai/classification";
import type {
  AIProvider,
  AIProviderClassificationInput,
} from "@/lib/server/integrations/ai/types";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const DOCUMENT_CLASSIFICATION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    document_type: {
      type: "string",
      enum: [
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
        "other",
      ],
      description: "The best Field-Snap document type for this image.",
    },
    target_folder_key: {
      type: "string",
      description: "One folder key from the allowed_folders context.",
    },
    suggested_filename: {
      type: ["string", "null"],
      description:
        "Safe descriptive filename when enough details are visible; otherwise null.",
    },
    vendor_or_party: {
      type: ["string", "null"],
      description:
        "Vendor, customer, issuer, or other visible party; null when not visible.",
    },
    document_date: {
      type: ["string", "null"],
      format: "date",
      description:
        "Visible document date in YYYY-MM-DD format; null when not visible.",
    },
    amount: {
      type: ["number", "null"],
      description:
        "Visible total or relevant monetary amount; null when not visible.",
    },
    currency: {
      type: ["string", "null"],
      description:
        "Visible or strongly implied currency code; null when not visible.",
    },
    invoice_number: {
      type: ["string", "null"],
      description:
        "Visible invoice, bill, or receipt number; null when not visible.",
    },
    due_date: {
      type: ["string", "null"],
      format: "date",
      description:
        "Visible due date in YYYY-MM-DD format; null when not visible.",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Classification confidence from 0 to 1.",
    },
    needs_review: {
      type: "boolean",
      description:
        "True only when the image cannot be confidently routed to a non-review folder.",
    },
    reason: {
      type: "string",
      description:
        "Brief reason for the selected document type, target folder, and review decision.",
    },
  },
  required: [
    "document_type",
    "target_folder_key",
    "suggested_filename",
    "vendor_or_party",
    "document_date",
    "amount",
    "currency",
    "invoice_number",
    "due_date",
    "confidence",
    "needs_review",
    "reason",
  ],
  additionalProperties: false,
  propertyOrdering: [
    "document_type",
    "target_folder_key",
    "suggested_filename",
    "vendor_or_party",
    "document_date",
    "amount",
    "currency",
    "invoice_number",
    "due_date",
    "confidence",
    "needs_review",
    "reason",
  ],
} as const;

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function toBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

function getCandidateText(payload: GeminiGenerateContentResponse) {
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  return text && text.length > 0 ? text : null;
}

async function parseGeminiJsonResponse(response: Response) {
  return (await response.json()) as GeminiGenerateContentResponse;
}

async function callGeminiClassificationApi(
  input: AIProviderClassificationInput,
) {
  const response = await fetch(
    `${GEMINI_API_URL}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildDocumentClassificationPrompt(input),
              },
              {
                inline_data: {
                  mime_type: input.mimeType,
                  data: toBase64(input.imageBytes),
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: DOCUMENT_CLASSIFICATION_RESPONSE_SCHEMA,
          temperature: 0,
        },
      }),
    },
  );

  const payload = await parseGeminiJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      `Gemini classification failed: ${response.status} ${response.statusText}`,
    );
  }

  return payload;
}

export class GeminiAIProvider implements AIProvider {
  async classifyDocument(input: AIProviderClassificationInput) {
    const rawPayload = await callGeminiClassificationApi(input);
    const candidateText = getCandidateText(rawPayload);

    if (!candidateText) {
      return normalizeAIClassificationResult({
        rawProviderPayload: rawPayload,
        allowedTargetFolders: input.allowedTargetFolders,
        captureContext: input.captureContext,
      });
    }

    try {
      const parsedPayload = parseProviderJsonPayload(candidateText);

      return normalizeAIClassificationResult({
        rawProviderPayload: parsedPayload,
        allowedTargetFolders: input.allowedTargetFolders,
        captureContext: input.captureContext,
      });
    } catch {
      return normalizeAIClassificationResult({
        rawProviderPayload: candidateText,
        allowedTargetFolders: input.allowedTargetFolders,
        captureContext: input.captureContext,
        parseFailure: {
          code: "invalid_json",
        },
      });
    }
  }
}
