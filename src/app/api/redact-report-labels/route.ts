import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchAiModelAttemptOrder } from "@/lib/settleease/aiModelConfigServer";
import {
  buildRedactionPrompt,
  normalizeRedactionResponse,
  parseRedactionResponseText,
  REDACTION_RESPONSE_SCHEMA,
  type RedactionEntryInput,
} from "@/lib/settleease/aiRedaction";
import { getAiModelOption } from "@/lib/settleease/aiModels";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_REDACTION_ENTRIES = 150;

function sanitizeEntries(value: unknown): RedactionEntryInput[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_REDACTION_ENTRIES).map((entry, index) => {
    const source = typeof entry === "object" && entry !== null ? entry as Record<string, unknown> : {};
    const items = Array.isArray(source.items) ? source.items : [];

    return {
      key: String(source.key || `expense-${index}`),
      description: String(source.description || "Untitled expense").slice(0, 160),
      category: String(source.category || "Uncategorized").slice(0, 80),
      items: items.slice(0, 80).map((item, itemIndex) => {
        const itemSource = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
        return {
          key: String(itemSource.key || `item-${itemIndex}`),
          name: String(itemSource.name || `Item ${itemIndex + 1}`).slice(0, 160),
          category: String(itemSource.category || source.category || "Uncategorized").slice(0, 80),
        };
      }),
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return Response.json(
        { error: "AI service is not configured. Please contact administrator." },
        { status: 500 },
      );
    }

    const { entries } = await request.json();
    const redactionEntries = sanitizeEntries(entries);

    if (redactionEntries.length === 0) {
      return Response.json({ redactions: { schemaVersion: 1, entries: [] } });
    }

    const modelAttemptOrder = await fetchAiModelAttemptOrder();
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const prompt = buildRedactionPrompt(redactionEntries);

    let successfulModel = "";
    let redactions = null;
    const errors: string[] = [];

    for (const modelName of modelAttemptOrder) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: REDACTION_RESPONSE_SCHEMA as any,
          },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = parseRedactionResponseText(text);
        if (!parsed) {
          throw new Error("Model returned invalid redaction JSON");
        }

        redactions = normalizeRedactionResponse(parsed);
        successfulModel = modelName;
        break;
      } catch (error: any) {
        const message = error?.message || "Unknown model error";
        console.warn(`AI redaction model ${modelName} failed: ${message}`);
        errors.push(`${modelName}: ${message}`);
      }
    }

    if (!redactions || !successfulModel) {
      throw new Error(`All AI redaction models failed. Errors: ${errors.join("; ")}`);
    }

    return Response.json({
      redactions,
      model: successfulModel,
      modelDisplayName: getAiModelOption(successfulModel).displayName,
    });
  } catch (error: any) {
    const message = error?.message || "Failed to redact report labels.";
    console.error("Report redaction API error:", error);

    return Response.json(
      {
        error: message.includes("quota") || message.includes("429")
          ? "AI quota exceeded. Using local redaction fallback."
          : "AI redaction is unavailable. Using local redaction fallback.",
        technicalDetails: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
