"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash, randomUUID } from "crypto";
import { ConvexError, v } from "convex/values";
import { action, internalAction } from "./_generated/server";
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
import {
  AI_CLEAN_CATALOG_RESPONSE_SCHEMA,
  DEFAULT_AI_CLEAN_CATALOG_PROMPT,
  injectCleanCatalogPrompt,
} from "../src/lib/settleease/aiCleanCatalog";
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

function parseAiError(error: unknown): { message: string; type: "transient" | "permanent" } {
  const message = error instanceof Error ? error.message : String(error || "");
  const lowerMsg = message.toLowerCase();
  
  if (
    lowerMsg.includes("429") ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("resource_exhausted") ||
    lowerMsg.includes("503") ||
    lowerMsg.includes("overloaded") ||
    lowerMsg.includes("unavailable") ||
    lowerMsg.includes("timeout") ||
    lowerMsg.includes("abort") ||
    lowerMsg.includes("fetch") ||
    lowerMsg.includes("econnreset") ||
    lowerMsg.includes("network")
  ) {
    return { message, type: "transient" };
  }
  
  return { message, type: "permanent" };
}

async function verifyModelCapability(ctx: any, modelName: string): Promise<boolean> {
  try {
    // 1. Check database for existing capability check record
    const record = await ctx.runQuery(internal.aiSummaryCache.getAiModelCapability, {
      modelCode: modelName,
    });
    
    // 24-hour expiration for capability records
    const verifiedTtlMs = 24 * 60 * 60 * 1000;
    const isStale = record
      ? Date.now() - Date.parse(record.checkedAt) > verifiedTtlMs
      : true;

    if (record !== null && !isStale) {
      return record.verified;
    }

    // 2. If no record exists, run a dynamic capability check
    if (!GEMINI_API_KEY) {
      return false;
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 16,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
          },
          required: ["success"],
        } as any,
      },
    });

    const startTime = Date.now();
    const testPrompt = 'Return JSON matching the schema: {"success": true}';
    const result = await model.generateContent(testPrompt);
    const text = result.response.text().trim();
    const latencyMs = Date.now() - startTime;

    let isVerified = false;
    try {
      const parsed = JSON.parse(text);
      isVerified = !!(parsed && parsed.success === true);
    } catch {
      isVerified = false;
    }

    await ctx.runMutation(internal.aiSummaryCache.storeAiModelCapability, {
      modelCode: modelName,
      verified: isVerified,
      latencyMs,
      errorDetails: isVerified ? null : "Dummy schema check returned invalid structure",
    });
    return isVerified;
  } catch (error) {
    const parsedErr = parseAiError(error);
    console.warn(`Dynamic capability check failed for model ${modelName}:`, parsedErr.message);

    if (parsedErr.type === "transient") {
      // Return true for transient errors to preserve retries
      return true;
    }

    await ctx.runMutation(internal.aiSummaryCache.storeAiModelCapability, {
      modelCode: modelName,
      verified: false,
      errorDetails: parsedErr.message,
    }).catch(() => {});
    return false;
  }
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
      modelAttemptOrder: rawModelAttemptOrder,
      promptVersion,
      promptText,
      modelConfigFingerprint,
      requestedRange,
    } = await loadHealthRequestContext(ctx, args);

    // Dynamic model verification check
    const modelAttemptOrder: string[] = [];
    for (const modelName of rawModelAttemptOrder) {
      const isVerified = await verifyModelCapability(ctx, modelName);
      if (isVerified) {
        modelAttemptOrder.push(modelName);
      } else {
        console.warn(`Bypassing unverified AI model: ${modelName}`);
      }
    }
    if (modelAttemptOrder.length === 0) {
      throw new ConvexError("No verified AI models are available. Please check configured model capabilities.");
    }

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
      modelAttemptOrder: rawModelAttemptOrder,
      promptVersion,
      promptText,
      modelConfigFingerprint,
      requestedRange,
    } = await loadHealthRequestContext(ctx, args);

    // Dynamic model verification check
    const modelAttemptOrder: string[] = [];
    for (const modelName of rawModelAttemptOrder) {
      const isVerified = await verifyModelCapability(ctx, modelName);
      if (isVerified) {
        modelAttemptOrder.push(modelName);
      } else {
        console.warn(`Bypassing unverified AI model: ${modelName}`);
      }
    }
    if (modelAttemptOrder.length === 0) {
      throw new ConvexError("No verified AI models are available. Please check configured model capabilities.");
    }


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

