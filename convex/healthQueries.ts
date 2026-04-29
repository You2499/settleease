"use strict";

import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuthenticatedSupabaseUserId } from "./authGuards";
import {
  AI_CONFIG_KEY,
  resolveAiModelConfig,
} from "../src/lib/settleease/aiModels";
import {
  DEFAULT_HEALTH_LEDGER_PROMPT,
  HEALTH_LEDGER_PROMPT_NAME,
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
  buildHealthSurfaceState,
  type HealthResolvedDateRange,
} from "../src/lib/settleease/healthSurfaceModel";
import { sha256Hex } from "../src/lib/settleease/sha256";
import {
  buildHealthLedgerCacheHashInput,
  buildHealthLedgerModelConfigFingerprint,
  HEALTH_LEDGER_CACHE_KEY_VERSION,
  versionedHealthLedgerCacheKey,
} from "../src/lib/settleease/summaryCacheKey";
import type { Expense, Person } from "../src/lib/settleease/types";
import type {
  HealthChunkAvailability,
  HealthChunkAvailabilityResult,
  HealthChunkAvailabilitySummary,
  HealthEstimatedLedgerRow,
  HealthGranularity,
  HealthSurfaceCoverage,
  HealthSurfaceId,
  HealthSurfaceState,
} from "../src/lib/settleease/healthTypes";

const HEALTH_DISCLAIMER =
  "Health values are AI estimates generated from expense and item text. They are not verified nutrition facts or medical guidance.";

type HealthChunkDefinition = {
  chunkKey: string;
  dataHash: string;
  payload: ReturnType<typeof buildHealthChunkPayload>;
  rows: ReturnType<typeof buildHealthSourceRows>;
  rowCount: number;
};

