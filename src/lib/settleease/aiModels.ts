export const AI_CONFIG_KEY = "global-ai-config";

export const DEFAULT_AI_MODEL_CODE = "gemini-3.1-flash-lite-preview";

export type AiModelCode =
  | "gemini-3.1-flash-lite-preview"
  | "gemini-3-flash-preview"
  | "gemini-2.5-flash";

export interface AiModelOption {
  code: AiModelCode;
  displayName: string;
  shortName: string;
  status: "Preview" | "Stable";
  freeTierLabel: string;
  paidPricingLabel: string;
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
    code: "gemini-3.1-flash-lite-preview",
    displayName: "Gemini 3.1 Flash-Lite Preview",
    shortName: "3.1 Flash-Lite",
    status: "Preview",
    freeTierLabel: "Free tier: input and output free of charge",
    paidPricingLabel: "Paid Standard: $0.25 input, $1.50 output per 1M tokens",
    recommendedFor: "Default for fast, low-cost summaries and receipt parsing.",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-preview",
  },
  {
    code: "gemini-3-flash-preview",
    displayName: "Gemini 3 Flash Preview",
    shortName: "3 Flash",
    status: "Preview",
    freeTierLabel: "Free tier: input and output free of charge",
    paidPricingLabel: "Paid Standard: $0.50 input, $3.00 output per 1M tokens",
    recommendedFor: "Optional higher-capability model for richer analysis.",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview",
  },
  {
    code: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    shortName: "2.5 Flash",
    status: "Stable",
    freeTierLabel: "Free tier: input and output free of charge",
    paidPricingLabel: "Paid Standard: $0.30 input, $2.50 output per 1M tokens",
    recommendedFor: "Stable fallback when preview-model risk is not desired.",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models",
  },
];

const AI_MODEL_CODES = AI_MODEL_OPTIONS.map((model) => model.code);

function isSupportedAiModelCode(code: unknown): code is AiModelCode {
  return typeof code === "string" && AI_MODEL_CODES.includes(code as AiModelCode);
}

export function getAiModelOption(code: string | null | undefined): AiModelOption {
  return (
    AI_MODEL_OPTIONS.find((model) => model.code === code) ||
    AI_MODEL_OPTIONS.find((model) => model.code === DEFAULT_AI_MODEL_CODE)!
  );
}

function getDefaultFallbackModelCodes(modelCode: AiModelCode): AiModelCode[] {
  return AI_MODEL_OPTIONS
    .map((model) => model.code)
    .filter((code) => code !== modelCode);
}

export function resolveAiModelConfig(config: Partial<AiModelConfig> | null | undefined): AiModelConfig {
  const modelCode = isSupportedAiModelCode(config?.modelCode)
    ? config.modelCode
    : DEFAULT_AI_MODEL_CODE;

  const fallbackModelCodes = Array.isArray(config?.fallbackModelCodes)
    ? config.fallbackModelCodes.filter(
        (code): code is AiModelCode => isSupportedAiModelCode(code) && code !== modelCode,
      )
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