export const listAvailableModels = action({
  args: {},
  handler: async (
    ctx
  ): Promise<
    Array<{
      code: string;
      displayName: string;
      description: string;
      inputTokenLimit: number;
      outputTokenLimit: number;
    }>
  > => {
    await requireAuthenticatedSupabaseUserId(ctx);
    if (!GEMINI_API_KEY) {
      throw new ConvexError("GEMINI_API_KEY is not configured.");
    }

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models",
        {
          headers: {
            "x-goog-api-key": GEMINI_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to fetch models from Google API: ${response.statusText}`
        );
      }
      const data: any = await response.json();
      if (!data || !Array.isArray(data.models)) {
        throw new Error("Invalid response from Google API");
      }

      return data.models
        .filter(
          (model: any) =>
            Array.isArray(model.supportedGenerationMethods) &&
            model.supportedGenerationMethods.includes("generateContent") &&
            model.name.includes("gemini")
        )
        .map((model: any) => {
          const code = model.name.replace(/^models\//, "");
          return {
            code,
            displayName: model.displayName || code,
            description: model.description || "",
            inputTokenLimit: Number(model.inputTokenLimit) || 0,
            outputTokenLimit: Number(model.outputTokenLimit) || 0,
          };
        })
        .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
    } catch (error) {
      console.error("Error listing available models:", error);
      throw new ConvexError(`Failed to retrieve models: ${normalizeError(error)}`);
    }
  },
});

export const probeModelCapability = action({
  args: {
    modelCode: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    error: string | null;
    features: {
      textGeneration: boolean;
      structuredOutput: boolean;
    };
    latencyMs: number;
  }> => {
    await requireAuthenticatedSupabaseUserId(ctx);

    if (!GEMINI_API_KEY) {
      return {
        success: false,
        error: "GEMINI_API_KEY environment variable is missing on Convex.",
        features: {
          textGeneration: false,
          structuredOutput: false,
        },
        latencyMs: 0,
      };
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const startTime = Date.now();

    try {
      // Step 1: Probe structured output JSON schema support
      const model = genAI.getGenerativeModel({
        model: args.modelCode,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 15,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              status: { type: "string" },
            },
            required: ["status"],
          } as any,
        },
      });

      const response = await model.generateContent("Respond with JSON object: {\"status\": \"ok\"}");
      const text = response.response.text();
      const latencyMs = Date.now() - startTime;

      let parsed = null;
      try {
        parsed = JSON.parse(text.trim());
      } catch (e) {
        // Parsing failed
      }

      const isVerified = !!(parsed && parsed.status === "ok");
      
      // Cache verified results in db
      await ctx.runMutation(internal.aiSummaryCache.storeAiModelCapability, {
        modelCode: args.modelCode,
        verified: isVerified,
      });

      if (isVerified) {
        return {
          success: true,
          error: null,
          features: {
            textGeneration: true,
            structuredOutput: true,
          },
          latencyMs,
        };
      } else {
        return {
          success: true,
          error: "Model succeeded but failed to generate structured JSON conforming to the schema.",
          features: {
            textGeneration: true,
            structuredOutput: false,
          },
          latencyMs,
        };
      }
    } catch (error: any) {
      // Step 2: Fallback to basic text generation check if structured schemas fail or are unsupported
      try {
        const textModel = genAI.getGenerativeModel({
          model: args.modelCode,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10,
          },
        });
        
        await textModel.generateContent("Say 'ok'");
        const latencyMs = Date.now() - startTime;

        // Cache unverified structured support state
        await ctx.runMutation(internal.aiSummaryCache.storeAiModelCapability, {
          modelCode: args.modelCode,
          verified: false,
        });

        return {
          success: true,
          error: "JSON schema is unsupported or failed validation. Basic text generation is operational.",
          features: {
            textGeneration: true,
            structuredOutput: false,
          },
          latencyMs,
        };
      } catch (textError: any) {
        const latencyMs = Date.now() - startTime;
        
        // Cache completely failed capability state
        await ctx.runMutation(internal.aiSummaryCache.storeAiModelCapability, {
          modelCode: args.modelCode,
          verified: false,
        });

        return {
          success: false,
          error: textError?.message || error?.message || "Model failed to respond to API check.",
          features: {
            textGeneration: false,
            structuredOutput: false,
          },
          latencyMs,
        };
      }
    }
  },
});

export const runAiDiagnosticsInternal = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    modelsTested: number;
    modelsVerified: number;
    promotedModel: string | null;
    fallbacks: string[];
    log: string[];
  }> => {
    const log: string[] = [];
    if (!GEMINI_API_KEY) {
      return {
        success: false,
        modelsTested: 0,
        modelsVerified: 0,
        promotedModel: null,
        fallbacks: [],
        log: ["GEMINI_API_KEY is not configured."],
      };
    }

    log.push("Starting AI model diagnostics...");
    let googleModels: any[] = [];
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models",
        {
          headers: {
            "x-goog-api-key": GEMINI_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Google API returned status ${response.status}: ${response.statusText}`);
      }
      const data: any = await response.json();
      if (data && Array.isArray(data.models)) {
        googleModels = data.models;
      }
    } catch (err: any) {
      log.push(`Failed to fetch models: ${err.message}`);
      return {
        success: false,
        modelsTested: 0,
        modelsVerified: 0,
        promotedModel: null,
        fallbacks: [],
        log,
      };
    }

    // Filter standard Gemini models
    const candidates = googleModels
      .filter((m: any) => {
        const name = m.name.replace(/^models\//, "");
        return (
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes("generateContent") &&
          name.includes("gemini") &&
          !name.includes("vision") &&
          !name.includes("embedding") &&
          !name.includes("nano") &&
          !name.includes("bidi") &&
          !name.includes("lyria") &&
          !name.includes("veo") &&
          !name.includes("robotics")
        );
      })
      .map((m: any) => m.name.replace(/^models\//, ""));

    log.push(`Found ${candidates.length} standard Gemini model candidates: ${candidates.join(", ")}`);

    const verifiedModels: Array<{
      code: string;
      latencyMs: number;
      tierScore: number;
    }> = [];

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    for (const code of candidates) {
      log.push(`Testing model: ${code}...`);
      const startTime = Date.now();
      try {
        // Probe 1: Dummy JSON output check
        const dummyModel = genAI.getGenerativeModel({
          model: code,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: { success: { type: "boolean" } },
              required: ["success"],
            } as any,
          },
        });
        const dummyRes = await dummyModel.generateContent('Return JSON matching the schema: {"success": true}');
        const dummyText = dummyRes.response.text().trim();
        const dummyParsed = JSON.parse(dummyText);
        if (!dummyParsed || dummyParsed.success !== true) {
          throw new Error("Probe 1 failed: invalid structured output JSON");
        }

        // Probe 2: Catalog Cleaner dry run
        const mockObs = [
          { id: "obs-1", itemName: "Organic Whole Milk 1L", expenseDescription: "Grocery shopping", price: 2.5, date: "2026-06-01", categoryName: null },
          { id: "obs-2", itemName: "Craft IPA Beer bottle", expenseDescription: "Drinks with friends", price: 4.5, date: "2026-06-02", categoryName: null },
        ];
        const mockAllowedCats = ["Groceries", "Entertainment", "Other"];
        const catalogPrompt = injectCleanCatalogPrompt(DEFAULT_AI_CLEAN_CATALOG_PROMPT, mockAllowedCats, mockObs);
        const catalogModel = genAI.getGenerativeModel({
          model: code,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            responseSchema: AI_CLEAN_CATALOG_RESPONSE_SCHEMA as any,
          },
        });
        const catalogRes = await catalogModel.generateContent(catalogPrompt);
        const catalogText = catalogRes.response.text().trim();
        const catalogParsed = JSON.parse(catalogText);
        if (!catalogParsed || !Array.isArray(catalogParsed.canonicalItems)) {
          throw new Error("Probe 2 failed: invalid catalog cleaner response structure");
        }

        // Probe 3: Health Ledger dry run
        const mockHealthRows = [
          { sourceKey: "row-1", date: "2026-06-01", description: "Organic Whole Milk 1L", category: "Groceries", quantity: 1, unitPrice: 2.5, price: 2.5, personName: "Alice" },
          { sourceKey: "row-2", date: "2026-06-02", description: "Craft IPA Beer bottle", category: "Entertainment", quantity: 1, unitPrice: 4.5, price: 4.5, personName: "Bob" }
        ];
        const mockPayload = buildHealthChunkPayload("2026-06", mockHealthRows as any);
        const healthPrompt = injectHealthJsonIntoPrompt(DEFAULT_HEALTH_LEDGER_PROMPT, mockPayload);
        const healthModel = genAI.getGenerativeModel({
          model: code,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: STRUCTURED_HEALTH_ESTIMATE_RESPONSE_SCHEMA as any,
          },
        });
        const healthRes = await healthModel.generateContent(healthPrompt);
        const healthText = healthRes.response.text().trim();
        const healthParsed = JSON.parse(healthText);
        if (!healthParsed || !Array.isArray(healthParsed.estimates)) {
          throw new Error("Probe 3 failed: invalid health estimate response structure");
        }

        const latencyMs = Date.now() - startTime;
        log.push(`✅ Model ${code} successfully passed all checks. Latency: ${latencyMs}ms`);

        // Compute tier score: Flash (3) > Lite (2) > Pro (1) > Other (0)
        let tierScore = 0;
        if (code.includes("2.5-flash") || code.includes("3.1-flash")) {
          tierScore = 3;
        } else if (code.includes("flash-lite") || code.includes("lite")) {
          tierScore = 2;
        } else if (code.includes("2.5-pro") || code.includes("pro")) {
          tierScore = 1;
        }

        verifiedModels.push({ code, latencyMs, tierScore });

        // Update capability table
        await ctx.runMutation(internal.aiSummaryCache.storeAiModelCapability, {
          modelCode: code,
          verified: true,
          latencyMs,
          errorDetails: null,
        });

      } catch (err: any) {
        const parsedErr = parseAiError(err);
        log.push(`❌ Model ${code} failed: ${parsedErr.message} (${parsedErr.type})`);

        if (parsedErr.type === "permanent") {
          await ctx.runMutation(internal.aiSummaryCache.storeAiModelCapability, {
            modelCode: code,
            verified: false,
            latencyMs: 0,
            errorDetails: parsedErr.message,
          }).catch(() => {});
        }
      }
    }

    if (verifiedModels.length === 0) {
      log.push("No models were successfully verified.");
      return {
        success: false,
        modelsTested: candidates.length,
        modelsVerified: 0,
        promotedModel: null,
        fallbacks: [],
        log,
      };
    }

    // Rank verified models: Tier score descending, latency ascending
    verifiedModels.sort((a, b) => {
      if (b.tierScore !== a.tierScore) {
        return b.tierScore - a.tierScore;
      }
      return a.latencyMs - b.latencyMs;
    });

    const primary = verifiedModels[0].code;
    const fallbacks = verifiedModels.slice(1, 3).map((m) => m.code);

    log.push(`Promoting primary model: ${primary}`);
    log.push(`Configuring fallbacks: ${fallbacks.join(", ")}`);

    await ctx.runMutation(internal.aiSummaryCache.updateAiConfigInternal, {
      modelCode: primary,
      fallbackModelCodes: fallbacks,
    });

    return {
      success: true,
      modelsTested: candidates.length,
      modelsVerified: verifiedModels.length,
      promotedModel: primary,
      fallbacks,
      log,
    };
  },
});

export const runAiDiagnostics = action({
  args: {},
  handler: async (ctx) => {
    const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
    const profile = await ctx.runQuery(api.app.getUserProfile, { supabaseUserId });
    if (profile?.role !== "admin") {
      throw new ConvexError("Admin access required.");
    }
    return await ctx.runAction(internal.healthActions.runAiDiagnosticsInternal, {});
  },
});