type ResolvedChunkAvailability = HealthChunkAvailability & {
  summary: StructuredHealthEstimate | null;
};

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareChunkKey(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
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

function personDto(person: any): Person {
  return {
    id: person._id,
    name: person.name,
    created_at: person.createdAt,
  };
}

function expenseDto(expense: any): Expense {
  return {
    id: expense._id,
    description: expense.description,
    total_amount: expense.totalAmount,
    category: expense.category,
    paid_by: expense.paidBy,
    split_method: expense.splitMethod,
    shares: expense.shares,
    items: expense.items ?? undefined,
    celebration_contribution: expense.celebrationContribution ?? null,
    exclude_from_settlement: expense.excludeFromSettlement ?? false,
    created_at: expense.createdAt,
    updated_at: expense.updatedAt,
  };
}

function buildResolvedDateRange(startDate: Date | null, endDate: Date | null): HealthResolvedDateRange {
  if (!startDate && !endDate) {
    return {
      preset: "all",
      label: "All time",
      isAllTime: true,
      startDate: null,
      endDate: null,
    };
  }

  return {
    preset: "all",
    label: "Selected range",
    isAllTime: false,
    startDate,
    endDate,
  };
}

async function prepareHealthRequest(ctx: any, args: { startDate?: string; endDate?: string }) {
  await requireAuthenticatedSupabaseUserId(ctx);

  const [peopleDocs, expenseDocs, activePrompt, rawAiConfig] = await Promise.all([
    ctx.db.query("people").collect(),
    ctx.db.query("expenses").collect(),
    ctx.db
      .query("aiPrompts")
      .withIndex("by_name_active", (q: any) => q.eq("name", HEALTH_LEDGER_PROMPT_NAME).eq("isActive", true))
      .first(),
    ctx.db
      .query("aiConfigs")
      .withIndex("by_key", (q: any) => q.eq("key", AI_CONFIG_KEY))
      .first(),
  ]);

  const people = peopleDocs
    .map(personDto)
    .sort((a: Person, b: Person) => compareText(a.name, b.name));
  const expenses = expenseDocs.map(expenseDto);
  const parsedStartDate = safeDate(args.startDate);
  const parsedEndDate = safeDate(args.endDate);
  const rangeStart = parsedStartDate ? startOfDay(parsedStartDate) : null;
  const rangeEnd = parsedEndDate ? endOfDay(parsedEndDate) : null;
  const sourceRows = buildHealthSourceRows({
    expenses,
    people,
  }).filter((row) => isRowInDateRange({
    rowDate: row.date,
    startDate: rangeStart,
    endDate: rangeEnd,
  }));

  const rowsByChunk = groupHealthSourceRowsByChunk(sourceRows);
  const requestedChunkKeys = [...rowsByChunk.keys()].sort(compareChunkKey);
  const aiConfig = resolveAiModelConfig(rawAiConfig);
  const promptVersion = Number(activePrompt?.version ?? 0);
  const modelConfigFingerprint = buildHealthLedgerModelConfigFingerprint(aiConfig);
  const chunkDefinitions: HealthChunkDefinition[] = [];

  for (const chunkKey of requestedChunkKeys) {
    const chunkRows = rowsByChunk.get(chunkKey) || [];
    const payload = buildHealthChunkPayload(chunkKey, chunkRows);
    const dataHash = versionedHealthLedgerCacheKey(await sha256Hex(buildHealthLedgerCacheHashInput({
      promptName: HEALTH_LEDGER_PROMPT_NAME,
      promptVersion,
      modelCode: aiConfig.modelCode,
      modelConfigFingerprint,
      payloadSchemaVersion: HEALTH_LEDGER_PAYLOAD_SCHEMA_VERSION,
      payload,
    })));

    chunkDefinitions.push({
      chunkKey,
      dataHash,
      payload,
      rows: chunkRows,
      rowCount: chunkRows.length,
    });
  }

  return {
    people,
    peopleMap: Object.fromEntries(people.map((person: Person) => [person.id, person.name])),
    sourceRows,
    chunkDefinitions,
    requestedRange: {
      startDate: rangeStart ? rangeStart.toISOString() : null,
      endDate: rangeEnd ? rangeEnd.toISOString() : null,
    },
    dateRange: buildResolvedDateRange(rangeStart, rangeEnd),
    disclaimer: HEALTH_DISCLAIMER,
  };
}

async function resolveChunkAvailability(
  ctx: any,
  chunkDefinitions: HealthChunkDefinition[],
): Promise<ResolvedChunkAvailability[]> {
  const chunks: ResolvedChunkAvailability[] = [];

  for (const chunk of chunkDefinitions) {
    const record = await ctx.db
      .query("aiSummaries")
      .withIndex("by_data_hash", (q: any) => q.eq("dataHash", chunk.dataHash))
      .first();

    if (!record || record.cacheKeyVersion !== HEALTH_LEDGER_CACHE_KEY_VERSION) {
      chunks.push({
        chunkKey: chunk.chunkKey,
        dataHash: chunk.dataHash,
        rowCount: chunk.rowCount,
        status: "missing",
        updatedAt: null,
        error: null,
        summary: null,
      });
      continue;
    }

    if (record.status === "generating") {
      chunks.push({
        chunkKey: chunk.chunkKey,
        dataHash: chunk.dataHash,
        rowCount: chunk.rowCount,
        status: "generating",
        updatedAt: record.updatedAt ?? null,
        error: null,
        summary: null,
      });
      continue;
    }

    if (record.status === "failed") {
      chunks.push({
        chunkKey: chunk.chunkKey,
        dataHash: chunk.dataHash,
        rowCount: chunk.rowCount,
        status: "failed",
        updatedAt: record.updatedAt ?? null,
        error: record.lastError ?? "Failed to generate health estimates.",
        summary: null,
      });
      continue;
    }

    const parsed = parseStructuredHealthEstimateText(record.summary || "");
    if (!parsed) {
      chunks.push({
        chunkKey: chunk.chunkKey,
        dataHash: chunk.dataHash,
        rowCount: chunk.rowCount,
        status: "failed",
        updatedAt: record.updatedAt ?? null,
        error: "Stored health estimate could not be parsed.",
        summary: null,
      });
      continue;
    }

    chunks.push({
      chunkKey: chunk.chunkKey,
      dataHash: chunk.dataHash,
      rowCount: chunk.rowCount,
      status: "ready",
      updatedAt: record.updatedAt ?? null,
      error: null,
      summary: normalizeStructuredHealthEstimateForRows(chunk.rows, parsed),
    });
  }

  return chunks;
}

function buildCoverageSummary({
  sourceRows,
  chunks,
}: {
  sourceRows: ReturnType<typeof buildHealthSourceRows>;
  chunks: ResolvedChunkAvailability[];
}): HealthChunkAvailabilitySummary {
  const requestedChunkCount = chunks.length;
  const readyChunkCount = chunks.filter((chunk) => chunk.status === "ready").length;
  const generatingChunkCount = chunks.filter((chunk) => chunk.status === "generating").length;
  const failedChunkCount = chunks.filter((chunk) => chunk.status === "failed").length;
  const missingChunkCount = chunks.filter((chunk) => chunk.status === "missing").length;
  const activeChunkLabel = chunks.find((chunk) => chunk.status === "generating")?.chunkKey
    || chunks.find((chunk) => chunk.status === "missing")?.chunkKey
    || chunks.find((chunk) => chunk.status === "failed")?.chunkKey
    || null;

  return {
    requestedChunkCount,
    readyChunkCount,
    generatingChunkCount,
    failedChunkCount,
    missingChunkCount,
    coveragePercent: requestedChunkCount === 0
      ? 100
      : Number(((readyChunkCount / requestedChunkCount) * 100).toFixed(1)),
    candidateRowCount: sourceRows.length,
    availableMonthCount: requestedChunkCount,
    activeChunkLabel,
  };
}

function toSurfaceCoverage(summary: HealthChunkAvailabilitySummary): HealthSurfaceCoverage {
  return { ...summary };
}

function loadReadyLedgerRows(
  chunkDefinitions: HealthChunkDefinition[],
  chunks: ResolvedChunkAvailability[],
): HealthEstimatedLedgerRow[] {
  const rows: HealthEstimatedLedgerRow[] = [];

  chunkDefinitions.forEach((chunk) => {
    const availability = chunks.find((entry) => entry.chunkKey === chunk.chunkKey);
    if (!availability || availability.status !== "ready" || !availability.summary) return;

    const estimatesByKey = new Map(
      availability.summary.estimates.map((estimate) => [estimate.sourceKey, estimate] as const),
    );

    chunk.rows.forEach((row) => {
      const estimate = estimatesByKey.get(row.sourceKey);
      if (!estimate) return;
      rows.push({
        ...row,
        ...estimate,
        updatedAt: availability.updatedAt,
      });
    });
  });

  return rows.sort((a, b) =>
    a.date.localeCompare(b.date) || a.sourceKey.localeCompare(b.sourceKey, undefined, { sensitivity: "base" }),
  );
}

function firstChunkError(chunks: ResolvedChunkAvailability[]) {
  return chunks.find((chunk) => chunk.status === "failed" && chunk.error)?.error || null;
}

const healthSurfaceId = v.union(
  v.literal("overviewCalories"),
  v.literal("overviewMacros"),
  v.literal("overviewAlcohol"),
  v.literal("trustAndCoverage"),
  v.literal("calorieRhythm"),
  v.literal("macroRhythm"),
  v.literal("alcoholRhythm"),
  v.literal("sourceSplit"),
  v.literal("topCategories"),
  v.literal("topContributors"),
  v.literal("participantLens"),
  v.literal("ledgerList"),
);

const healthMode = v.union(v.literal("group"), v.literal("personal"));
const healthGranularity = v.union(v.literal("weekly"), v.literal("monthly"));

export const getHealthChunkAvailability = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<HealthChunkAvailabilityResult> => {
    const prepared = await prepareHealthRequest(ctx, args);
    const chunks = await resolveChunkAvailability(ctx, prepared.chunkDefinitions);
    const summary = buildCoverageSummary({
      sourceRows: prepared.sourceRows,
      chunks,
    });

    return {
      schemaVersion: 1,
      chunks: chunks.map(({ summary: _summary, ...chunk }) => chunk),
      summary,
      requestedRange: prepared.requestedRange,
      disclaimer: prepared.disclaimer,
      generatedAt: new Date().toISOString(),
    };
  },
});

