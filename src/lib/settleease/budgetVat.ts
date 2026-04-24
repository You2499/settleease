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

const ALCOHOL_PATTERN =
  /\b(alcohol|alcoholic|beer|lager|ale|stout|ipa|wine|sangria|champagne|prosecco|whisky|whiskey|vodka|gin|rum|tequila|brandy|cognac|scotch|bourbon|liquor|liqueur|cocktail|mocktail with alcohol|martini|margarita|mojito|negroni|old fashioned|daiquiri|cosmopolitan|pint|peg|shot|draught|draft|breezer|cider|sake|soju|absinthe|baileys|kahlua|aperol|campari|jager|jagermeister)\b/i;

const NON_ALCOHOL_PATTERN =
  /\b(mocktail|virgin|zero alcohol|non alcoholic|non-alcoholic|soft drink|soda|cola|juice|water|coffee|tea|lassi|shake|smoothie|lemonade|iced tea)\b/i;

function normalizeText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function classifyBudgetVatFallback(
  item: BudgetVatInputItem,
): BudgetVatClassification {
  const key = normalizeText(item.key);
  const name = normalizeText(item.name);
  const categoryName = normalizeText(item.categoryName);
  const combined = `${name} ${categoryName}`;

  if (NON_ALCOHOL_PATTERN.test(combined)) {
    return {
      key,
      vat_class: "standard",
      confidence: "medium",
      rationale: "Recognized as a non-alcoholic item.",
      source: "heuristic",
    };
  }

  if (ALCOHOL_PATTERN.test(combined)) {
    return {
      key,
      vat_class: "alcohol",
      confidence: "high",
      rationale: "Name or category indicates alcohol.",
      source: "heuristic",
    };
  }

  return {
    key,
    vat_class: "standard",
    confidence: "low",
    rationale: "No alcohol signal found.",
    source: "heuristic",
  };
}

function normalizeVatClass(value: unknown): BudgetVatClass {
  return typeof value === "string" && VAT_CLASSES.has(value as BudgetVatClass)
    ? (value as BudgetVatClass)
    : "standard";
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

    byKey.set(key, {
      key,
      vat_class: normalizeVatClass(item.vatClass ?? item.vat_class),
      confidence: normalizeConfidence(item.confidence),
      rationale: normalizeText(item.rationale) || "Classified for VAT.",
      source,
    });
  });

  return items.map((item) => {
    const key = normalizeText(item.key);
    return byKey.get(key) ?? classifyBudgetVatFallback(item);
  });
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

export function getBudgetVatRate(vatClass: BudgetVatClass) {
  return vatClass === "alcohol" ? 0.1 : 0.05;
}
