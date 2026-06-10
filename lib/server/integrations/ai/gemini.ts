import { env } from "@/lib/server/env";
import { buildDocumentClassificationPrompt } from "@/lib/server/integrations/ai/prompt";
import {
  normalizeAIClassificationResult,
  parseProviderJsonPayload
} from "@/lib/server/integrations/ai/classification";
import type {
  AIProvider,
  AIProviderClassificationInput
} from "@/lib/server/integrations/ai/types";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

  return text && text.length > 0 ? text : null;
}

async function parseGeminiJsonResponse(response: Response) {
  return (await response.json()) as GeminiGenerateContentResponse;
}

async function callGeminiClassificationApi(input: AIProviderClassificationInput) {
  const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildDocumentClassificationPrompt(input)
            },
            {
              inline_data: {
                mime_type: input.mimeType,
                data: toBase64(input.imageBytes)
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0
      }
    })
  });

  const payload = await parseGeminiJsonResponse(response);

  if (!response.ok) {
    throw new Error(`Gemini classification failed: ${response.status} ${response.statusText}`);
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
        captureContext: input.captureContext
      });
    }

    try {
      const parsedPayload = parseProviderJsonPayload(candidateText);

      return normalizeAIClassificationResult({
        rawProviderPayload: parsedPayload,
        allowedTargetFolders: input.allowedTargetFolders,
        captureContext: input.captureContext
      });
    } catch {
      return normalizeAIClassificationResult({
        rawProviderPayload: candidateText,
        allowedTargetFolders: input.allowedTargetFolders,
        captureContext: input.captureContext,
        parseFailure: {
          code: "invalid_json"
        }
      });
    }
  }
}
