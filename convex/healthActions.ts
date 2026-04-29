"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash, randomUUID } from "crypto";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { api as generatedApi, internal as generatedInternal } from "./_generated/api";
import { requireAuthenticatedSupabaseUserId } from "./authGuards";
import { stableJsonStringify } from "../src/lib/settleease/stableJson";
import {
  AI_CONFIG_KEY,
  buildAiModelAttemptOrder,
  resolveAiModelConfig,
} from "../src/lib/settleease/aiModels";
import {
  buildHealthLedgerCacheHashInput,
  buildHealthLedgerModelConfigFingerprint,
  HEALTH_LEDGER_CACHE_KEY_VERSION,
  versionedHealthLedgerCacheKey,
} from "../src/lib/settleease/summaryCacheKey";
import {
  DEFAULT_HEALTH_LEDGER_PROMPT,
  HEALTH_LEDGER_PROMPT_NAME,
  STRUCTURED_HEALTH_ESTIMATE_RESPONSE_SCHEMA,
  injectHealthJsonIntoPrompt,
  normalizeStructuredHealthEstimateForRows,
  parseStructuredHealthEstimateText,
  type StructuredHealthEstimate,
} from "../src/lib/settleease/aiHealth";
import {
  buildHealthChunkPayload,
  buildHealthSourceRows,
  groupHealthSourceRowsByChunk,
  HEALTH_LEDGER_PAYLOAD_SCHEMA_VERSION,
} from "../src/lib/settleease/healthPayload";
import type {
  HealthEstimatedLedgerRow,
  HealthLedgerChunkStatus,
  HealthLedgerResult,
  StructuredHealthEstimateRow,
} from "../src/lib/settleease/healthTypes";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GENERATING_POLL_ATTEMPTS = 16;
const GENERATING_POLL_INTERVAL_MS = 500;
const api: any = generatedApi;
const internal: any = generatedInternal;