export const getHealthSurfaceState = query({
  args: {
    surfaceId: healthSurfaceId,
    mode: healthMode,
    selectedPersonId: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    granularity: v.optional(healthGranularity),
  },
  handler: async (ctx, args): Promise<HealthSurfaceState> => {
    const prepared = await prepareHealthRequest(ctx, {
      startDate: args.startDate,
      endDate: args.endDate,
    });
    const chunks = await resolveChunkAvailability(ctx, prepared.chunkDefinitions);
    const coverage = toSurfaceCoverage(buildCoverageSummary({
      sourceRows: prepared.sourceRows,
      chunks,
    }));
    const readyLedgerRows = loadReadyLedgerRows(prepared.chunkDefinitions, chunks);
    const ignoredEntryCount = readyLedgerRows.filter((row) => row.classification === "ignore").length;

    return buildHealthSurfaceState({
      surfaceId: args.surfaceId as HealthSurfaceId,
      rows: readyLedgerRows,
      people: prepared.people,
      peopleMap: prepared.peopleMap,
      mode: args.mode,
      selectedPersonId: args.selectedPersonId ?? null,
      granularity: (args.granularity ?? "weekly") as HealthGranularity,
      dateRange: prepared.dateRange,
      coverage,
      requestedRange: prepared.requestedRange,
      disclaimer: prepared.disclaimer,
      ignoredEntryCount,
      error: firstChunkError(chunks),
    });
  },
});
