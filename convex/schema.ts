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
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_data_hash", ["dataHash"]),
});