function sha256Hex(value: unknown) {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || "Failed to generate health estimates");
}

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function isRowInDateRange({
  rowDate,
  startDate,
  endDate,
}: {
  rowDate: string;
  startDate: Date | null;
  endDate: Date | null;
}) {
  const date = safeDate(rowDate);
  if (!date) return false;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function computeCoveragePercent(coveredChunkCount: number, requestedChunkCount: number) {
  if (requestedChunkCount === 0) return 100;
  return Number(((coveredChunkCount / requestedChunkCount) * 100).toFixed(1));
}

function compareChunkKey(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareLedgerRow(a: HealthEstimatedLedgerRow, b: HealthEstimatedLedgerRow) {
  const dateComparison = a.date.localeCompare(b.date);
  if (dateComparison !== 0) return dateComparison;
  return a.sourceKey.localeCompare(b.sourceKey, undefined, { sensitivity: "base" });
}

function parseStoredHealthEstimate(value: string | null | undefined): StructuredHealthEstimate | null {
  if (!value) return null;
  return parseStructuredHealthEstimateText(value);
}

function buildHealthChunkDataHash({
  payload,
  promptVersion,
  modelCode,
  modelConfigFingerprint,
}: {
  payload: ReturnType<typeof buildHealthChunkPayload>;
  promptVersion: number;
  modelCode: string;
  modelConfigFingerprint: string;
}) {
  const hashInput = buildHealthLedgerCacheHashInput({
    promptName: HEALTH_LEDGER_PROMPT_NAME,
    promptVersion,
    modelCode,
    modelConfigFingerprint,
    payloadSchemaVersion: HEALTH_LEDGER_PAYLOAD_SCHEMA_VERSION,
    payload,
  });
  return versionedHealthLedgerCacheKey(sha256Hex(hashInput));
}

async function loadHealthRequestContext(ctx: any, args: { startDate?: string; endDate?: string }) {
  await requireAuthenticatedSupabaseUserId(ctx);

  const [people, allExpenses, activePrompt, rawAiConfig] = await Promise.all([
    ctx.runQuery(api.app.listPeople, {}),
    ctx.runQuery(api.app.listExpenses, {}),
    ctx.runQuery(api.app.getActiveAiPrompt, { name: HEALTH_LEDGER_PROMPT_NAME }),
    ctx.runQuery(api.app.getActiveAiConfig, { key: AI_CONFIG_KEY }),
  ]) as [any[], any[], any, any];

  const parsedStartDate = safeDate(args.startDate);
  const parsedEndDate = safeDate(args.endDate);
  const rangeStart = parsedStartDate ? startOfDay(parsedStartDate) : null;
  const rangeEnd = parsedEndDate ? endOfDay(parsedEndDate) : null;

  const sourceRows = buildHealthSourceRows({
    expenses: allExpenses as any,
    people: people as any,
  }).filter((row) => isRowInDateRange({
    rowDate: row.date,
    startDate: rangeStart,
    endDate: rangeEnd,
  }));

  const rowsByChunk = groupHealthSourceRowsByChunk(sourceRows);
  const requestedChunkKeys = [...rowsByChunk.keys()].sort(compareChunkKey);
  const aiConfig = resolveAiModelConfig(rawAiConfig as any);

  return {
    sourceRows,
    rowsByChunk,
    requestedChunkKeys,
    aiConfig,
    modelAttemptOrder: buildAiModelAttemptOrder(aiConfig),
    promptVersion: Number(activePrompt?.version ?? 0),
    promptText: activePrompt?.prompt_text || DEFAULT_HEALTH_LEDGER_PROMPT,
    modelConfigFingerprint: buildHealthLedgerModelConfigFingerprint(aiConfig),
    requestedRange: {
      startDate: rangeStart ? rangeStart.toISOString() : null,
      endDate: rangeEnd ? rangeEnd.toISOString() : null,
    },
  };
}

async function generateHealthEstimate({
  jsonData,
  promptText,
  modelAttemptOrder,
}: {
  jsonData: unknown;
  promptText: string;
  modelAttemptOrder: string[];
}) {
  if (!GEMINI_API_KEY) {
    throw new ConvexError("AI service is not configured. Please set GEMINI_API_KEY in Convex.");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const prompt = injectHealthJsonIntoPrompt(promptText, jsonData);
  const errors: string[] = [];

  for (const modelName of modelAttemptOrder) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: STRUCTURED_HEALTH_ESTIMATE_RESPONSE_SCHEMA as any,
        },
      });
      const result = await model.generateContent(prompt);
      const parsed = parseStructuredHealthEstimateText(result.response.text());
      if (!parsed) {
        throw new Error("Model returned invalid health estimate JSON");
      }
      return { summary: parsed, modelName };
    } catch (error) {
      errors.push(`${modelName}: ${normalizeError(error)}`);
      if (modelName === modelAttemptOrder[modelAttemptOrder.length - 1]) {
        throw new Error(`All AI models are currently unavailable. ${errors.join("; ")}`);
      }
    }
  }

  throw new Error("Failed to generate health estimates with any available model.");
}

async function getOrGenerateChunkEstimate({
  ctx,
  chunkKey,
  payload,
  promptVersion,
  promptText,
  modelCode,
  modelConfigFingerprint,
  modelAttemptOrder,
}: {
  ctx: any;
  chunkKey: string;
  payload: ReturnType<typeof buildHealthChunkPayload>;
  promptVersion: number;
  promptText: string;
  modelCode: string;
  modelConfigFingerprint: string;
  modelAttemptOrder: string[];
}): Promise<
  | {
      dataHash: string;
      source: "cached" | "generated";
      record: any;
      summary: StructuredHealthEstimate;
    }
  | {
      dataHash: string;
      source: "failed";
      error: string;
    }
