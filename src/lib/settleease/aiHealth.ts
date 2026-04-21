import type {
  HealthConfidence,
  HealthSourceAiPayloadRow,
  StructuredHealthEstimate,
  StructuredHealthEstimateRow,
} from "./healthTypes";

export type { StructuredHealthEstimate, StructuredHealthEstimateRow } from "./healthTypes";

export const HEALTH_PROMPT_PLACEHOLDER = "{{JSON_DATA}}";
export const HEALTH_LEDGER_PROMPT_NAME = "health-ledger-estimation";
export const STRUCTURED_HEALTH_ESTIMATE_SCHEMA_VERSION = 1;

const HEALTH_CLASSIFICATIONS = new Set(["food", "alcohol", "ignore"]);
const HEALTH_CONFIDENCE_VALUES = new Set<HealthConfidence>(["low", "medium", "high"]);

function toStructuredHealthNumber(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Number(Math.max(0, amount).toFixed(2));
}

function normalizeConfidence(value: unknown): HealthConfidence {
  return typeof value === "string" && HEALTH_CONFIDENCE_VALUES.has(value as HealthConfidence)
    ? value as HealthConfidence
    : "medium";
}

export function buildEmptyStructuredHealthEstimateRow(sourceKey: string): StructuredHealthEstimateRow {
  return {
    sourceKey,
    classification: "ignore",
    estimatedCalories: 0,
    estimatedProteinGrams: 0,
    estimatedCarbGrams: 0,
    estimatedFatGrams: 0,
    estimatedAlcoholServings: 0,
    estimatedAlcoholCalories: 0,
    confidence: "low",
    rationale: "Insufficient evidence of food or alcohol consumption in the input row.",
  };
}

export function normalizeStructuredHealthEstimateRow(value: unknown): StructuredHealthEstimateRow {
  const source = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const sourceKey = String(source.sourceKey ?? "").trim();

  return {
    sourceKey,
    classification: typeof source.classification === "string" && HEALTH_CLASSIFICATIONS.has(source.classification)
      ? source.classification as StructuredHealthEstimateRow["classification"]
      : "ignore",
    estimatedCalories: toStructuredHealthNumber(source.estimatedCalories),
    estimatedProteinGrams: toStructuredHealthNumber(source.estimatedProteinGrams),
    estimatedCarbGrams: toStructuredHealthNumber(source.estimatedCarbGrams),
    estimatedFatGrams: toStructuredHealthNumber(source.estimatedFatGrams),
    estimatedAlcoholServings: toStructuredHealthNumber(source.estimatedAlcoholServings),
    estimatedAlcoholCalories: toStructuredHealthNumber(source.estimatedAlcoholCalories),
    confidence: normalizeConfidence(source.confidence),
    rationale: String(source.rationale ?? "").trim() || "No rationale provided.",
  };
}

export function normalizeStructuredHealthEstimate(value: unknown): StructuredHealthEstimate {
  const source = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const estimates = Array.isArray(source.estimates)
    ? source.estimates.map((row) => normalizeStructuredHealthEstimateRow(row))
    : [];

  return {
    schemaVersion: Number(source.schemaVersion) || STRUCTURED_HEALTH_ESTIMATE_SCHEMA_VERSION,
    estimates,
  };
}

export function normalizeStructuredHealthEstimateForRows(
  rows: Pick<HealthSourceAiPayloadRow, "sourceKey">[],
  value: unknown,
): StructuredHealthEstimate {
  const normalized = normalizeStructuredHealthEstimate(value);
  const estimatesByKey = new Map(
    normalized.estimates
      .filter((row) => row.sourceKey)
      .map((row) => [row.sourceKey, row] as const),
  );

  return {
    schemaVersion: normalized.schemaVersion,
    estimates: rows.map((row) => estimatesByKey.get(row.sourceKey) ?? buildEmptyStructuredHealthEstimateRow(row.sourceKey)),
  };
}

export function parseStructuredHealthEstimateText(text: string): StructuredHealthEstimate | null {
  try {
    return normalizeStructuredHealthEstimate(JSON.parse(text));
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      return normalizeStructuredHealthEstimate(JSON.parse(text.slice(start, end + 1)));
    } catch {
      return null;
    }
  }
}

export const STRUCTURED_HEALTH_ESTIMATE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    schemaVersion: {
      type: "integer",
      description: "The response schema version. Use 1.",
    },
    estimates: {
      type: "array",
      description: "One estimated nutrition record per source row.",
      items: {
        type: "object",
        properties: {
          sourceKey: {
            type: "string",
            description: "The exact sourceKey from the input row.",
          },
          classification: {
            type: "string",
            enum: ["food", "alcohol", "ignore"],
          },
          estimatedCalories: { type: "number" },
          estimatedProteinGrams: { type: "number" },
          estimatedCarbGrams: { type: "number" },
          estimatedFatGrams: { type: "number" },
          estimatedAlcoholServings: { type: "number" },
          estimatedAlcoholCalories: { type: "number" },
          confidence: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          rationale: {
            type: "string",
            description: "Brief justification for the estimate.",
          },
        },
        required: [
          "sourceKey",
          "classification",
          "estimatedCalories",
          "estimatedProteinGrams",
          "estimatedCarbGrams",
          "estimatedFatGrams",
          "estimatedAlcoholServings",
          "estimatedAlcoholCalories",
          "confidence",
          "rationale",
        ],
      },
    },
  },
  required: ["schemaVersion", "estimates"],
};

export const DEFAULT_HEALTH_LEDGER_PROMPT = `You are SettleEase Health AI. Estimate nutrition and alcohol impact from expense text only.

Your job:
1. Read the provided JSON rows.
2. Return one estimate for every row.
3. Classify each row as food, alcohol, or ignore.
4. Estimate calories, macros, and alcohol impact conservatively.

Rules:
- Use ONLY the provided JSON. Do not invent extra rows.
- Return ONLY valid JSON matching the schema. No markdown, no code fences.
- Every output row must keep the exact sourceKey from the input.
- If a row clearly does not represent edible food or alcohol, classify it as "ignore" and set all numeric fields to 0.
- estimatedCalories must reflect total estimated calories for the full row, not per person.
- estimatedAlcoholCalories should only reflect calories attributable to alcohol. It can be 0 for food rows.
- estimatedAlcoholServings should estimate standard drinks/servings only when alcohol is plausible.
- Use realistic nutrition estimates from common food knowledge, but be conservative when details are ambiguous.
- Confidence should reflect how clearly the item name/category implies a nutrition estimate.
- rationale must be short, factual, and user-safe.
- Do not provide medical advice, wellness coaching, or recommendations.

Data:
${HEALTH_PROMPT_PLACEHOLDER}

Required JSON fields:
- schemaVersion: 1
- estimates: one object per input row`;

export function injectHealthJsonIntoPrompt(promptText: string, jsonData: unknown): string {
  if (!promptText.includes(HEALTH_PROMPT_PLACEHOLDER)) {
    throw new Error(
      `AI prompt is missing ${HEALTH_PROMPT_PLACEHOLDER}. Please update the prompt template.`,
    );
  }

  return promptText.split(HEALTH_PROMPT_PLACEHOLDER).join(JSON.stringify(jsonData, null, 2));
}
