import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

function normalizeSupabaseUserId(value: string) {
  return value.trim().toLowerCase();
}

async function requireAuthenticatedSupabaseUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    throw new ConvexError("Authentication required.");
  }
  const supabaseUserId = normalizeSupabaseUserId(identity.subject);
  if (!supabaseUserId) {
    throw new ConvexError("Authentication required.");
  }
  return supabaseUserId;
}

const GENERATION_STALE_AFTER_MS = 2 * 60 * 1000;
const nowIso = () => new Date().toISOString();

function aiSummaryDto(summary: any) {
  if (!summary) return null;
  return {
    id: summary._id,
    user_id: summary.userId,
    data_hash: summary.dataHash,
    summary: summary.summary,
    model_name: summary.modelName ?? null,
    cache_key_version: summary.cacheKeyVersion ?? null,
    payload_schema_version: summary.payloadSchemaVersion ?? null,
    prompt_version: summary.promptVersion ?? null,
    model_code: summary.modelCode ?? null,
    model_config_fingerprint: summary.modelConfigFingerprint ?? null,
    status: summary.status ?? null,
    generation_id: summary.generationId ?? null,
    last_error: summary.lastError ?? null,
    created_at: summary.createdAt,
    updated_at: summary.updatedAt,
  };
}

export const getAiSummaryCacheByHash = internalQuery({
  args: { dataHash: v.string() },
  handler: async (ctx, args) => {
    await requireAuthenticatedSupabaseUserId(ctx);
    const existing = await ctx.db
      .query("aiSummaries")
      .withIndex("by_data_hash", (q) => q.eq("dataHash", args.dataHash))
      .first();
    return aiSummaryDto(existing);
  },
});

export const reserveAiSummaryGeneration = internalMutation({
  args: {
    dataHash: v.string(),
    cacheKeyVersion: v.number(),
    payloadSchemaVersion: v.number(),
    promptVersion: v.number(),
    modelCode: v.string(),
    modelConfigFingerprint: v.string(),
    generationId: v.string(),
    forceRegenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
    const existing = await ctx.db
      .query("aiSummaries")
      .withIndex("by_data_hash", (q) => q.eq("dataHash", args.dataHash))
      .first();
    const timestamp = nowIso();
    const metadata = {
      userId: supabaseUserId,
      cacheKeyVersion: args.cacheKeyVersion,
      payloadSchemaVersion: args.payloadSchemaVersion,
      promptVersion: args.promptVersion,
      modelCode: args.modelCode,
      modelConfigFingerprint: args.modelConfigFingerprint,
      updatedAt: timestamp,
    };

    if (existing && existing.status === "ready" && !args.forceRegenerate) {
      return { state: "ready", record: aiSummaryDto(existing) };
    }

    if (
      existing &&
      existing.status === "generating" &&
      existing.generationId &&
      !args.forceRegenerate
    ) {
      const updatedAt = Date.parse(existing.updatedAt ?? "");
      const isStale = Number.isFinite(updatedAt)
        ? Date.now() - updatedAt > GENERATION_STALE_AFTER_MS
        : true;
      if (!isStale) {
        return { state: "generating", record: aiSummaryDto(existing) };
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...metadata,
        status: "generating",
        generationId: args.generationId,
        lastError: null,
      });
      return {
        state: "reserved",
        record: aiSummaryDto({
          ...existing,
          ...metadata,
          status: "generating",
          generationId: args.generationId,
          lastError: null,
        }),
      };
    }

    const id = await ctx.db.insert("aiSummaries", {
      ...metadata,
      dataHash: args.dataHash,
      summary: "",
      modelName: null,
      status: "generating",
      generationId: args.generationId,
      lastError: null,
      createdAt: timestamp,
    });
    return {
      state: "reserved",
      record: aiSummaryDto(await ctx.db.get(id)),
    };
  },
});

export const completeAiSummaryGeneration = internalMutation({
  args: {
    dataHash: v.string(),
    generationId: v.string(),
    summary: v.string(),
    modelName: v.string(),
    cacheKeyVersion: v.number(),
    payloadSchemaVersion: v.number(),
    promptVersion: v.number(),
    modelCode: v.string(),
    modelConfigFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
    const existing = await ctx.db
      .query("aiSummaries")
      .withIndex("by_data_hash", (q) => q.eq("dataHash", args.dataHash))
      .first();
    if (!existing) {
      throw new ConvexError("AI summary reservation was not found.");
    }
    if (existing.generationId !== args.generationId) {
      throw new ConvexError("AI summary reservation was claimed by another request.");
    }
    const timestamp = nowIso();
    await ctx.db.patch(existing._id, {
      userId: supabaseUserId,
      summary: args.summary,
      modelName: args.modelName,
      cacheKeyVersion: args.cacheKeyVersion,
      payloadSchemaVersion: args.payloadSchemaVersion,
      promptVersion: args.promptVersion,
      modelCode: args.modelCode,
      modelConfigFingerprint: args.modelConfigFingerprint,
      status: "ready",
      generationId: null,
      lastError: null,
      updatedAt: timestamp,
    });
    return aiSummaryDto(await ctx.db.get(existing._id));
  },
});

export const failAiSummaryGeneration = internalMutation({
  args: {
    dataHash: v.string(),
    generationId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedSupabaseUserId(ctx);
    const existing = await ctx.db
      .query("aiSummaries")
      .withIndex("by_data_hash", (q) => q.eq("dataHash", args.dataHash))
      .first();
    if (!existing || existing.generationId !== args.generationId) {
      return null;
    }
    const timestamp = nowIso();
    await ctx.db.patch(existing._id, {
      status: "failed",
      generationId: null,
      lastError: args.error,
      updatedAt: timestamp,
    });
    return aiSummaryDto(await ctx.db.get(existing._id));
  },
});
