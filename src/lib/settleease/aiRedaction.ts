export interface RedactionItemInput {
  key: string;
  name: string;
  category?: string | null;
}

export interface RedactionEntryInput {
  key: string;
  description: string;
  category?: string | null;
  items?: RedactionItemInput[];
}

export interface RedactedItemLabel {
  key: string;
  name: string;
  category: string;
}

export interface RedactedEntryLabel {
  key: string;
  description: string;
  category: string;
  items: RedactedItemLabel[];
}

export interface RedactionResponse {
  schemaVersion: number;
  entries: RedactedEntryLabel[];
}

export interface ReportRedactionValue {
  description?: string;
  category?: string;
  items?: Record<string, {
    name?: string;
    category?: string;
  }>;
}

export type ReportRedactionMap = Record<string, ReportRedactionValue>;

export const REDACTION_PROMPT_VERSION = 1;

export function buildRedactionCachePayload({
  entries,
  modelCode,
  context = {},
}: {
  entries: RedactionEntryInput[];
  modelCode: string;
  context?: Record<string, unknown>;
}) {
  return {
    feature: "report-label-redaction",
    schemaVersion: 1,
    promptVersion: REDACTION_PROMPT_VERSION,
    modelCode,
    context,
    entries,
  };
}

const textFieldSchema = {
  type: "string",
};

export const REDACTION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    schemaVersion: {
      type: "integer",
      description: "The redaction schema version. Use 1.",
    },
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: textFieldSchema,
          description: textFieldSchema,
          category: textFieldSchema,
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: textFieldSchema,
                name: textFieldSchema,
                category: textFieldSchema,
              },
              required: ["key", "name", "category"],
            },
          },
        },
        required: ["key", "description", "category", "items"],
      },
    },
  },
  required: ["schemaVersion", "entries"],
};

export const REDACTION_PROMPT = `You are SettleEase's privacy redaction assistant.

Task:
Redact only sensitive, private, embarrassing, regulated, or potentially uncomfortable expense labels for export reports.

Rules:
- Return ONLY JSON matching the response schema.
- Use only the provided input labels.
- Preserve every entry key and item key exactly.
- Do not include explanations, Markdown, or code fences.
- Do not mention people, amounts, internal IDs, or hidden fields.
- For non-sensitive labels, keep the original description and category unchanged.
- For sensitive labels, replace only the user-facing label with a neutral business-safe label.
- Keep redacted labels concise: 2 to 5 words.
- Use broad neutral categories such as General, Food, Travel, Health, Entertainment, Personal, or Other.
- Do not invent specific purchases. If unsure whether a label is sensitive, prefer a modest general label.

Sensitive examples include alcohol, tobacco, vaping, adult content, dating, nightlife, gambling, medicines, medical care, personal hygiene, private gifts, legal issues, religious or political purchases, and other labels that a participant may not want exposed in an audit PDF.

Input JSON:
{{JSON_DATA}}

Required JSON fields:
- schemaVersion: 1
- entries: array with one object per input entry
- each entry: key, description, category, items
- each item: key, name, category`;

function fallbackString(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function toItems(value: unknown): RedactedItemLabel[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const source = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
    return {
      key: fallbackString(source.key, `item-${index}`),
      name: fallbackString(source.name, `Item ${index + 1}`),
      category: fallbackString(source.category, "General"),
    };
  });
}

export function normalizeRedactionResponse(value: unknown): RedactionResponse {
  const source = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const entries = Array.isArray(source.entries) ? source.entries : [];

  return {
    schemaVersion: Number(source.schemaVersion) || 1,
    entries: entries.map((entry, index) => {
      const row = typeof entry === "object" && entry !== null ? entry as Record<string, unknown> : {};
      return {
        key: fallbackString(row.key, `expense-${index}`),
        description: fallbackString(row.description, "Misc expense"),
        category: fallbackString(row.category, "General"),
        items: toItems(row.items),
      };
    }),
  };
}

export function parseRedactionResponseText(text: string): RedactionResponse | null {
  try {
    return normalizeRedactionResponse(JSON.parse(text));
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      return normalizeRedactionResponse(JSON.parse(text.slice(start, end + 1)));
    } catch {
      return null;
    }
  }
}

export function buildRedactionPrompt(entries: RedactionEntryInput[]): string {
  return REDACTION_PROMPT.replace("{{JSON_DATA}}", JSON.stringify({ entries }, null, 2));
}
