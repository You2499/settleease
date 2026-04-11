export const SUMMARY_PROMPT_PLACEHOLDER = "{{JSON_DATA}}";
export const SETTLEMENT_SUMMARY_PROMPT_NAME = "settlement-summary";

export const STRUCTURED_SUMMARY_SECTION_ORDER = [
  "settlementSnapshot",
  "keyNumbers",
  "whoShouldReceiveMoney",
  "whoShouldPay",
  "recommendedSettlementActions",
  "spendingDrivers",
  "manualOverridesAndExceptions",
  "dataQuality",
  "nextBestActions",
] as const;

export type StructuredSummarySectionKey = typeof STRUCTURED_SUMMARY_SECTION_ORDER[number];

export const STRUCTURED_SUMMARY_SECTION_TITLES: Record<StructuredSummarySectionKey, string> = {
  settlementSnapshot: "Settlement Snapshot",
  keyNumbers: "Key Numbers",
  whoShouldReceiveMoney: "Who Should Receive Money",
  whoShouldPay: "Who Should Pay",
  recommendedSettlementActions: "Recommended Settlement Actions",
  spendingDrivers: "Spending Drivers",
  manualOverridesAndExceptions: "Manual Overrides and Exceptions",
  dataQuality: "Data Quality",
  nextBestActions: "Next Best Actions",
};

export interface StructuredSettlementSummary {
  schemaVersion: number;
  settlementSnapshot: string[];
  keyNumbers: string[];
  whoShouldReceiveMoney: string[];
  whoShouldPay: string[];
  recommendedSettlementActions: string[];
  spendingDrivers: string[];
  manualOverridesAndExceptions: string[];
  dataQuality: string[];
  nextBestActions: string[];
}

const stringListSchema = (description: string, minItems = 1, maxItems = 6) => ({
  type: "array",
  description,
  minItems,
  maxItems,
  items: {
    type: "string",
  },
});

export const STRUCTURED_SUMMARY_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    schemaVersion: {
      type: "integer",
      description: "The structured summary schema version. Use 1.",
    },
  settlementSnapshot: stringListSchema("Concise bullets describing the current settlement state without repeating key numbers.", 1, 2),
    keyNumbers: stringListSchema("Key financial numbers from the provided JSON only.", 4, 6),
    whoShouldReceiveMoney: stringListSchema("Ranked creditors, amounts, and short reasons.", 1, 6),
    whoShouldPay: stringListSchema("Ranked debtors, amounts, and short reasons.", 1, 6),
    recommendedSettlementActions: stringListSchema("Outstanding payment actions in priority order.", 1, 8),
  spendingDrivers: stringListSchema("Top categories and notable spending patterns without repeating the same item twice.", 1, 5),
    manualOverridesAndExceptions: stringListSchema("Manual override and exception status.", 1, 5),
    dataQuality: stringListSchema("Integrity and consistency status, including explicit warnings.", 1, 8),
    nextBestActions: stringListSchema("Immediate operational actions for admins and participants.", 2, 5),
  },
  required: [
    "schemaVersion",
    ...STRUCTURED_SUMMARY_SECTION_ORDER,
  ],
};

export const DEFAULT_PRODUCTION_SUMMARY_PROMPT = `You are SettleEase AI, a neutral financial settlement analyst.

Your job:
1) Explain the group's settlement state clearly.
2) Prioritize actionable payment steps.
3) Highlight important spending drivers and data-quality warnings.

Rules:
- Use ONLY the provided JSON data.
- Do NOT imitate any personality, public figure, or political style.
- Be concise, factual, and operational.
- Never expose internal IDs, UUIDs, or raw technical fields.
- If data is inconsistent, explicitly call it out in "Data Quality".
- Do not invent values; if unavailable, say "Not available in input data".
- Keep the combined text across all string arrays between 110 and 220 words.
- Return ONLY a JSON object matching the response schema. No Markdown, no code fences, no tables.
- Every array item must be a complete user-facing bullet sentence.
- Preserve the requested section meanings exactly. The application will render headings and ordering.
- Do not repeat the same fact in multiple sections. Prefer one precise mention over several reworded mentions.
- Settlement Snapshot should explain state and urgency, not restate all key numbers.
- Recommended settlement actions must include only outstanding actionable payments from transactions.recommendedPaymentOrder.
- Key Numbers must use the analysis.totals values exactly as provided.
- Who Should Receive Money and Who Should Pay should summarize only role and priority; avoid restating every payment already in Recommended Settlement Actions.
- Data Quality must mention conservationCheck and expenseConsistency. If warningList has entries, include them explicitly.

Data:
{{JSON_DATA}}

Required JSON fields:
- schemaVersion: 1
- settlementSnapshot
- keyNumbers
- whoShouldReceiveMoney
- whoShouldPay
- recommendedSettlementActions
- spendingDrivers
- manualOverridesAndExceptions
- dataQuality
- nextBestActions
`;

export function injectSummaryJsonIntoPrompt(promptText: string, jsonData: unknown): string {
  if (!promptText.includes(SUMMARY_PROMPT_PLACEHOLDER)) {
    throw new Error(
      `AI prompt is missing ${SUMMARY_PROMPT_PLACEHOLDER}. Please update the prompt template.`
    );
  }

  const jsonString = JSON.stringify(jsonData, null, 2);
  return promptText.split(SUMMARY_PROMPT_PLACEHOLDER).join(jsonString);
}

export interface SummarizeRequestPayload {
  jsonData: unknown;
  hash: string;
  promptVersion?: number;
  modelCode?: string;
}

export function buildSummarizeRequestPayload(
  jsonData: unknown,
  hash: string,
  promptVersion?: number,
  modelCode?: string
): SummarizeRequestPayload {
  return {
    jsonData,
    hash,
    promptVersion,
    modelCode,
  };
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return ["Not available in input data"];
  const strings = value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  return strings.length > 0 ? strings : ["Not available in input data"];
}

export function normalizeStructuredSummary(value: unknown): StructuredSettlementSummary {
  const source = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};

  return {
    schemaVersion: Number(source.schemaVersion) || 1,
    settlementSnapshot: toStringList(source.settlementSnapshot),
    keyNumbers: toStringList(source.keyNumbers),
    whoShouldReceiveMoney: toStringList(source.whoShouldReceiveMoney),
    whoShouldPay: toStringList(source.whoShouldPay),
    recommendedSettlementActions: toStringList(source.recommendedSettlementActions),
    spendingDrivers: toStringList(source.spendingDrivers),
    manualOverridesAndExceptions: toStringList(source.manualOverridesAndExceptions),
    dataQuality: toStringList(source.dataQuality),
    nextBestActions: toStringList(source.nextBestActions),
  };
}

export function parseStructuredSummaryText(text: string): StructuredSettlementSummary | null {
  try {
    return normalizeStructuredSummary(JSON.parse(text));
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      return normalizeStructuredSummary(JSON.parse(text.slice(start, end + 1)));
    } catch {
      return null;
    }
  }
}

export function structuredSummaryToMarkdown(summary: StructuredSettlementSummary): string {
  return STRUCTURED_SUMMARY_SECTION_ORDER
    .map((sectionKey) => {
      const title = STRUCTURED_SUMMARY_SECTION_TITLES[sectionKey];
      const items = summary[sectionKey]
        .map((item) => `- ${item}`)
        .join("\n");
      return `# ${title}\n${items}`;
    })
    .join("\n\n");
}
