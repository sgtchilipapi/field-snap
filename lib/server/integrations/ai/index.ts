export { GeminiAIProvider } from "@/lib/server/integrations/ai/gemini";
export { buildDocumentClassificationPrompt } from "@/lib/server/integrations/ai/prompt";
export {
  normalizeAIClassificationResult,
  parseProviderJsonPayload
} from "@/lib/server/integrations/ai/classification";
export type {
  AIClassificationResult,
  AIProvider,
  AIProviderClassificationInput,
  AIProviderJobContext,
  AllowedTargetFolder,
  DocumentCaptureContext
} from "@/lib/server/integrations/ai/types";
