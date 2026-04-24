import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const payerShare = v.object({
  personId: v.string(),
  amount: v.number(),
});

const expenseItem = v.object({
  id: v.string(),
  name: v.string(),
  price: v.number(),
  sharedBy: v.array(v.string()),
  categoryName: v.optional(v.string()),
});

const celebrationContribution = v.object({
  personId: v.string(),
  amount: v.number(),
});

export default defineSchema({
  userProfiles: defineTable({
    supabaseUserId: v.string(),
    email: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fontPreference: v.optional(
      v.union(
        v.literal("geist"),
        v.literal("system"),
        v.literal("inter"),
        v.literal("google-sans"),
      ),
    ),
    themePreference: v.optional(v.string()),
    lastActiveView: v.optional(v.string()),
    hasSeenWelcomeToast: v.optional(v.boolean()),
    shouldShowWelcomeToast: v.optional(v.boolean()),
    lastSignInAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_supabase_user_id", ["supabaseUserId"]),

  people: defineTable({
    name: v.string(),
    createdAt: v.string(),
  }).index("by_name", ["name"]),

  categories: defineTable({
    name: v.string(),
    iconName: v.string(),
    rank: v.optional(v.number()),
    createdAt: v.string(),
  }).index("by_name", ["name"]),

  expenses: defineTable({
    description: v.string(),
    totalAmount: v.number(),
    category: v.string(),
    paidBy: v.array(payerShare),
    splitMethod: v.union(v.literal("equal"), v.literal("unequal"), v.literal("itemwise")),
    shares: v.array(payerShare),
    items: v.optional(v.union(v.array(expenseItem), v.null())),
    celebrationContribution: v.optional(v.union(celebrationContribution, v.null())),
    excludeFromSettlement: v.optional(v.boolean()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_created_at", ["createdAt"]),

  budgetItems: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    categoryName: v.string(),
    normalizedCategoryName: v.string(),
    catalogKey: v.string(),
    searchText: v.string(),
    defaultPrice: v.number(),
    averagePrice: v.number(),
    latestPrice: v.number(),
    minPrice: v.number(),
    maxPrice: v.number(),
    historicalAveragePrice: v.number(),
    historicalLatestPrice: v.number(),
    historicalMinPrice: v.number(),
    historicalMaxPrice: v.number(),
    historicalTotalPrice: v.number(),
    historicalObservationCount: v.number(),
    customAveragePrice: v.number(),
    customLatestPrice: v.number(),
    customMinPrice: v.number(),
    customMaxPrice: v.number(),
    customTotalPrice: v.number(),
    customObservationCount: v.number(),
    source: v.union(
      v.literal("historical"),
      v.literal("custom"),
      v.literal("mixed"),
    ),
    isActive: v.boolean(),
    createdByUserId: v.optional(v.union(v.string(), v.null())),
    createdAt: v.string(),
    updatedAt: v.string(),
    lastObservedAt: v.optional(v.union(v.string(), v.null())),
    lastCustomAt: v.optional(v.union(v.string(), v.null())),
  })
    .index("by_catalog_key", ["catalogKey"])
    .index("by_active", ["isActive"])
    .index("by_active_category", ["isActive", "categoryName"])
    .index("by_updated_at", ["updatedAt"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["isActive", "categoryName"],
    }),

  settlementPayments: defineTable({
    debtorId: v.string(),
    creditorId: v.string(),
    amountSettled: v.number(),
    settledAt: v.string(),
    markedByUserId: v.string(),
    notes: v.optional(v.union(v.string(), v.null())),
  }).index("by_settled_at", ["settledAt"]),

  manualSettlementOverrides: defineTable({
    debtorId: v.string(),
    creditorId: v.string(),
    amount: v.number(),
    notes: v.optional(v.union(v.string(), v.null())),
    createdByUserId: v.optional(v.union(v.string(), v.null())),
    createdAt: v.string(),
    updatedAt: v.string(),
    isActive: v.boolean(),
  }).index("by_created_at", ["createdAt"]),

  aiPrompts: defineTable({
    name: v.string(),
    promptText: v.string(),
    isActive: v.boolean(),
    createdByUserId: v.optional(v.union(v.string(), v.null())),
    createdAt: v.string(),
    updatedAt: v.string(),
    version: v.number(),
    description: v.optional(v.union(v.string(), v.null())),
  }).index("by_name_active", ["name", "isActive"]),

  aiConfigs: defineTable({
    key: v.string(),
    modelCode: v.string(),
    fallbackModelCodes: v.array(v.string()),
    updatedAt: v.string(),
    updatedByUserId: v.optional(v.union(v.string(), v.null())),
  }).index("by_key", ["key"]),

  aiSummaries: defineTable({
    userId: v.string(),
    dataHash: v.string(),
    summary: v.string(),
    modelName: v.optional(v.union(v.string(), v.null())),
    cacheKeyVersion: v.optional(v.number()),
    payloadSchemaVersion: v.optional(v.number()),
    promptVersion: v.optional(v.number()),
    modelCode: v.optional(v.union(v.string(), v.null())),
    modelConfigFingerprint: v.optional(v.union(v.string(), v.null())),
    status: v.optional(
      v.union(
        v.literal("ready"),
        v.literal("generating"),
        v.literal("failed"),
      ),
    ),
    generationId: v.optional(v.union(v.string(), v.null())),
    lastError: v.optional(v.union(v.string(), v.null())),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_data_hash", ["dataHash"]),

  aiRedactions: defineTable({
    userId: v.string(),
    dataHash: v.string(),
    redactions: v.string(),
    modelName: v.optional(v.union(v.string(), v.null())),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_data_hash", ["dataHash"]),

  reportGenerationEvents: defineTable({
    userId: v.string(),
    eventType: v.union(
      v.literal("preview_generated"),
      v.literal("print_clicked"),
      v.literal("download_clicked"),
      v.literal("redaction_cache_hit"),
      v.literal("redaction_generated"),
      v.literal("redaction_fallback"),
    ),
    reportMode: v.union(v.literal("group"), v.literal("personal")),
    datePreset: v.string(),
    dateRangeLabel: v.string(),
    redacted: v.boolean(),
    usedCache: v.optional(v.union(v.boolean(), v.null())),
    aiModelName: v.optional(v.union(v.string(), v.null())),
    expenseCount: v.number(),
    settlementCount: v.number(),
    participantCount: v.number(),
    manualOverrideCount: v.number(),
    createdAt: v.string(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_user_created_at", ["userId", "createdAt"])
    .index("by_event_type", ["eventType"]),
});
