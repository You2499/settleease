"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash, randomUUID } from "crypto";
import { ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { api as generatedApi, internal as generatedInternal } from "./_generated/api";
import { requireAuthenticatedSupabaseUserId } from "./authGuards";
import {
  DEFAULT_PRODUCTION_SUMMARY_PROMPT,
  SETTLEMENT_SUMMARY_PROMPT_NAME,
  STRUCTURED_SUMMARY_RESPONSE_SCHEMA,
  injectSummaryJsonIntoPrompt,
  parseStructuredSummaryText,
  type StructuredSettlementSummary,
} from "../src/lib/settleease/aiSummarization";
import {
  AI_CONFIG_KEY,
  buildAiModelAttemptOrder,
  getAiModelOption,
  resolveAiModelConfig,
} from "../src/lib/settleease/aiModels";
import {
  buildSettlementSummaryCacheHashInput,
  buildSettlementSummaryModelConfigFingerprint,
  SETTLEMENT_SUMMARY_CACHE_KEY_VERSION,
  versionedSettlementSummaryCacheKey,
} from "../src/lib/settleease/summaryCacheKey";
import { stableJsonStringify } from "../src/lib/settleease/stableJson";
import {
  calculatePairwiseTransactions,
  calculateSimplifiedTransactions,
} from "../src/lib/settleease/settlementCalculations";
import {
  buildPersonBalanceSnapshots,
  buildSettlementSummaryPayload,
} from "../src/lib/settleease/summaryPayload";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GENERATING_POLL_ATTEMPTS = 16;
const GENERATING_POLL_INTERVAL_MS = 500;
const api: any = generatedApi;
const internal: any = generatedInternal;

type SummarySource = "cached" | "generated";

function sha256Hex(value: unknown) {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseStoredSummary(value: string | null | undefined): StructuredSettlementSummary | null {
  if (!value) return null;
  return parseStructuredSummaryText(value);
}

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || "Failed to generate summary");
}

function summaryResponse({
  source,
  hash,
  cacheKeyVersion,
  promptVersion,
  modelCode,
  modelName,
  modelConfigFingerprint,
  payload,
  summary,
  record,
}: {
  source: SummarySource;
  hash: string;
  cacheKeyVersion: number;
  promptVersion: number;
  modelCode: string;
  modelName: string;
  modelConfigFingerprint: string;
  payload: unknown;
  summary: StructuredSettlementSummary;
  record: any;
}) {
  return {
    source,
    hash,
    cacheKeyVersion,
    promptVersion,
    modelCode,
    modelName,
    modelDisplayName: getAiModelOption(modelName || modelCode).displayName,
    modelConfigFingerprint,
    payload,
    summary,
    createdAt: record?.created_at ?? null,
    updatedAt: record?.updated_at ?? null,
  };
}

async function generateSummary({
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
  const prompt = injectSummaryJsonIntoPrompt(promptText, jsonData);
  const errors: string[] = [];

  for (const modelName of modelAttemptOrder) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1800,
          responseMimeType: "application/json",
          responseSchema: STRUCTURED_SUMMARY_RESPONSE_SCHEMA as any,
        },
      });
      const result = await model.generateContent(prompt);
      const parsed = parseStructuredSummaryText(result.response.text());
      if (!parsed) {
        throw new Error("Model returned invalid structured summary JSON");
      }
      return { summary: parsed, modelName };
    } catch (error) {
      errors.push(`${modelName}: ${normalizeError(error)}`);
      if (modelName === modelAttemptOrder[modelAttemptOrder.length - 1]) {
        throw new Error(`All AI models are currently unavailable. ${errors.join("; ")}`);
      }
    }
  }

  throw new Error("Failed to generate content with any available model.");
}