> {
  const dataHash = buildHealthChunkDataHash({
    payload,
    promptVersion,
    modelCode,
    modelConfigFingerprint,
  });

  const reserve = async (forceRegenerate = false): Promise<any> =>
    await ctx.runMutation(internal.aiSummaryCache.reserveAiSummaryGeneration, {
      dataHash,
      cacheKeyVersion: HEALTH_LEDGER_CACHE_KEY_VERSION,
      payloadSchemaVersion: HEALTH_LEDGER_PAYLOAD_SCHEMA_VERSION,
      promptVersion,
      modelCode,
      modelConfigFingerprint,
      generationId: randomUUID(),
      forceRegenerate,
    });

  const waitForReadyCache = async (): Promise<{ record: any; summary: StructuredHealthEstimate } | null> => {
    for (let attempt = 0; attempt < GENERATING_POLL_ATTEMPTS; attempt += 1) {
      await sleep(GENERATING_POLL_INTERVAL_MS);
      const record: any = await ctx.runQuery(internal.aiSummaryCache.getAiSummaryCacheByHash, {
        dataHash,
      });
      if (record?.status === "ready") {
        const cached = parseStoredHealthEstimate(record.summary);
        if (cached) {
          return {
            record,
            summary: normalizeStructuredHealthEstimateForRows(payload.rows, cached),
          };
        }
        return null;
      }
      if (record?.status !== "generating") {
        return null;
      }
    }
    return null;
  };

  let reservation: any = await reserve(false);
  if (reservation.state === "ready") {
    const cached = parseStoredHealthEstimate(reservation.record?.summary);
    if (cached) {
      return {
        dataHash,
        source: "cached",
        record: reservation.record,
        summary: normalizeStructuredHealthEstimateForRows(payload.rows, cached),
      };
    }
    reservation = await reserve(true);
  }

  if (reservation.state === "generating") {
    const ready = await waitForReadyCache();
    if (ready) {
      return {
        dataHash,
        source: "cached",
        record: ready.record,
        summary: ready.summary,
      };
    }
    return {
      dataHash,
      source: "failed",
      error: `Health ledger generation is already in progress for ${chunkKey}.`,
    };
  }

  const generationId = reservation.record?.generation_id;
  if (!generationId) {
    return {
      dataHash,
      source: "failed",
      error: `Health ledger generation could not be reserved for ${chunkKey}.`,
    };
  }

  try {
    const generated = await generateHealthEstimate({
      jsonData: payload,
      promptText,
      modelAttemptOrder,
    });
    const normalizedSummary = normalizeStructuredHealthEstimateForRows(payload.rows, generated.summary);
    const completed: any = await ctx.runMutation(internal.aiSummaryCache.completeAiSummaryGeneration, {
      dataHash,
      generationId,
      summary: JSON.stringify(normalizedSummary),
      modelName: generated.modelName,
      cacheKeyVersion: HEALTH_LEDGER_CACHE_KEY_VERSION,
      payloadSchemaVersion: HEALTH_LEDGER_PAYLOAD_SCHEMA_VERSION,
      promptVersion,
      modelCode,
      modelConfigFingerprint,
    });

    return {
      dataHash,
      source: "generated",
      record: completed,
      summary: normalizedSummary,
    };
  } catch (error) {
    await ctx.runMutation(internal.aiSummaryCache.failAiSummaryGeneration, {
      dataHash,
      generationId,
      error: normalizeError(error),
    });

    return {
      dataHash,
      source: "failed",
      error: normalizeError(error),
    };
  }
}

