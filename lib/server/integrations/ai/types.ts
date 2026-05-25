export type DocumentCaptureContext = "job" | "general";

export type AllowedTargetFolder = {
  key: string;
  name: string;
};

export type AIProviderJobContext = {
  clientName: string;
  jobName: string;
  category: string;
};

export type AIProviderClassificationInput = {
  imageBytes: Uint8Array;
  mimeType: string;
  businessName: string;
  captureContext: DocumentCaptureContext;
  job: AIProviderJobContext | null;
  allowedTargetFolders: AllowedTargetFolder[];
};

export type AIClassificationResult = {
  document_type: string;
  target_folder_key: string;
  suggested_filename: string | null;
  vendor_or_party: string | null;
  document_date: string | null;
  amount: number | null;
  currency: string | null;
  invoice_number: string | null;
  due_date: string | null;
  confidence: number;
  needs_review: boolean;
  reason: string;
  raw_provider_payload: unknown;
  valid: boolean;
};

export interface AIProvider {
  classifyDocument(input: AIProviderClassificationInput): Promise<AIClassificationResult>;
}
