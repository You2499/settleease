export const AI_CONFIG_KEY = "global-ai-config";

export const DEFAULT_AI_MODEL_CODE = "gemini-2.0-flash";

export type AiModelCode = string;

export interface AiModelOption {
  code: AiModelCode;
  displayName: string;
  shortName: string;
  status: "Preview" | "Stable";
  freeTierLabel: string;
  paidPricingLabel?: string;
  recommendedFor: string;
  documentationUrl: string;
}

export interface AiModelConfig {
  modelCode: AiModelCode;
  fallbackModelCodes: AiModelCode[];
  updatedAt?: string | null;
  updatedByUserId?: string | null;
}

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  {
    code: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash (Recommended)",
    shortName: "2.0 Flash",
    status: "Stable",
    freeTierLabel: "Free tier: input and output free of charge",
    paidPricingLabel: "Paid Standard: $0.075 input, $0.30 output per 1M tokens",
    recommendedFor: "Default for extremely fast, highly accurate, and stable summaries and receipt parsing.",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-v2#gemini-2.0-flash",
  },
  {
    code: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    shortName: "1.5 Flash",
    status: "Stable",
    freeTierLabel: "Free tier: input and output free of charge",
    paidPricingLabel: "Paid Standard: $0.075 input, $0.30 output per 1M tokens",
    recommendedFor: "Extremely fast, stable, and low-cost fallback summaries and receipt parsing.",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-v2#gemini-1.5-flash",
  },
  {
    code: "gemini-2.0-flash-lite",
    displayName: "Gemini 2.0 Flash Lite",
    shortName: "2.0 Flash Lite",
    status: "Stable",
    freeTierLabel: "Free tier: input and output free of charge",
    recommendedFor: "Ultra-fast and highly efficient light model.",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-v2#gemini-2.0-flash-lite",
  },
  {
    code: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    shortName: "1.5 Pro",
    status: "Stable",
    freeTierLabel: "Free tier: input and output free of charge",
    paidPricingLabel: "Paid Standard: $1.25 input, $5.00 output per 1M tokens",
    recommendedFor: "High-capability model for highly complex, multi-lingual parsing and reasoning.",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-v2#gemini-1.5-pro",
  },
  {
    code: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    shortName: "2.5 Flash",
    status: "Stable",
    freeTierLabel: "Free tier: input and output free of charge",
    paidPricingLabel: "Paid Standard: $0.075 input, $0.30 output per 1M tokens",
    recommendedFor: "Modern stable fallback model.",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models",
  },
];

export function getAiModelOption(code: string | null | undefined): AiModelOption {
  const found = AI_MODEL_OPTIONS.find((model) => model.code === code);
  if (found) return found;

  const cleanCode = String(code || DEFAULT_AI_MODEL_CODE).trim();
  return {
    code: cleanCode,
    displayName: cleanCode
      .replace(/^models\//, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    shortName: cleanCode.split("-").slice(1).join(" ") || cleanCode,
    status: "Stable",
    freeTierLabel: "Fetched dynamically",
    paidPricingLabel: "Standard Google API pricing",
    recommendedFor: `Dynamic model loaded from Google Gemini API: ${cleanCode}`,
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models",
  };
}

function getDefaultFallbackModelCodes(modelCode: AiModelCode): AiModelCode[] {
  return AI_MODEL_OPTIONS
    .map((model) => model.code)
    .filter((code) => code !== modelCode);
}

export function resolveAiModelConfig(config: Partial<AiModelConfig> | null | undefined): AiModelConfig {
  const modelCode = config?.modelCode ? String(config.modelCode).trim() : DEFAULT_AI_MODEL_CODE;

  const fallbackModelCodes = Array.isArray(config?.fallbackModelCodes)
    ? config.fallbackModelCodes
        .map((code) => String(code).trim())
        .filter((code) => code !== modelCode)
    : getDefaultFallbackModelCodes(modelCode);

  const uniqueFallbacks = [...new Set(fallbackModelCodes)];

  return {
    modelCode,
    fallbackModelCodes: uniqueFallbacks.length > 0 ? uniqueFallbacks : getDefaultFallbackModelCodes(modelCode),
    updatedAt: config?.updatedAt ?? null,
    updatedByUserId: config?.updatedByUserId ?? null,
  };
}

export function buildAiModelAttemptOrder(config: AiModelConfig): AiModelCode[] {
  return [...new Set([config.modelCode, ...config.fallbackModelCodes])];
}
