import type { AiModelConfig } from "./aiModels";
import { stableJsonStringify } from "./stableJson";

export const AI_SUMMARY_CACHE_KEY_VERSION = 3;
export const SETTLEMENT_SUMMARY_CACHE_KEY_VERSION = AI_SUMMARY_CACHE_KEY_VERSION;
export const HEALTH_LEDGER_CACHE_KEY_VERSION = AI_SUMMARY_CACHE_KEY_VERSION;

const SETTLEMENT_SUMMARY_CACHE_KEY_PREFIX = "settlement-summary:v3:";
const HEALTH_LEDGER_CACHE_KEY_PREFIX = "health-ledger:v3:";

export interface AiSummaryCacheHashInput {
  cacheKeyVersion: number;
  promptName: string;
  promptVersion: number;
  modelCode: string;
  modelConfigFingerprint: string;
  payloadSchemaVersion: number;
  payload: unknown;
}

export type SettlementSummaryCacheHashInput = AiSummaryCacheHashInput;
export type HealthLedgerCacheHashInput = AiSummaryCacheHashInput;

export function buildAiSummaryModelConfigFingerprint(config: Pick<AiModelConfig, "modelCode" | "fallbackModelCodes">): string {
  return stableJsonStringify({
    modelCode: config.modelCode,
    fallbackModelCodes: config.fallbackModelCodes,
  });
}

export const buildSettlementSummaryModelConfigFingerprint = buildAiSummaryModelConfigFingerprint;
export const buildHealthLedgerModelConfigFingerprint = buildAiSummaryModelConfigFingerprint;

export function buildAiSummaryCacheHashInput({
  promptName,
  promptVersion,
  modelCode,
  modelConfigFingerprint,
  payloadSchemaVersion,
  payload,
}: Omit<AiSummaryCacheHashInput, "cacheKeyVersion">): AiSummaryCacheHashInput {
  return {
    cacheKeyVersion: AI_SUMMARY_CACHE_KEY_VERSION,
    promptName,
    promptVersion,
    modelCode,
    modelConfigFingerprint,
    payloadSchemaVersion,
    payload,
  };
}

export const buildSettlementSummaryCacheHashInput = buildAiSummaryCacheHashInput;
export const buildHealthLedgerCacheHashInput = buildAiSummaryCacheHashInput;

export function versionedAiSummaryCacheKey(digestHex: string, prefix: string): string {
  return `${prefix}${digestHex}`;
}

export function versionedSettlementSummaryCacheKey(digestHex: string): string {
  return versionedAiSummaryCacheKey(digestHex, SETTLEMENT_SUMMARY_CACHE_KEY_PREFIX);
}

export function versionedHealthLedgerCacheKey(digestHex: string): string {
  return versionedAiSummaryCacheKey(digestHex, HEALTH_LEDGER_CACHE_KEY_PREFIX);
}