export const getOrGenerateSettlementSummary = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    await requireAuthenticatedSupabaseUserId(ctx);

    const [
      people,
      categories,
      allExpenses,
      settlementPayments,
      manualOverrides,
      activePrompt,
      rawAiConfig,
    ] = await Promise.all([
      ctx.runQuery(api.app.listPeople, {}),
      ctx.runQuery(api.app.listCategories, {}),
      ctx.runQuery(api.app.listExpenses, {}),
      ctx.runQuery(api.app.listSettlementPayments, {}),
      ctx.runQuery(api.app.listManualSettlementOverrides, {}),
      ctx.runQuery(api.app.getActiveAiPrompt, { name: SETTLEMENT_SUMMARY_PROMPT_NAME }),
      ctx.runQuery(api.app.getActiveAiConfig, { key: AI_CONFIG_KEY }),
    ]) as [any[], any[], any[], any[], any[], any, any];

    const peopleMap = Object.fromEntries(
      (people as any[]).map((person) => [person.id, person.name]),
    );
    const pairwiseTransactions = calculatePairwiseTransactions(
      people as any,
      allExpenses as any,
      settlementPayments as any,
    );
    const simplifiedTransactions = calculateSimplifiedTransactions(
      people as any,
      allExpenses as any,
      settlementPayments as any,
      manualOverrides as any,
    );
    const personBalances = buildPersonBalanceSnapshots(
      people as any,
      allExpenses as any,
      settlementPayments as any,
    );
    const payload = buildSettlementSummaryPayload({
      people: people as any,
      peopleMap,
      allExpenses: allExpenses as any,
      categories: categories as any,
      pairwiseTransactions,
      simplifiedTransactions,
      settlementPayments: settlementPayments as any,
      manualOverrides: manualOverrides as any,
      personBalances,
    });

    const aiConfig = resolveAiModelConfig(rawAiConfig as any);
    const modelAttemptOrder = buildAiModelAttemptOrder(aiConfig);
    const promptVersion: number = Number(activePrompt?.version ?? 0);
    const promptText: string = activePrompt?.prompt_text || DEFAULT_PRODUCTION_SUMMARY_PROMPT;
    const payloadSchemaVersion = Number((payload as any)?.schemaVersion ?? 0);
    const modelConfigFingerprint = buildSettlementSummaryModelConfigFingerprint(aiConfig);
    const hashInput = buildSettlementSummaryCacheHashInput({
      promptName: SETTLEMENT_SUMMARY_PROMPT_NAME,
      promptVersion,
      modelCode: aiConfig.modelCode,
      modelConfigFingerprint,
      payloadSchemaVersion,
      payload,
    });
    const hash = versionedSettlementSummaryCacheKey(sha256Hex(hashInput));

    const reserve = async (forceRegenerate = false): Promise<any> =>
      await ctx.runMutation(internal.aiSummaryCache.reserveAiSummaryGeneration, {
        dataHash: hash,
        cacheKeyVersion: SETTLEMENT_SUMMARY_CACHE_KEY_VERSION,
        payloadSchemaVersion,
        promptVersion,
        modelCode: aiConfig.modelCode,
        modelConfigFingerprint,
        generationId: randomUUID(),
        forceRegenerate,
      });

    const waitForReadyCache = async (): Promise<{ record: any; summary: StructuredSettlementSummary } | null> => {
      for (let attempt = 0; attempt < GENERATING_POLL_ATTEMPTS; attempt += 1) {
        await sleep(GENERATING_POLL_INTERVAL_MS);
        const record: any = await ctx.runQuery(internal.aiSummaryCache.getAiSummaryCacheByHash, {
          dataHash: hash,
        });
        if (record?.status === "ready") {
          const cached = parseStoredSummary(record.summary);
          if (cached) return { record, summary: cached };
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
      const cached = parseStoredSummary(reservation.record?.summary);
      if (cached) {
        return summaryResponse({
          source: "cached",
          hash,
          cacheKeyVersion: SETTLEMENT_SUMMARY_CACHE_KEY_VERSION,
          promptVersion,
          modelCode: aiConfig.modelCode,
          modelName: reservation.record?.model_name || aiConfig.modelCode,
          modelConfigFingerprint,
          payload,
          summary: cached,
          record: reservation.record,
        });
      }
      reservation = await reserve(true);
    }

    if (reservation.state === "generating") {
      const ready: { record: any; summary: StructuredSettlementSummary } | null = await waitForReadyCache();
      if (ready) {
        return summaryResponse({
          source: "cached",
          hash,
          cacheKeyVersion: SETTLEMENT_SUMMARY_CACHE_KEY_VERSION,
          promptVersion,
          modelCode: aiConfig.modelCode,
          modelName: ready.record?.model_name || aiConfig.modelCode,
          modelConfigFingerprint,
          payload,
          summary: ready.summary,
          record: ready.record,
        });
      }
      throw new ConvexError("A settlement summary is already being generated. Please try again in a moment.");
    }

    const generationId = reservation.record?.generation_id;
    if (!generationId) {
      throw new ConvexError("AI summary generation could not be reserved.");
    }

    try {
      const generated = await generateSummary({
        jsonData: payload,
        promptText,
        modelAttemptOrder,
      });
      const completed: any = await ctx.runMutation(internal.aiSummaryCache.completeAiSummaryGeneration, {
        dataHash: hash,
        generationId,
        summary: JSON.stringify(generated.summary),
        modelName: generated.modelName,
        cacheKeyVersion: SETTLEMENT_SUMMARY_CACHE_KEY_VERSION,
        payloadSchemaVersion,
        promptVersion,
        modelCode: aiConfig.modelCode,
        modelConfigFingerprint,
      });
      return summaryResponse({
        source: "generated",
        hash,
        cacheKeyVersion: SETTLEMENT_SUMMARY_CACHE_KEY_VERSION,
        promptVersion,
        modelCode: aiConfig.modelCode,
        modelName: generated.modelName,
        modelConfigFingerprint,
        payload,
        summary: generated.summary,
        record: completed,
      });
    } catch (error) {
      await ctx.runMutation(internal.aiSummaryCache.failAiSummaryGeneration, {
        dataHash: hash,
        generationId,
        error: normalizeError(error),
      });
      throw error;
    }
  },
});
