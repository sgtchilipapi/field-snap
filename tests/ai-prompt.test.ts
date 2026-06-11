import { describe, expect, it } from "vitest";
import { buildDocumentClassificationPrompt } from "@/lib/server/integrations/ai";

describe("buildDocumentClassificationPrompt", () => {
  it("tells Gemini to compare invoice issuers against the business name", () => {
    const prompt = buildDocumentClassificationPrompt({
      imageBytes: new Uint8Array([1, 2, 3]),
      mimeType: "image/jpeg",
      businessName: "ABC Landscaping",
      captureContext: "job",
      job: {
        clientName: "Smith Residence",
        jobName: "Backyard Cleanup",
        category: "Landscaping",
      },
      allowedTargetFolders: [
        { key: "vendor_bills", name: "02 Vendor Bills" },
        { key: "customer_invoices", name: "03 Customer Invoices" },
        { key: "needs_review", name: "99 Needs Review" },
      ],
    });

    expect(prompt).toContain(
      "compare the visible issuer/payee/vendor/seller name with business_name",
    );
    expect(prompt).toContain(
      "If it matches business_name, classify it as customer_invoice",
    );
    expect(prompt).toContain(
      "set vendor_or_party to the visible issuer/payee/vendor/seller name",
    );
  });

  it("tells Gemini that clear job photos can auto-file without visible metadata", () => {
    const prompt = buildDocumentClassificationPrompt({
      imageBytes: new Uint8Array([1, 2, 3]),
      mimeType: "image/jpeg",
      businessName: "ABC Landscaping",
      captureContext: "job",
      job: {
        clientName: "Smith Residence",
        jobName: "Backyard Cleanup",
        category: "Landscaping",
      },
      allowedTargetFolders: [
        { key: "job_photos", name: "04 Job Photos" },
        { key: "needs_review", name: "99 Needs Review" },
      ],
    });

    expect(prompt).toContain(
      "clear non-document worksite, progress, material, equipment, or completed-work photos should normally target job_photos with needs_review=false",
    );
    expect(prompt).toContain(
      "null metadata alone is not a reason to route a clear job photo to Needs Review",
    );
  });
});
