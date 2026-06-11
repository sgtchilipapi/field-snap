import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiAIProvider } from "@/lib/server/integrations/ai";

const receiptFixture = {
  document_type: "receipt",
  target_folder_key: "receipts",
  suggested_filename: "Home Depot - 182.44 - 2026-05-21.jpg",
  vendor_or_party: "Home Depot",
  document_date: "2026-05-21",
  amount: 182.44,
  currency: "USD",
  invoice_number: null,
  due_date: null,
  confidence: 0.98,
  needs_review: false,
  reason: "Retail receipt with vendor, date, and total.",
};

const jobPhotoFixture = {
  document_type: "job_photo",
  target_folder_key: "job_photos",
  suggested_filename: null,
  vendor_or_party: null,
  document_date: "2026-05-22",
  amount: null,
  currency: null,
  invoice_number: null,
  due_date: null,
  confidence: 1.2,
  needs_review: false,
  reason: "On-site progress photo.",
};

const originalFetch = global.fetch;

function createGeminiResponse(text: string, ok = true) {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text }],
          },
        },
      ],
    }),
    {
      status: ok ? 200 : 500,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

function createGeminiErrorResponse(input: {
  status: number;
  statusText: string;
  providerStatus: string;
  providerMessage: string;
}) {
  return new Response(
    JSON.stringify({
      error: {
        code: input.status,
        message: input.providerMessage,
        status: input.providerStatus,
      },
    }),
    {
      status: input.status,
      statusText: input.statusText,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

function createProvider() {
  return new GeminiAIProvider();
}

function createInput() {
  return {
    imageBytes: new Uint8Array([1, 2, 3]),
    mimeType: "image/jpeg",
    businessName: "ABC Landscaping",
    captureContext: "job" as const,
    job: {
      clientName: "Smith Residence",
      jobName: "Backyard Cleanup",
      category: "Landscaping",
    },
    allowedTargetFolders: [
      { key: "receipts", name: "01 Receipts" },
      { key: "job_photos", name: "04 Job Photos" },
      { key: "needs_review", name: "99 Needs Review" },
    ],
  };
}

describe("GeminiAIProvider", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetAllMocks();
  });

  it("requests schema-constrained JSON from Gemini", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createGeminiResponse(JSON.stringify(receiptFixture)),
    );

    await createProvider().classifyDocument(createInput());

    const [, requestInit] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(String(requestInit?.body));

    expect(body.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      temperature: 0,
    });
    expect(body.generationConfig.responseJsonSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: expect.arrayContaining([
        "document_type",
        "target_folder_key",
        "confidence",
        "needs_review",
        "reason",
      ]),
    });
    expect(
      body.generationConfig.responseJsonSchema.properties.document_type.enum,
    ).toContain("job_photo");
    expect(
      body.generationConfig.responseJsonSchema.properties.suggested_filename
        .type,
    ).toEqual(["string", "null"]);
  });

  it("returns a normalized receipt classification for clear output", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createGeminiResponse(JSON.stringify(receiptFixture)),
    );

    const result = await createProvider().classifyDocument(createInput());

    expect(result).toMatchObject({
      document_type: "receipt",
      target_folder_key: "receipts",
      suggested_filename: "Home Depot - 182.44 - 2026-05-21.jpg",
      confidence: 0.98,
      needs_review: false,
      valid: true,
      normalization_error_code: null,
    });
  });

  it("clamps confidence after schema parsing for a clear job photo", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createGeminiResponse(JSON.stringify(jobPhotoFixture)),
    );

    const result = await createProvider().classifyDocument(createInput());

    expect(result).toMatchObject({
      document_type: "job_photo",
      target_folder_key: "job_photos",
      confidence: 1,
      valid: true,
      normalization_error_code: null,
    });
  });

  it("preserves Gemini error details when the provider rejects a request", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createGeminiErrorResponse({
        status: 400,
        statusText: "Bad Request",
        providerStatus: "INVALID_ARGUMENT",
        providerMessage:
          "Invalid JSON payload received. Unknown name responseJsonSchema at generationConfig.",
      }),
    );

    await expect(
      createProvider().classifyDocument(createInput()),
    ).rejects.toMatchObject({
      name: "GeminiClassificationApiError",
      message:
        "Gemini classification failed: 400 Bad Request: Invalid JSON payload received. Unknown name responseJsonSchema at generationConfig.",
      status: 400,
      statusText: "Bad Request",
      providerErrorStatus: "INVALID_ARGUMENT",
      providerErrorMessage:
        "Invalid JSON payload received. Unknown name responseJsonSchema at generationConfig.",
    });
  });

  it("downgrades invalid JSON into a needs-review result", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createGeminiResponse(
        '{"document_type":"receipt","target_folder_key":"receipts"',
      ),
    );

    const result = await createProvider().classifyDocument(createInput());

    expect(result).toMatchObject({
      target_folder_key: "needs_review",
      needs_review: true,
      valid: false,
      reason: "AI returned invalid JSON and requires review.",
      normalization_error_code: "invalid_json",
    });
  });

  it("downgrades missing required fields into a needs-review result", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createGeminiResponse(
        JSON.stringify({
          document_type: "receipt",
          target_folder_key: "receipts",
          confidence: 0.99,
        }),
      ),
    );

    const result = await createProvider().classifyDocument(createInput());

    expect(result).toMatchObject({
      target_folder_key: "needs_review",
      needs_review: true,
      valid: false,
      reason: "AI output failed schema validation and requires review.",
      normalization_error_code: "schema_validation_failed",
    });
  });

  it("rejects an impossible folder choice for the current context", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createGeminiResponse(
        JSON.stringify({
          ...receiptFixture,
          target_folder_key: "bank_credit_card",
        }),
      ),
    );

    const result = await createProvider().classifyDocument(createInput());

    expect(result).toMatchObject({
      document_type: "receipt",
      target_folder_key: "needs_review",
      needs_review: true,
      valid: false,
      reason:
        'AI selected unsupported target folder key "bank_credit_card" for job capture context and requires review.',
      normalization_error_code: "unsupported_folder_key",
    });
  });
});
