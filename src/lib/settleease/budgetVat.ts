import type {
  BudgetVatClassification,
  BudgetVatClass,
  BudgetVatConfidence,
  BudgetVatSource,
} from "./types";

export interface BudgetVatInputItem {
  key: string;
  name: string;
  categoryName?: string | null;
}

const VAT_CLASSES = new Set<BudgetVatClass>(["standard", "alcohol"]);
const VAT_CONFIDENCE_VALUES = new Set<BudgetVatConfidence>([
  "low",
  "medium",
  "high",
]);

export const BUDGET_ITEM_TAX_RATE = 0.05;
export const BUDGET_ALCOHOL_VAT_RATE = 0.1;

function normalizeText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeVatClass(value: unknown): BudgetVatClass {
  if (typeof value === "string" && VAT_CLASSES.has(value as BudgetVatClass)) {
    return value as BudgetVatClass;
  }

  throw new Error("AI returned an invalid tax classification.");
}

function normalizeConfidence(value: unknown): BudgetVatConfidence {
  return typeof value === "string" &&
    VAT_CONFIDENCE_VALUES.has(value as BudgetVatConfidence)
    ? (value as BudgetVatConfidence)
    : "medium";
}

export function normalizeBudgetVatClassifications(
  items: BudgetVatInputItem[],
  value: unknown,
  source: BudgetVatSource,
): BudgetVatClassification[] {
  const expectedKeys = items.map((item) => normalizeText(item.key));
  const expectedKeySet = new Set(expectedKeys);
  const response = typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
  const rows = Array.isArray(response.items) ? response.items : [];
  const byKey = new Map<string, BudgetVatClassification>();

  rows.forEach((row) => {
    const item = typeof row === "object" && row !== null
      ? (row as Record<string, unknown>)
      : {};
    const key = normalizeText(item.key);
    if (!key) return;
    if (!expectedKeySet.has(key)) return;

    byKey.set(key, {
      key,
      vat_class: normalizeVatClass(item.vatClass ?? item.vat_class),
      confidence: normalizeConfidence(item.confidence),
      rationale:
        normalizeText(item.rationale) || "Classified for alcohol VAT.",
      source,
    });
  });

  const missingKeys = expectedKeys.filter((key) => !byKey.has(key));
  if (missingKeys.length > 0) {
    throw new Error("AI did not classify every budget item.");
  }

  return expectedKeys.map((key) => byKey.get(key)!);
}

export function parseBudgetVatClassificationText(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export function getBudgetAlcoholVatRate(vatClass: BudgetVatClass) {
  return vatClass === "alcohol" ? BUDGET_ALCOHOL_VAT_RATE : 0;
}
