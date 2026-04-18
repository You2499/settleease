import type { AiModelConfig } from "./aiModels";
import { stableJsonStringify } from "./stableJson";

export const SETTLEMENT_SUMMARY_CACHE_KEY_VERSION = 3;
export const SETTLEMENT_SUMMARY_CACHE_KEY_PREFIX = "settlement-summary:v3:";

export interface SettlementSummaryCacheHashInput {
  cacheKeyVersion: number;
  promptName: string;
  promptVersion: number;
  modelCode: string;
  modelConfigFingerprint: string;
  payloadSchemaVersion: number;
  payload: unknown;
}

export function buildSettlementSummaryModelConfigFingerprint(config: Pick<AiModelConfig, "modelCode" | "fallbackModelCodes">): string {
  return stableJsonStringify({
    modelCode: config.modelCode,
    fallbackModelCodes: config.fallbackModelCodes,
  });
}

export function buildSettlementSummaryCacheHashInput({
  promptName,
  promptVersion,
  modelCode,
  modelConfigFingerprint,
  payloadSchemaVersion,
  payload,
}: Omit<SettlementSummaryCacheHashInput, "cacheKeyVersion">): SettlementSummaryCacheHashInput {
  return {
    cacheKeyVersion: SETTLEMENT_SUMMARY_CACHE_KEY_VERSION,
    promptName,
    promptVersion,
    modelCode,
    modelConfigFingerprint,
    payloadSchemaVersion,
    payload,
  };
}

export function versionedSettlementSummaryCacheKey(digestHex: string): string {
  return `${SETTLEMENT_SUMMARY_CACHE_KEY_PREFIX}${digestHex}`;
}
