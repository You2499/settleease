import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchAiModelAttemptOrder } from "@/lib/settleease/aiModelConfigServer";
import { getAiModelOption } from "@/lib/settleease/aiModels";
import {
  classifyBudgetVatFallback,
  normalizeBudgetVatClassifications,
  parseBudgetVatClassificationText,
  type BudgetVatInputItem,
} from "@/lib/settleease/budgetVat";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_ITEMS = 80;

const BUDGET_VAT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    schemaVersion: {
      type: "integer",
      description: "The response schema version. Use 1.",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          vatClass: {
            type: "string",
            enum: ["standard", "alcohol"],
          },
          confidence: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          rationale: {
            type: "string",
          },
        },
        required: ["key", "vatClass", "confidence", "rationale"],
      },
    },
  },
  required: ["schemaVersion", "items"],
};

function sanitizeItems(value: unknown): BudgetVatInputItem[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_ITEMS).map((item, index) => {
    const source = typeof item === "object" && item !== null
      ? (item as Record<string, unknown>)
      : {};

    return {
      key: String(source.key || `item-${index}`).slice(0, 120),
      name: String(source.name || `Item ${index + 1}`).slice(0, 160),
      categoryName: String(source.categoryName || source.category_name || "").slice(0, 80),
    };
  });
}

function buildBudgetVatPrompt(items: BudgetVatInputItem[]) {
  return `You are SettleEase's alcohol VAT classifier for budget simulation.

Task:
Classify every provided bill item as either "alcohol" or "standard" for alcohol VAT.

Tax and VAT rules:
- "standard": all food, non-alcoholic drinks, fees, and unknown items. These receive 5% Tax.
- "alcohol": beer, wine, spirits, liquor, cocktails, and clearly alcoholic beverages. These receive 10% VAT instead of the standard 5% Tax.

Classification rules:
- Return ONLY valid JSON matching the response schema.
- Preserve every item key exactly.
- If the item is ambiguous, choose "standard".
- Non-alcoholic drinks such as water, juice, soda, tea, coffee, mocktails, or virgin drinks are "standard".
- Use the name and category only. Do not infer from price or user identity.
- Keep rationale short.

Input JSON:
${JSON.stringify({ items }, null, 2)}

Required JSON fields:
- schemaVersion: 1
- items: one object per input item with key, vatClass, confidence, rationale`;
}

function fallbackResponse(items: BudgetVatInputItem[], reason?: string) {
  return Response.json({
    classifications: items.map(classifyBudgetVatFallback),
    source: "heuristic",
    reason,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();
    const budgetItems = sanitizeItems(items);

    if (budgetItems.length === 0) {
      return Response.json({ classifications: [], source: "none" });
    }

    if (!GEMINI_API_KEY) {
      return fallbackResponse(budgetItems, "AI service is not configured.");
    }

    const modelAttemptOrder = await fetchAiModelAttemptOrder();
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const prompt = buildBudgetVatPrompt(budgetItems);
    const errors: string[] = [];

    for (const modelName of modelAttemptOrder) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.05,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: BUDGET_VAT_RESPONSE_SCHEMA as any,
          },
        });

        const result = await model.generateContent(prompt);
        const parsed = parseBudgetVatClassificationText(result.response.text());
        if (!parsed) {
          throw new Error("Model returned invalid VAT classification JSON");
        }

        return Response.json({
          classifications: normalizeBudgetVatClassifications(
            budgetItems,
            parsed,
            "ai",
          ),
          source: "ai",
          model: modelName,
          modelDisplayName: getAiModelOption(modelName).displayName,
        });
      } catch (error: any) {
        const message = error?.message || "Unknown model error";
        console.warn(`Budget VAT model ${modelName} failed: ${message}`);
        errors.push(`${modelName}: ${message}`);
      }
    }

    return fallbackResponse(
      budgetItems,
      `All AI VAT classifiers failed. ${errors.join("; ")}`,
    );
  } catch (error: any) {
    const message = error?.message || "Failed to classify budget VAT.";
    console.error("Budget VAT classification API error:", error);

    return Response.json(
      {
        error: "Budget VAT classification failed.",
        technicalDetails:
          process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
