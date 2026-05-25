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
  reason: "Retail receipt with vendor, date, and total."
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
  reason: "On-site progress photo."
};

const originalFetch = global.fetch;

function createGeminiResponse(text: string, ok = true) {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text }]
          }
        }
      ]
    }),
    {
      status: ok ? 200 : 500,
      headers: {
        "Content-Type": "application/json"
      }
    }
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
      category: "Landscaping"
    },
    allowedTargetFolders: [
      { key: "receipts", name: "01 Receipts" },
      { key: "job_photos", name: "04 Job Photos" },
      { key: "needs_review", name: "99 Needs Review" }
    ]
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

  it("returns a normalized receipt classification for clear output", async () => {
    vi.mocked(global.fetch).mockResolvedValue(createGeminiResponse(JSON.stringify(receiptFixture)));

    const result = await createProvider().classifyDocument(createInput());

    expect(result).toMatchObject({
      document_type: "receipt",
      target_folder_key: "receipts",
      suggested_filename: "Home Depot - 182.44 - 2026-05-21.jpg",
      confidence: 0.98,
      needs_review: false,
      valid: true
    });
  });

  it("clamps confidence after schema parsing for a clear job photo", async () => {
    vi.mocked(global.fetch).mockResolvedValue(createGeminiResponse(JSON.stringify(jobPhotoFixture)));

    const result = await createProvider().classifyDocument(createInput());

    expect(result).toMatchObject({
      document_type: "job_photo",
      target_folder_key: "job_photos",
      confidence: 1,
      valid: true
    });
  });

  it("downgrades invalid JSON into a needs-review result", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createGeminiResponse('{"document_type":"receipt","target_folder_key":"receipts"')
    );

    const result = await createProvider().classifyDocument(createInput());

    expect(result).toMatchObject({
      target_folder_key: "needs_review",
      needs_review: true,
      valid: false
    });
  });

  it("downgrades missing required fields into a needs-review result", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createGeminiResponse(
        JSON.stringify({
          document_type: "receipt",
          target_folder_key: "receipts",
          confidence: 0.99
        })
      )
    );

    const result = await createProvider().classifyDocument(createInput());

    expect(result).toMatchObject({
      target_folder_key: "needs_review",
      needs_review: true,
      valid: false
    });
  });

  it("rejects an impossible folder choice for the current context", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      createGeminiResponse(
        JSON.stringify({
          ...receiptFixture,
          target_folder_key: "bank_credit_card"
        })
      )
    );

    const result = await createProvider().classifyDocument(createInput());

    expect(result).toMatchObject({
      document_type: "receipt",
      target_folder_key: "needs_review",
      needs_review: true,
      valid: false
    });
  });
});