export const getHealthLedger = action({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<HealthLedgerResult> => {
    const {
      sourceRows,
      rowsByChunk,
      requestedChunkKeys,
      aiConfig,
      modelAttemptOrder,
      promptVersion,
      promptText,
      modelConfigFingerprint,
      requestedRange,
    } = await loadHealthRequestContext(ctx, args);

    const chunkStatuses: HealthLedgerChunkStatus[] = [];
    const ledgerRows: HealthEstimatedLedgerRow[] = [];

    for (const chunkKey of requestedChunkKeys) {
      const chunkRows = rowsByChunk.get(chunkKey) || [];
      const payload = buildHealthChunkPayload(chunkKey, chunkRows);
      const chunkResult = await getOrGenerateChunkEstimate({
        ctx,
        chunkKey,
        payload,
        promptVersion,
        promptText,
        modelCode: aiConfig.modelCode,
        modelConfigFingerprint,
        modelAttemptOrder,
      });

      if (chunkResult.source === "failed") {
        chunkStatuses.push({
          chunkKey,
          dataHash: chunkResult.dataHash,
          rowCount: chunkRows.length,
          source: "failed",
          updatedAt: null,
          error: chunkResult.error,
        });
        continue;
      }

      const updatedAt = chunkResult.record?.updated_at ?? null;
      const estimatesByKey = new Map(
        chunkResult.summary.estimates.map((estimate: StructuredHealthEstimateRow) => [estimate.sourceKey, estimate] as const),
      );

      chunkRows.forEach((row) => {
        const estimate = estimatesByKey.get(row.sourceKey);
        if (!estimate) return;
        ledgerRows.push({
          ...row,
          ...estimate,
          updatedAt,
        });
      });

      chunkStatuses.push({
        chunkKey,
        dataHash: chunkResult.dataHash,
        rowCount: chunkRows.length,
        source: chunkResult.source,
        updatedAt,
        error: null,
      });
    }

    const coveredChunkCount = chunkStatuses.filter((status) => status.source !== "failed").length;
    const cacheHitCount = chunkStatuses.filter((status) => status.source === "cached").length;
    const generatedCount = chunkStatuses.filter((status) => status.source === "generated").length;
    const failedChunkCount = chunkStatuses.filter((status) => status.source === "failed").length;
    const qualifyingRowCount = ledgerRows.filter((row) => row.classification !== "ignore").length;
    const ignoredRowCount = ledgerRows.length - qualifyingRowCount;

    return {
      schemaVersion: 1,
      rows: ledgerRows.sort(compareLedgerRow),
      chunkStatuses,
      coverage: {
        requestedChunkCount: requestedChunkKeys.length,
        coveredChunkCount,
        missingChunkCount: Math.max(0, requestedChunkKeys.length - coveredChunkCount),
        cacheHitCount,
        generatedCount,
        failedChunkCount,
        coveragePercent: computeCoveragePercent(coveredChunkCount, requestedChunkKeys.length),
      },
      requestedRange,
      dataStats: {
        candidateRowCount: sourceRows.length,
        qualifyingRowCount,
        ignoredRowCount,
        availableMonthCount: requestedChunkKeys.length,
      },
      disclaimer:
        "Health values are AI estimates generated from expense and item text. They are not verified nutrition facts or medical guidance.",
      generatedAt: new Date().toISOString(),
    };
  },
});

export const ensureHealthChunks = action({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    regenerateFailed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const {
      rowsByChunk,
      requestedChunkKeys,
      aiConfig,
      modelAttemptOrder,
      promptVersion,
      promptText,
      modelConfigFingerprint,
      requestedRange,
    } = await loadHealthRequestContext(ctx, args);

    let cachedChunkCount = 0;
    let generatedChunkCount = 0;
    let generatingChunkCount = 0;
    let failedChunkCount = 0;
    let processedChunkCount = 0;

    for (const chunkKey of requestedChunkKeys) {
      const chunkRows = rowsByChunk.get(chunkKey) || [];
      const payload = buildHealthChunkPayload(chunkKey, chunkRows);
      const dataHash = buildHealthChunkDataHash({
        payload,
        promptVersion,
        modelCode: aiConfig.modelCode,
        modelConfigFingerprint,
      });
      const existingRecord: any = await ctx.runQuery(internal.aiSummaryCache.getAiSummaryCacheByHash, {
        dataHash,
      });

      if (existingRecord?.status === "ready") {
        const cached = parseStoredHealthEstimate(existingRecord.summary);
        if (cached) {
          cachedChunkCount += 1;
          continue;
        }
      }

      if (existingRecord?.status === "generating") {
        generatingChunkCount += 1;
        continue;
      }

      if (existingRecord?.status === "failed" && !args.regenerateFailed) {
        failedChunkCount += 1;
        continue;
      }

      processedChunkCount += 1;
      const chunkResult = await getOrGenerateChunkEstimate({
        ctx,
        chunkKey,
        payload,
        promptVersion,
        promptText,
        modelCode: aiConfig.modelCode,
        modelConfigFingerprint,
        modelAttemptOrder,
      });

      if (chunkResult.source === "generated") {
        generatedChunkCount += 1;
        continue;
      }

      if (chunkResult.source === "cached") {
        cachedChunkCount += 1;
        continue;
      }

      failedChunkCount += 1;
    }

    return {
      schemaVersion: 1,
      requestedRange,
      requestedChunkCount: requestedChunkKeys.length,
      processedChunkCount,
      cachedChunkCount,
      generatedChunkCount,
      generatingChunkCount,
      failedChunkCount,
      generatedAt: new Date().toISOString(),
    };
  },
});
