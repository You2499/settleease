import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  DEVELOPMENT_SUPABASE_USER_ID,
  isConvexDevelopmentAuthDisabled,
  requireAuthenticatedSupabaseUserId,
  requireSelf,
} from "./authGuards";

function normalizeSupabaseUserId(value: string) {
  return value.trim().toLowerCase();
}

const nowIso = () => new Date().toISOString();

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
  quantity: v.optional(v.number()),
  unitPrice: v.optional(v.number()),
  quantitySplits: v.optional(
    v.array(
      v.object({
        unitIndex: v.number(),
        sharedBy: v.array(v.string()),
      }),
    ),
  ),
});

const celebrationContribution = v.object({
  personId: v.string(),
  amount: v.number(),
});

const DEFAULT_AI_CONFIG_KEY = "global-ai-config";
const DEFAULT_AI_MODEL_CODE = "gemini-2.5-flash";
const DEFAULT_AI_FALLBACK_MODEL_CODES = [
  "gemini-2.0-flash-lite",
  "gemini-2.5-pro",
];
const DEVELOPMENT_CONVEX_HOST = "shocking-panda-595.convex.cloud";
const PRODUCTION_CONVEX_HOST = "fortunate-fox-427.convex.cloud";
const PRODUCTION_DANGER_UNLOCK_CONFIRMATION =
  "UNLOCK PRODUCTION DANGER ZONE";

type SettleEaseEnvironment = "development" | "production";

const settleEaseEnvironment = v.union(
  v.literal("development"),
  v.literal("production"),
);

const aiModelCode = v.string();

const resetDataMode = v.union(
  v.literal("operational"),
  v.literal("factory"),
);

const settlementClearScope = v.union(
  v.literal("activeManualOverrides"),
  v.literal("allSettlementRecords"),
);

const activeView = v.union(
  v.literal("dashboard"),
  v.literal("health"),
  v.literal("addExpense"),
  v.literal("editExpenses"),
  v.literal("managePeople"),
  v.literal("manageCategories"),
  v.literal("manageSettlements"),
  v.literal("analytics"),
  v.literal("exportExpense"),
  v.literal("scanReceipt"),
  v.literal("settings"),
);

const reportGenerationEventType = v.union(
  v.literal("preview_generated"),
  v.literal("print_clicked"),
  v.literal("download_clicked"),
  v.literal("redaction_cache_hit"),
  v.literal("redaction_generated"),
  v.literal("redaction_fallback"),
);

const exportReportMode = v.union(v.literal("group"), v.literal("personal"));

const selectedBudgetLine = v.object({
  id: v.string(),
  budgetItemId: v.optional(v.string()),
  name: v.string(),
  categoryName: v.string(),
  unitPrice: v.number(),
  quantity: v.number(),
  source: v.union(v.literal("catalog"), v.literal("custom")),
  venue: v.optional(v.string()),
});

const budgetFees = v.object({
  otherCharge: v.string(),
  discount: v.string(),
});

const budgetVatClassification = v.object({
  key: v.string(),
  vatClass: v.union(v.literal("standard"), v.literal("alcohol")),
  confidence: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  rationale: v.string(),
  source: v.literal("ai"),
});

const budgetDraftVatStatus = v.union(
  v.literal("idle"),
  v.literal("loading"),
  v.literal("ai"),
  v.literal("error"),
);

const usageEventStatus = v.union(
  v.literal("success"),
  v.literal("failure"),
  v.literal("cancelled"),
  v.literal("info"),
);

const usageEventSource = v.union(
  v.literal("client"),
  v.literal("server"),
  v.literal("compat"),
);

const usageDatePreset = v.union(
  v.literal("24h"),
  v.literal("7d"),
  v.literal("30d"),
  v.literal("90d"),
);

type UsageEventStatus = "success" | "failure" | "cancelled" | "info";
type UsageEventSource = "client" | "server" | "compat";
type UsageActorRole = "admin" | "user";

const SAFE_USAGE_METADATA_KEYS = new Set([
  "activeView",
  "aiModelName",
  "amountBucket",
  "cacheState",
  "categoryCount",
  "datePreset",
  "durationBucket",
  "eventType",
  "expenseCount",
  "fallback",
  "feature",
  "filter",
  "fromView",
  "hasItems",
  "isMultiplePayers",
  "itemCount",
  "manualOverrideCount",
  "mode",
  "participantCount",
  "paymentCount",
  "preset",
  "redacted",
  "reportMode",
  "settlementCount",
  "splitMethod",
  "status",
  "surface",
  "toView",
  "usedCache",
  "view",
]);

const DEFAULT_CATEGORY_SEEDS = [
  { name: "Food", iconName: "Utensils" },
  { name: "Groceries", iconName: "ShoppingCart" },
  { name: "Travel", iconName: "Car" },
  { name: "Entertainment", iconName: "Film" },
  { name: "Utilities", iconName: "Zap" },
  { name: "Rent", iconName: "Home" },
  { name: "Health", iconName: "HeartPulse" },
  { name: "Shopping", iconName: "ShoppingBag" },
  { name: "Other", iconName: "CircleHelp" },
];

function profileDto(profile: any) {
  if (!profile) return null;
  return {
    id: profile._id,
    user_id: profile.supabaseUserId,
    email: profile.email ?? null,
    role: profile.role ?? "user",
    first_name: profile.firstName ?? null,
    last_name: profile.lastName ?? null,
    font_preference: profile.fontPreference ?? "google-sans",
    theme_preference: profile.themePreference ?? undefined,
    last_active_view: profile.lastActiveView ?? undefined,
    windows_experience_enabled: profile.windowsExperienceEnabled ?? false,
    has_seen_welcome_toast: profile.hasSeenWelcomeToast ?? false,
    should_show_welcome_toast: profile.shouldShowWelcomeToast ?? false,
    last_sign_in_at: profile.lastSignInAt ?? undefined,
    last_global_logout_at: profile.lastGlobalLogoutAt ?? undefined,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
    seen_announcement_ids: profile.seenAnnouncementIds ?? [],
  };
}

function adminUserProfileDto(profile: any) {
  if (!profile) return null;
  return {
    id: profile._id,
    user_id: profile.supabaseUserId,
    email: profile.email ?? null,
    role: profile.role ?? "user",
    first_name: profile.firstName ?? null,
    last_name: profile.lastName ?? null,
    windows_experience_enabled: profile.windowsExperienceEnabled ?? false,
    last_sign_in_at: profile.lastSignInAt ?? null,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

function personDto(person: any) {
  return {
    id: person._id,
    name: person.name,
    created_at: person.createdAt,
  };
}

function categoryDto(category: any) {
  return {
    id: category._id,
    name: category.name,
    icon_name: category.iconName,
    rank: category.rank,
    created_at: category.createdAt,
  };
}

function expenseDto(expense: any) {
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
    discount: expense.discount ?? null,
    exclude_from_settlement: expense.excludeFromSettlement ?? false,
    exclusion_strategy: expense.exclusionStrategy ?? (expense.excludeFromSettlement ? "standard" : undefined),
    created_at: expense.createdAt,
    updated_at: expense.updatedAt,
  };
}

function settlementPaymentDto(payment: any) {
  return {
    id: payment._id,
    debtor_id: payment.debtorId,
    creditor_id: payment.creditorId,
    amount_settled: payment.amountSettled,
    settled_at: payment.settledAt,
    marked_by_user_id: payment.markedByUserId,
    notes: payment.notes ?? undefined,
    associated_expense_id: payment.associatedExpenseId ?? null,
    is_archived: payment.isArchived ?? false,
  };
}

function manualOverrideDto(override: any) {
  return {
    id: override._id,
    debtor_id: override.debtorId,
    creditor_id: override.creditorId,
    amount: override.amount,
    notes: override.notes ?? null,
    created_by_user_id: override.createdByUserId ?? null,
    created_at: override.createdAt,
    updated_at: override.updatedAt,
    is_active: override.isActive,
  };
}

const UNCATEGORIZED_BUDGET_CATEGORY = "Uncategorized";

function cleanBudgetItemName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeBudgetItemName(value: string) {
  return cleanBudgetItemName(value).toLowerCase();
}

function cleanBudgetCategoryName(value?: string | null) {
  const category = String(value ?? "").trim().replace(/\s+/g, " ");
  return category || UNCATEGORIZED_BUDGET_CATEGORY;
}

function normalizeBudgetCategoryName(value?: string | null) {
  return cleanBudgetCategoryName(value).toLowerCase();
}

function buildBudgetCatalogKey(name: string, categoryName?: string | null) {
  return `${normalizeBudgetItemName(name)}::${normalizeBudgetCategoryName(categoryName)}`;
}

function buildBudgetSearchText(name: string, categoryName: string) {
  return `${name} ${categoryName}`.trim().toLowerCase();
}

function roundBudgetPrice(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function toPositiveBudgetPrice(value: unknown) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return null;
  return roundBudgetPrice(price);
}

function budgetSource(
  historicalObservationCount: number,
  customObservationCount: number,
): "historical" | "custom" | "mixed" {
  if (historicalObservationCount > 0 && customObservationCount > 0) {
    return "mixed";
  }
  if (customObservationCount > 0) return "custom";
  return "historical";
}

function pickLatestBudgetPrice(args: {
  historicalLatestPrice: number;
  historicalLastObservedAt?: string | null;
  customLatestPrice: number;
  customLastObservedAt?: string | null;
}) {
  if (!args.customLastObservedAt) return args.historicalLatestPrice;
  if (!args.historicalLastObservedAt) return args.customLatestPrice;

  const historicalTime = new Date(args.historicalLastObservedAt).getTime();
  const customTime = new Date(args.customLastObservedAt).getTime();
  if (Number.isFinite(customTime) && customTime >= historicalTime) {
    return args.customLatestPrice;
  }
  return args.historicalLatestPrice;
}

function combineBudgetStats(args: {
  historicalObservationCount: number;
  historicalTotalPrice: number;
  historicalLatestPrice: number;
  historicalMinPrice: number;
  historicalMaxPrice: number;
  lastObservedAt?: string | null;
  customObservationCount: number;
  customTotalPrice: number;
  customLatestPrice: number;
  customMinPrice: number;
  customMaxPrice: number;
  lastCustomAt?: string | null;
}) {
  const totalObservationCount =
    args.historicalObservationCount + args.customObservationCount;
  const averagePrice =
    totalObservationCount > 0
      ? roundBudgetPrice(
          (args.historicalTotalPrice + args.customTotalPrice) /
            totalObservationCount,
        )
      : 0;

  const minCandidates = [
    args.historicalObservationCount > 0 ? args.historicalMinPrice : null,
    args.customObservationCount > 0 ? args.customMinPrice : null,
  ].filter((value): value is number => typeof value === "number");

  const maxCandidates = [
    args.historicalObservationCount > 0 ? args.historicalMaxPrice : null,
    args.customObservationCount > 0 ? args.customMaxPrice : null,
  ].filter((value): value is number => typeof value === "number");

  return {
    averagePrice,
    defaultPrice: averagePrice,
    latestPrice: roundBudgetPrice(
      pickLatestBudgetPrice({
        historicalLatestPrice: args.historicalLatestPrice,
        historicalLastObservedAt: args.lastObservedAt,
        customLatestPrice: args.customLatestPrice,
        customLastObservedAt: args.lastCustomAt,
      }),
    ),
    minPrice:
      minCandidates.length > 0
        ? roundBudgetPrice(Math.min(...minCandidates))
        : 0,
    maxPrice:
      maxCandidates.length > 0
        ? roundBudgetPrice(Math.max(...maxCandidates))
        : 0,
    source: budgetSource(
      args.historicalObservationCount,
      args.customObservationCount,
    ),
  };
}

function getHistoricalBudgetStats(existing: any) {
  const historicalObservationCount = Math.max(
    0,
    Math.floor(Number(existing?.historicalObservationCount) || 0),
  );
  const historicalTotalPrice =
    Number(existing?.historicalTotalPrice) ||
    roundBudgetPrice(Number(existing?.historicalAveragePrice) || 0) *
      historicalObservationCount;

  return {
    historicalObservationCount,
    historicalTotalPrice: roundBudgetPrice(historicalTotalPrice),
    historicalLatestPrice:
      historicalObservationCount > 0
        ? roundBudgetPrice(Number(existing?.historicalLatestPrice) || 0)
        : 0,
    historicalMinPrice:
      historicalObservationCount > 0
        ? roundBudgetPrice(Number(existing?.historicalMinPrice) || 0)
        : 0,
    historicalMaxPrice:
      historicalObservationCount > 0
        ? roundBudgetPrice(Number(existing?.historicalMaxPrice) || 0)
        : 0,
    lastObservedAt: existing?.lastObservedAt ?? null,
  };
}

function getCustomBudgetStats(existing: any) {
  const customObservationCount = Math.max(
    0,
    Math.floor(Number(existing?.customObservationCount) || 0),
  );
  const customTotalPrice =
    Number(existing?.customTotalPrice) ||
    roundBudgetPrice(Number(existing?.customAveragePrice) || 0) *
      customObservationCount;

  return {
    customObservationCount,
    customTotalPrice: roundBudgetPrice(customTotalPrice),
    customLatestPrice:
      customObservationCount > 0
        ? roundBudgetPrice(Number(existing?.customLatestPrice) || 0)
        : 0,
    customMinPrice:
      customObservationCount > 0
        ? roundBudgetPrice(Number(existing?.customMinPrice) || 0)
        : 0,
    customMaxPrice:
      customObservationCount > 0
        ? roundBudgetPrice(Number(existing?.customMaxPrice) || 0)
        : 0,
    lastCustomAt: existing?.lastCustomAt ?? null,
  };
}

function budgetItemDto(item: any) {
  return {
    id: item._id,
    name: item.name,
    category_name: item.categoryName,
    default_price: item.defaultPrice,
    average_price: item.averagePrice,
    latest_price: item.latestPrice,
    min_price: item.minPrice,
    max_price: item.maxPrice,
    historical_observation_count: item.historicalObservationCount,
    custom_observation_count: item.customObservationCount,
    source: item.source,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    observations: (item.observations ?? []).map((obs: any) => ({
      venue: obs.venue,
      price: obs.price,
      date: obs.date,
      expense_id: obs.expenseId ?? null,
    })),
  };
}

function cleanBudgetDraftLine(line: {
  id: string;
  budgetItemId?: string;
  name: string;
  categoryName: string;
  unitPrice: number;
  quantity: number;
  source: "catalog" | "custom";
  venue?: string | null;
}) {
  const name = cleanBudgetItemName(line.name);
  const unitPrice = toPositiveBudgetPrice(line.unitPrice);
  const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));

  if (!name || unitPrice === null) return null;

  return {
    id: String(line.id || makeBudgetDraftLineId(name)).slice(0, 120),
    budgetItemId: line.budgetItemId || undefined,
    name,
    categoryName: cleanBudgetCategoryName(line.categoryName),
    unitPrice,
    quantity,
    source: line.source,
    venue: line.venue ? String(line.venue).trim().replace(/\s+/g, " ") : undefined,
  };
}

function makeBudgetDraftLineId(name: string) {
  return `draft-${normalizeBudgetItemName(name).replace(/[^a-z0-9]+/g, "-")}`;
}

function cleanBudgetDraftClassification(
  classification: {
    key: string;
    vatClass: "standard" | "alcohol";
    confidence: "low" | "medium" | "high";
    rationale: string;
    source: "ai";
  },
  lineIds: Set<string>,
) {
  const key = String(classification.key ?? "").trim();
  if (!key || !lineIds.has(key)) return null;

  return {
    key,
    vatClass: classification.vatClass,
    confidence: classification.confidence,
    rationale:
      String(classification.rationale ?? "").trim().replace(/\s+/g, " ") ||
      "Classified for alcohol VAT.",
    source: "ai" as const,
  };
}

function budgetDraftDto(draft: any) {
  if (!draft) return null;

  return {
    id: draft._id,
    selected_lines: (draft.lines ?? []).map((line: any) => ({
      id: line.id,
      budget_item_id: line.budgetItemId,
      name: line.name,
      category_name: line.categoryName,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      source: line.source,
      venue: line.venue ?? null,
    })),
    fees: {
      other_charge: draft.fees?.otherCharge ?? "",
      discount: draft.fees?.discount ?? "",
    },
    vat_classifications: Object.fromEntries(
      (draft.vatClassifications ?? []).map((classification: any) => [
        classification.key,
        {
          key: classification.key,
          vat_class: classification.vatClass,
          confidence: classification.confidence,
          rationale: classification.rationale,
          source: classification.source,
        },
      ]),
    ),
    vat_status: draft.vatStatus,
    vat_model_name: draft.vatModelName ?? "",
    vat_classified_signature: draft.vatClassifiedSignature ?? "",
    created_at: draft.createdAt,
    updated_at: draft.updatedAt,
  };
}

function aiPromptDto(prompt: any) {
  if (!prompt) return null;
  return {
    id: prompt._id,
    name: prompt.name,
    prompt_text: prompt.promptText,
    is_active: prompt.isActive,
    created_by_user_id: prompt.createdByUserId ?? null,
    created_at: prompt.createdAt,
    updated_at: prompt.updatedAt,
    version: prompt.version,
    description: prompt.description ?? null,
  };
}

function defaultAiConfigDto(key = DEFAULT_AI_CONFIG_KEY) {
  return {
    id: null,
    key,
    modelCode: DEFAULT_AI_MODEL_CODE,
    fallbackModelCodes: DEFAULT_AI_FALLBACK_MODEL_CODES,
    updatedAt: null,
    updatedByUserId: null,
  };
}

function aiConfigDto(config: any, key = DEFAULT_AI_CONFIG_KEY) {
  if (!config) return defaultAiConfigDto(key);

  let modelCode = config.modelCode ?? DEFAULT_AI_MODEL_CODE;
  let fallbackModelCodes = Array.isArray(config.fallbackModelCodes)
    ? config.fallbackModelCodes
    : DEFAULT_AI_FALLBACK_MODEL_CODES;

  // Auto-heal discontinued models from older DB records
  if (modelCode === "gemini-2.0-flash" || modelCode === "gemini-1.5-flash" || modelCode === "gemini-1.5-pro") {
    modelCode = DEFAULT_AI_MODEL_CODE;
  }

  fallbackModelCodes = fallbackModelCodes.map((code: string) => {
    if (code === "gemini-2.0-flash" || code === "gemini-1.5-flash" || code === "gemini-1.5-pro") {
      return code === "gemini-2.0-flash" ? "gemini-2.0-flash-lite" : "gemini-2.5-pro";
    }
    return code;
  }).filter((code: string) => code !== modelCode);

  if (fallbackModelCodes.length === 0) {
    fallbackModelCodes = DEFAULT_AI_FALLBACK_MODEL_CODES.filter((code: string) => code !== modelCode);
  }

  return {
    id: config._id,
    key: config.key ?? key,
    modelCode,
    fallbackModelCodes,
    updatedAt: config.updatedAt ?? null,
    updatedByUserId: config.updatedByUserId ?? null,
  };
}

function getSettleEaseServerEnvironment(): SettleEaseEnvironment {
  const configuredEnvironment = String(process.env.SETTLEEASE_ENV ?? "")
    .trim()
    .toLowerCase();

  if (configuredEnvironment === "development") return "development";
  if (configuredEnvironment === "production") return "production";

  return isConvexDevelopmentAuthDisabled() ? "development" : "production";
}

function getEnvironmentDetails() {
  const environment = getSettleEaseServerEnvironment();
  const authDisabled = isConvexDevelopmentAuthDisabled();
  const destructiveActionsEnabled =
    environment === "development" ? authDisabled : true;
  const requiresDangerZoneUnlock = environment === "production";
  const expectedConvexHost =
    environment === "development"
      ? DEVELOPMENT_CONVEX_HOST
      : PRODUCTION_CONVEX_HOST;
  const deploymentLabel =
    process.env.SETTLEEASE_DEPLOYMENT_LABEL ||
    expectedConvexHost.replace(".convex.cloud", "");
  const configuredEnvironment = process.env.SETTLEEASE_ENV ?? null;

  return {
    environment,
    environmentSource: configuredEnvironment ? "explicit" : "inferred",
    configuredEnvironment,
    authMode: authDisabled ? "disabled" : "supabase-jwt",
    authDisabled,
    requiresDangerZoneUnlock,
    destructiveActionsEnabled,
    destructiveActionsReason: destructiveActionsEnabled
      ? environment === "production"
        ? "Production danger actions require unlocking the danger zone and confirming each action."
        : "Danger actions are enabled for this deployment."
      : "Development danger actions require SETTLEEASE_DISABLE_AUTH=true.",
    expectedConvexHost,
    deploymentLabel,
  };
}

function requireExpectedEnvironment(expectedEnvironment: SettleEaseEnvironment) {
  const details = getEnvironmentDetails();
  if (details.environment !== expectedEnvironment) {
    throw new ConvexError(
      `Environment mismatch. This deployment is ${details.environment}, but the request targeted ${expectedEnvironment}.`,
    );
  }
  return details;
}

function getEnvironmentName(environment: SettleEaseEnvironment) {
  return environment === "development" ? "DEVELOPMENT" : "PRODUCTION";
}

function getDangerConfirmationPhrase(
  environment: SettleEaseEnvironment,
  action:
    | "clearReportLogs"
    | "clearUsageAnalytics"
    | "clearAiCaches"
    | "clearActiveOverrides"
    | "clearSettlementRecords"
    | "resetOperational"
    | "factoryReset",
) {
  const name = getEnvironmentName(environment);

  switch (action) {
    case "clearReportLogs":
      return `CLEAR ${name} REPORT LOGS`;
    case "clearUsageAnalytics":
      return `CLEAR ${name} USAGE ANALYTICS`;
    case "clearAiCaches":
      return `CLEAR ${name} AI CACHES`;
    case "clearActiveOverrides":
      return `CLEAR ${name} ACTIVE OVERRIDES`;
    case "clearSettlementRecords":
      return `CLEAR ${name} SETTLEMENT RECORDS`;
    case "resetOperational":
      return `RESET ${name} DATA`;
    case "factoryReset":
      return `FACTORY RESET ${name}`;
  }
}

function requireDangerAction(
  expectedEnvironment: SettleEaseEnvironment,
  confirmation: string,
  expectedConfirmation: string,
  dangerZoneUnlockConfirmation?: string,
) {
  const details = requireExpectedEnvironment(expectedEnvironment);

  if (confirmation !== expectedConfirmation) {
    throw new ConvexError("Confirmation phrase did not match.");
  }

  if (
    details.environment === "production" &&
    dangerZoneUnlockConfirmation !== PRODUCTION_DANGER_UNLOCK_CONFIRMATION
  ) {
    throw new ConvexError("Production danger zone has not been unlocked.");
  }

  if (!details.destructiveActionsEnabled) {
    throw new ConvexError(details.destructiveActionsReason);
  }

  return details;
}

async function deleteAllFromTable(
  ctx: any,
  tableName: string,
  predicate?: (doc: any) => boolean,
) {
  const docs = await ctx.db.query(tableName).collect();
  const docsToDelete = predicate ? docs.filter(predicate) : docs;
  await Promise.all(docsToDelete.map((doc: any) => ctx.db.delete(doc._id)));
  return docsToDelete.length;
}

async function patchAllFromTable(
  ctx: any,
  tableName: string,
  patch: Record<string, any>,
  predicate?: (doc: any) => boolean,
) {
  const docs = await ctx.db.query(tableName).collect();
  const docsToPatch = predicate ? docs.filter(predicate) : docs;
  await Promise.all(
    docsToPatch.map((doc: any) => ctx.db.patch(doc._id, patch)),
  );
  return docsToPatch.length;
}

async function getProfileBySupabaseUserId(ctx: any, supabaseUserId: string) {
  const normalizedUserId = normalizeSupabaseUserId(supabaseUserId);
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_supabase_user_id", (q: any) =>
      q.eq("supabaseUserId", normalizedUserId),
    )
    .unique();
}

async function requireAdmin(ctx: any) {
  const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
  if (
    isConvexDevelopmentAuthDisabled() &&
    supabaseUserId === DEVELOPMENT_SUPABASE_USER_ID
  ) {
    return supabaseUserId;
  }

  const profile = await getProfileBySupabaseUserId(ctx, supabaseUserId);
  if (profile?.role !== "admin") {
    throw new ConvexError("Admin access required.");
  }
  return supabaseUserId;
}

function usageDateKey(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return nowIso().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function usageRangeStartDateKey(preset: "24h" | "7d" | "30d" | "90d") {
  const days = preset === "24h" ? 1 : preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 10);
}

function clampUsageString(value: unknown, fallback: string) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_.:/-]/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

function sanitizeUsageMetadataValue(value: unknown): string | number | boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(3)) : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const compact = trimmed.replace(/\s+/g, "_");
    return /^[a-zA-Z0-9_.:/-]{1,80}$/.test(compact)
      ? compact
      : "text_present";
  }
  return null;
}

function sanitizeUsageMetadataJson(value: unknown) {
  let source = value;
  if (typeof value === "string" && value.trim()) {
    try {
      source = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }

  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, rawValue] of Object.entries(source as Record<string, unknown>)) {
    if (!SAFE_USAGE_METADATA_KEYS.has(key)) continue;
    const value = sanitizeUsageMetadataValue(rawValue);
    if (value !== null) sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? JSON.stringify(sanitized) : null;
}

function bucketAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "unknown";
  if (amount < 100) return "lt_100";
  if (amount < 500) return "100_499";
  if (amount < 1000) return "500_999";
  if (amount < 5000) return "1000_4999";
  if (amount < 10000) return "5000_9999";
  return "gte_10000";
}

async function getUsageActorRole(ctx: any, actorUserId: string): Promise<UsageActorRole> {
  if (
    isConvexDevelopmentAuthDisabled() &&
    actorUserId === DEVELOPMENT_SUPABASE_USER_ID
  ) {
    return "admin";
  }

  const profile = await getProfileBySupabaseUserId(ctx, actorUserId);
  return profile?.role === "admin" ? "admin" : "user";
}

async function upsertUsageRollup(ctx: any, event: {
  actorRole: UsageActorRole;
  eventName: string;
  eventGroup: string;
  surface: string;
  status: UsageEventStatus;
  source: UsageEventSource;
  dateKey: string;
  timestamp: string;
}) {
  const key = [
    event.dateKey,
    event.eventName,
    event.eventGroup,
    event.surface,
    event.status,
    event.actorRole,
    event.source,
  ].join("|");
  const existing = await ctx.db
    .query("usageDailyRollups")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      count: (Number(existing.count) || 0) + 1,
      updatedAt: event.timestamp,
    });
    return;
  }

  await ctx.db.insert("usageDailyRollups", {
    key,
    dateKey: event.dateKey,
    eventName: event.eventName,
    eventGroup: event.eventGroup,
    surface: event.surface,
    status: event.status,
    actorRole: event.actorRole,
    source: event.source,
    count: 1,
    updatedAt: event.timestamp,
  });
}

async function insertUsageTouch(ctx: any, args: {
  actorUserId: string;
  actorRole: UsageActorRole;
  sessionId?: string | null;
  source: UsageEventSource;
  dateKey: string;
  timestamp: string;
}) {
  const touches = [
    { kind: "user" as const, id: args.actorUserId },
    args.sessionId ? { kind: "session" as const, id: args.sessionId } : null,
  ].filter(Boolean) as Array<{ kind: "user" | "session"; id: string }>;

  for (const touch of touches) {
    const touchIdHash = `${touch.kind}:${touch.id}`;
    const key = `${args.dateKey}|${touchIdHash}`;
    const existing = await ctx.db
      .query("usageDailyTouches")
      .withIndex("by_key", (q: any) => q.eq("key", key))
      .first();
    if (existing) continue;

    await ctx.db.insert("usageDailyTouches", {
      key,
      dateKey: args.dateKey,
      touchKind: touch.kind,
      touchIdHash,
      actorRole: args.actorRole,
      source: args.source,
      createdAt: args.timestamp,
    });
  }
}

async function pruneUsageAnalytics(ctx: any, timestamp: string) {
  const rawCutoff = new Date(timestamp);
  rawCutoff.setUTCDate(rawCutoff.getUTCDate() - 90);
  const rawCutoffIso = rawCutoff.toISOString();
  const rawEvents = await ctx.db
    .query("appUsageEvents")
    .withIndex("by_created_at")
    .filter((q: any) => q.lt(q.field("createdAt"), rawCutoffIso))
    .take(50);
  await Promise.all(rawEvents.map((event: any) => ctx.db.delete(event._id)));

  const rollupCutoff = new Date(timestamp);
  rollupCutoff.setUTCDate(rollupCutoff.getUTCDate() - 400);
  const rollupCutoffKey = rollupCutoff.toISOString().slice(0, 10);
  const [rollups, touches] = await Promise.all([
    ctx.db
      .query("usageDailyRollups")
      .withIndex("by_date_key")
      .filter((q: any) => q.lt(q.field("dateKey"), rollupCutoffKey))
      .take(50),
    ctx.db
      .query("usageDailyTouches")
      .withIndex("by_date_kind")
      .filter((q: any) => q.lt(q.field("dateKey"), rollupCutoffKey))
      .take(50),
  ]);
  await Promise.all([
    ...rollups.map((row: any) => ctx.db.delete(row._id)),
    ...touches.map((row: any) => ctx.db.delete(row._id)),
  ]);
}

async function recordUsageEvent(ctx: any, args: {
  actorUserId: string;
  actorRole?: UsageActorRole;
  sessionId?: string | null;
  eventName: string;
  eventGroup?: string;
  surface: string;
  status?: UsageEventStatus;
  source?: UsageEventSource;
  targetKind?: string | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown> | string | null;
}) {
  try {
    const timestamp = nowIso();
    const actorRole = args.actorRole ?? await getUsageActorRole(ctx, args.actorUserId);
    const eventName = clampUsageString(args.eventName, "unknown.event");
    const eventGroup = clampUsageString(
      args.eventGroup ?? eventName.split(".")[0],
      "general",
    );
    const surface = clampUsageString(args.surface, "app");
    const source = args.source ?? "server";
    const status = args.status ?? "success";
    const dateKey = usageDateKey(timestamp);
    const durationMs =
      typeof args.durationMs === "number" && Number.isFinite(args.durationMs)
        ? Math.max(0, Math.round(args.durationMs))
        : null;
    const metadataJson = sanitizeUsageMetadataJson(args.metadata ?? null);

    await ctx.db.insert("appUsageEvents", {
      actorUserId: args.actorUserId,
      actorRole,
      sessionId: args.sessionId ? clampUsageString(args.sessionId, "session") : null,
      eventName,
      eventGroup,
      surface,
      status,
      source,
      targetKind: args.targetKind ? clampUsageString(args.targetKind, "target") : null,
      durationMs,
      metadataJson,
      dateKey,
      createdAt: timestamp,
    });

    await Promise.all([
      upsertUsageRollup(ctx, {
        actorRole,
        eventName,
        eventGroup,
        surface,
        status,
        source,
        dateKey,
        timestamp,
      }),
      insertUsageTouch(ctx, {
        actorUserId: args.actorUserId,
        actorRole,
        sessionId: args.sessionId ?? null,
        source,
        dateKey,
        timestamp,
      }),
      pruneUsageAnalytics(ctx, timestamp),
    ]);
  } catch (error) {
    console.warn("Usage analytics event was not recorded:", error);
  }
}

async function ensureUserProfile(
  ctx: any,
  args: {
    supabaseUserId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  },
) {
  const normalizedUserId = normalizeSupabaseUserId(args.supabaseUserId);
  const existing = await getProfileBySupabaseUserId(ctx, normalizedUserId);
  const timestamp = nowIso();

  if (existing) {
    const updates: Record<string, any> = {
      email: args.email ?? existing.email,
      firstName: args.firstName || existing.firstName,
      lastName: args.lastName || existing.lastName,
      updatedAt: timestamp,
    };
    if (!existing.fontPreference) updates.fontPreference = "google-sans";
    if (existing.windowsExperienceEnabled === undefined) {
      updates.windowsExperienceEnabled = false;
    }

    if (
      isConvexDevelopmentAuthDisabled() &&
      normalizedUserId === DEVELOPMENT_SUPABASE_USER_ID
    ) {
      updates.role = "admin";
    }

    await ctx.db.patch(existing._id, updates);
    return existing._id;
  }

  return await ctx.db.insert("userProfiles", {
    supabaseUserId: normalizedUserId,
    email: args.email,
    role:
      isConvexDevelopmentAuthDisabled() &&
      normalizedUserId === DEVELOPMENT_SUPABASE_USER_ID
        ? "admin"
        : "user",
    firstName: args.firstName || undefined,
    lastName: args.lastName || undefined,
    fontPreference: "google-sans",
    themePreference: "light",
    lastActiveView: "dashboard",
    windowsExperienceEnabled: false,
    hasSeenWelcomeToast: false,
    shouldShowWelcomeToast: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export const health = query({
  args: {},
  handler: async (ctx) => {
    await ctx.db.query("people").take(1);
    return { ok: true, checkedAt: nowIso() };
  },
});

export const getAdminSettingsSnapshot = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [
      people,
      categories,
      expenses,
      settlementPayments,
      manualOverrides,
      budgetItems,
      budgetDrafts,
      userProfiles,
      reportGenerationEvents,
      appUsageEvents,
      usageDailyRollups,
      usageDailyTouches,
      aiSummaries,
      aiRedactions,
      aiPrompts,
      announcements,
      aiConfig,
    ] = await Promise.all([
      ctx.db.query("people").collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("expenses").collect(),
      ctx.db.query("settlementPayments").collect(),
      ctx.db.query("manualSettlementOverrides").collect(),
      ctx.db.query("budgetItems").collect(),
      ctx.db.query("budgetDrafts").collect(),
      ctx.db.query("userProfiles").collect(),
      ctx.db.query("reportGenerationEvents").collect(),
      ctx.db.query("appUsageEvents").collect(),
      ctx.db.query("usageDailyRollups").collect(),
      ctx.db.query("usageDailyTouches").collect(),
      ctx.db.query("aiSummaries").collect(),
      ctx.db.query("aiRedactions").collect(),
      ctx.db.query("aiPrompts").collect(),
      ctx.db.query("announcements").collect(),
      ctx.db
        .query("aiConfigs")
        .withIndex("by_key", (q: any) => q.eq("key", DEFAULT_AI_CONFIG_KEY))
        .first(),
    ]);

    const activeManualOverrideCount = manualOverrides.filter(
      (override: any) => override.isActive,
    ).length;

    return {
      environment: getEnvironmentDetails(),
      counts: {
        people: people.length,
        categories: categories.length,
        expenses: expenses.length,
        settlementPayments: settlementPayments.length,
        manualOverrides: manualOverrides.length,
        activeManualOverrides: activeManualOverrideCount,
        budgetItems: budgetItems.length,
        budgetDrafts: budgetDrafts.length,
        userProfiles: userProfiles.length,
        reportGenerationEvents: reportGenerationEvents.length,
        appUsageEvents: appUsageEvents.length,
        usageDailyRollups: usageDailyRollups.length,
        usageDailyTouches: usageDailyTouches.length,
        aiSummaries: aiSummaries.length,
        aiRedactions: aiRedactions.length,
        aiPrompts: aiPrompts.length,
        announcements: announcements.length,
      },
      aiConfig: aiConfigDto(aiConfig),
      checkedAt: nowIso(),
    };
  },
});

export const getUserProfile = query({
  args: { supabaseUserId: v.string() },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireSelf(ctx, args.supabaseUserId);
    return profileDto(
      await getProfileBySupabaseUserId(ctx, supabaseUserId),
    );
  },
});

export const listUserProfilesForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const profiles = await ctx.db.query("userProfiles").collect();
    return profiles
      .map(adminUserProfileDto)
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const aName = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
        const bName = `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim();
        const aLabel = aName || a.email || a.user_id;
        const bLabel = bName || b.email || b.user_id;
        return aLabel.localeCompare(bLabel);
      });
  },
});

export const upsertUserProfile = mutation({
  args: {
    supabaseUserId: v.string(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireSelf(ctx, args.supabaseUserId);
    const id = await ensureUserProfile(ctx, { ...args, supabaseUserId });
    return profileDto(await ctx.db.get(id));
  },
});

export const markSignIn = mutation({
  args: {
    supabaseUserId: v.string(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireSelf(ctx, args.supabaseUserId);
    const id = await ensureUserProfile(ctx, { ...args, supabaseUserId });
    const timestamp = nowIso();
    const updates: Record<string, any> = {
      lastSignInAt: timestamp,
      updatedAt: timestamp,
    };
    if (args.email !== undefined) updates.email = args.email;
    await ctx.db.patch(id, updates);
    return profileDto(await ctx.db.get(id));
  },
});

export const updateUserProfile = mutation({
  args: {
    supabaseUserId: v.string(),
    firstName: v.optional(v.union(v.string(), v.null())),
    lastName: v.optional(v.union(v.string(), v.null())),
    fontPreference: v.optional(
      v.union(
        v.literal("inter"),
        v.literal("google-sans"),
      ),
    ),
    themePreference: v.optional(v.string()),
    lastActiveView: v.optional(activeView),
    hasSeenWelcomeToast: v.optional(v.boolean()),
    shouldShowWelcomeToast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireSelf(ctx, args.supabaseUserId);
    const profile = await getProfileBySupabaseUserId(ctx, supabaseUserId);
    if (!profile) throw new ConvexError("User profile not found.");

    const updates: Record<string, any> = { updatedAt: nowIso() };
    if (args.firstName !== undefined)
      updates.firstName = args.firstName ?? undefined;
    if (args.lastName !== undefined)
      updates.lastName = args.lastName ?? undefined;
    if (args.fontPreference !== undefined)
      updates.fontPreference = args.fontPreference;
    if (args.themePreference !== undefined)
      updates.themePreference = args.themePreference;
    if (args.lastActiveView !== undefined)
      updates.lastActiveView = args.lastActiveView;
    if (args.hasSeenWelcomeToast !== undefined)
      updates.hasSeenWelcomeToast = args.hasSeenWelcomeToast;
    if (args.shouldShowWelcomeToast !== undefined)
      updates.shouldShowWelcomeToast = args.shouldShowWelcomeToast;

    await ctx.db.patch(profile._id, updates);
    return profileDto(await ctx.db.get(profile._id));
  },
});

export const setUserWindowsExperience = mutation({
  args: {
    supabaseUserId: v.string(),
    enabled: v.boolean(),
    expectedEnvironment: settleEaseEnvironment,
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    requireExpectedEnvironment(args.expectedEnvironment);

    const profile = await getProfileBySupabaseUserId(ctx, args.supabaseUserId);
    if (!profile) throw new ConvexError("User profile not found.");

    await ctx.db.patch(profile._id, {
      windowsExperienceEnabled: args.enabled,
      updatedAt: nowIso(),
    });

    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "settings.windows_experience_toggled",
      eventGroup: "settings",
      surface: "settings",
      targetKind: "userProfile",
      metadata: { mode: args.enabled ? "enabled" : "disabled" },
    });

    return adminUserProfileDto(await ctx.db.get(profile._id));
  },
});

export const listPeople = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedSupabaseUserId(ctx);
    const people = await ctx.db.query("people").collect();
    return people.map(personDto).sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const addPerson = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError("Person's name cannot be empty.");
    const people = await ctx.db.query("people").collect();
    if (
      people.some(
        (person: any) =>
          person.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new ConvexError(`A person named "${name}" already exists.`);
    }
    const id = await ctx.db.insert("people", { name, createdAt: nowIso() });
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "person.created",
      eventGroup: "people",
      surface: "managePeople",
      targetKind: "person",
      metadata: { participantCount: people.length + 1 },
    });
    return id;
  },
});

export const updatePerson = mutation({
  args: { id: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const person: any = await ctx.db.get(args.id as any);
    if (!person) throw new ConvexError("Person not found.");
    const name = args.name.trim();
    if (!name) throw new ConvexError("Person's name cannot be empty.");
    const people = await ctx.db.query("people").collect();
    if (
      people.some(
        (other: any) =>
          other._id !== person._id &&
          other.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new ConvexError(`A person named "${name}" already exists.`);
    }
    await ctx.db.patch(person._id, { name });
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "person.updated",
      eventGroup: "people",
      surface: "managePeople",
      targetKind: "person",
      metadata: { participantCount: people.length },
    });
  },
});

export const removePerson = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const person: any = await ctx.db.get(args.id as any);
    if (!person) throw new ConvexError("Person not found.");

    // Query settlementPayments using indexes to check if the person is involved
    const debtorPayments = await ctx.db
      .query("settlementPayments")
      .withIndex("by_debtor", (q) => q.eq("debtorId", args.id))
      .collect();
    const creditorPayments = await ctx.db
      .query("settlementPayments")
      .withIndex("by_creditor", (q) => q.eq("creditorId", args.id))
      .collect();
    
    const paymentCount = debtorPayments.length + creditorPayments.length;
    if (paymentCount > 0) {
      throw new ConvexError(
        `${person.name} is involved in ${paymentCount} recorded settlement(s).`,
      );
    }

    // Check manual overrides using indexes
    const debtorOverrides = await ctx.db
      .query("manualSettlementOverrides")
      .withIndex("by_debtor", (q) => q.eq("debtorId", args.id))
      .collect();
    const creditorOverrides = await ctx.db
      .query("manualSettlementOverrides")
      .withIndex("by_creditor", (q) => q.eq("creditorId", args.id))
      .collect();

    const overrideCount = debtorOverrides.length + creditorOverrides.length;
    if (overrideCount > 0) {
      throw new ConvexError(
        `${person.name} is involved in ${overrideCount} manual settlement override(s).`,
      );
    }

    const expenses = await ctx.db.query("expenses").collect();
    const involvedInExpense = expenses.some((expense: any) => {
      const isPayer =
        Array.isArray(expense.paidBy) &&
        expense.paidBy.some((p: any) => p.personId === args.id);
      const isSharer =
        Array.isArray(expense.shares) &&
        expense.shares.some((s: any) => s.personId === args.id);
      const isItemSharer =
        Array.isArray(expense.items) &&
        expense.items.some(
          (item: any) =>
            (Array.isArray(item.sharedBy) && item.sharedBy.includes(args.id)) ||
            (Array.isArray(item.quantitySplits) &&
              item.quantitySplits.some(
                (split: any) =>
                  Array.isArray(split.sharedBy) &&
                  split.sharedBy.includes(args.id),
              )),
        );
      const isCelebrationContributor =
        expense.celebrationContribution?.personId === args.id;
      return isPayer || isSharer || isItemSharer || isCelebrationContributor;
    });
    if (involvedInExpense) {
      throw new ConvexError(
        `${person.name} is involved in one or more expenses.`,
      );
    }

    const people = await ctx.db.query("people").collect();
    await ctx.db.delete(person._id);
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "person.deleted",
      eventGroup: "people",
      surface: "managePeople",
      targetKind: "person",
      metadata: { participantCount: Math.max(0, people.length - 1) },
    });
  },
});

export const ensureDefaultPeople = mutation({
  args: {
    expectedEnvironment: v.optional(settleEaseEnvironment),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    if (args.expectedEnvironment) {
      requireExpectedEnvironment(args.expectedEnvironment);
    }
    const existing = await ctx.db.query("people").take(1);
    if (existing.length > 0) return false;
    await Promise.all(
      ["Alice", "Bob", "Charlie"].map((name) =>
        ctx.db.insert("people", { name, createdAt: nowIso() }),
      ),
    );
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "person.seeded",
      eventGroup: "people",
      surface: "settings",
      targetKind: "person",
      metadata: { participantCount: 3 },
    });
    return true;
  },
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedSupabaseUserId(ctx);
    const categories = await ctx.db.query("categories").collect();
    return categories
      .map(categoryDto)
      .sort(
        (a, b) =>
          (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name),
      );
  },
});

export const addCategory = mutation({
  args: { name: v.string(), iconName: v.string() },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError("Category name cannot be empty.");
    const categories = await ctx.db.query("categories").collect();
    if (
      categories.some(
        (category: any) =>
          category.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new ConvexError(`A category named "${name}" already exists.`);
    }
    const maxRank =
      categories.length > 0
        ? Math.max(...categories.map((category: any) => category.rank ?? 0))
        : 0;
    await ctx.db.insert("categories", {
      name,
      iconName: args.iconName,
      rank: maxRank + 1,
      createdAt: nowIso(),
    });
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "category.created",
      eventGroup: "categories",
      surface: "manageCategories",
      targetKind: "category",
      metadata: { categoryCount: categories.length + 1 },
    });
  },
});

export const updateCategory = mutation({
  args: { id: v.string(), name: v.string(), iconName: v.string() },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const category: any = await ctx.db.get(args.id as any);
    if (!category) throw new ConvexError("Category not found.");
    const name = args.name.trim();
    if (!name) throw new ConvexError("Category name cannot be empty.");
    const categories = await ctx.db.query("categories").collect();
    if (
      categories.some(
        (other: any) =>
          other._id !== category._id &&
          other.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new ConvexError(`A category named "${name}" already exists.`);
    }

    const oldName = category.name;
    const newName = name;

    await ctx.db.patch(category._id, { name, iconName: args.iconName });

    if (oldName !== newName) {
      // 1. Update expenses top-level category field & item categories
      const expenses = await ctx.db.query("expenses").collect();
      for (const expense of expenses) {
        let needsUpdate = false;
        const patch: any = {};

        if (expense.category === oldName) {
          patch.category = newName;
          needsUpdate = true;
        }

        if (Array.isArray(expense.items)) {
          const updatedItems = expense.items.map((item: any) => {
            if (item.categoryName === oldName) {
              needsUpdate = true;
              return { ...item, categoryName: newName };
            }
            return item;
          });
          if (needsUpdate) {
            patch.items = updatedItems;
          }
        }

        if (needsUpdate) {
          await ctx.db.patch(expense._id, patch);
        }
      }

      // 2. Update budgetItems categoryName and normalizedCategoryName
      const budgetItems = await ctx.db.query("budgetItems").collect();
      for (const item of budgetItems) {
        if (item.categoryName === oldName) {
          await ctx.db.patch(item._id, {
            categoryName: newName,
            normalizedCategoryName: newName.trim().toLowerCase(),
          });
        }
      }

      // 3. Update budgetDrafts lines' categoryName
      const budgetDrafts = await ctx.db.query("budgetDrafts").collect();
      for (const draft of budgetDrafts) {
        if (Array.isArray(draft.lines)) {
          let draftNeedsUpdate = false;
          const updatedLines = draft.lines.map((line: any) => {
            if (line.categoryName === oldName) {
              draftNeedsUpdate = true;
              return { ...line, categoryName: newName };
            }
            return line;
          });
          if (draftNeedsUpdate) {
            await ctx.db.patch(draft._id, { lines: updatedLines });
          }
        }
      }

      // 4. Update expenseObservations categoryName
      const observations = await ctx.db.query("expenseObservations").collect();
      for (const obs of observations) {
        if (obs.categoryName === oldName) {
          await ctx.db.patch(obs._id, {
            categoryName: newName,
          });
        }
      }
    }

    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "category.updated",
      eventGroup: "categories",
      surface: "manageCategories",
      targetKind: "category",
      metadata: { categoryCount: categories.length },
    });
  },
});

export const deleteCategory = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const category: any = await ctx.db.get(args.id as any);
    if (!category) throw new ConvexError("Category not found.");

    const expenses = await ctx.db.query("expenses").collect();
    const count = expenses.filter((expense: any) => {
      if (expense.category === category.name) return true;
      return (
        Array.isArray(expense.items) &&
        expense.items.some((item: any) => item.categoryName === category.name)
      );
    }).length;
    if (count > 0) {
      throw new ConvexError(
        `Category "${category.name}" is used by ${count} expense(s).`,
      );
    }

    const budgetItems = await ctx.db.query("budgetItems").collect();
    const budgetItemsCount = budgetItems.filter(
      (item: any) => item.categoryName === category.name
    ).length;
    if (budgetItemsCount > 0) {
      throw new ConvexError(
        `Category "${category.name}" is used by ${budgetItemsCount} budget catalog item(s).`,
      );
    }

    const categories = await ctx.db.query("categories").collect();
    await ctx.db.delete(category._id);
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "category.deleted",
      eventGroup: "categories",
      surface: "manageCategories",
      targetKind: "category",
      metadata: { categoryCount: Math.max(0, categories.length - 1) },
    });
  },
});

export const reorderCategories = mutation({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    await Promise.all(
      args.ids.map(async (id, index) => {
        const category = await ctx.db.get(id as any);
        if (category) await ctx.db.patch(category._id, { rank: index + 1 });
      }),
    );
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "category.reordered",
      eventGroup: "categories",
      surface: "manageCategories",
      targetKind: "category",
      metadata: { categoryCount: args.ids.length },
    });
  },
});

export const seedDefaultCategories = mutation({
  args: {
    expectedEnvironment: settleEaseEnvironment,
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    requireExpectedEnvironment(args.expectedEnvironment);

    const categories = await ctx.db.query("categories").collect();
    const existingNames = new Set(
      categories.map((category: any) =>
        category.name.trim().toLowerCase(),
      ),
    );
    let nextRank =
      categories.length > 0
        ? Math.max(...categories.map((category: any) => category.rank ?? 0))
        : 0;
    let inserted = 0;
    let skipped = 0;

    for (const seed of DEFAULT_CATEGORY_SEEDS) {
      if (existingNames.has(seed.name.toLowerCase())) {
        skipped += 1;
        continue;
      }

      nextRank += 1;
      await ctx.db.insert("categories", {
        ...seed,
        rank: nextRank,
        createdAt: nowIso(),
      });
      existingNames.add(seed.name.toLowerCase());
      inserted += 1;
    }

    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "category.seeded",
      eventGroup: "categories",
      surface: "settings",
      targetKind: "category",
      metadata: { categoryCount: categories.length + inserted },
    });

    return {
      inserted,
      skipped,
      totalCategoryCount: categories.length + inserted,
    };
  },
});

export const listExpenses = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedSupabaseUserId(ctx);
    const expenses = await ctx.db.query("expenses").collect();
    return expenses
      .map(expenseDto)
      .sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      );
  },
});

export const getBudgetDraft = query({
  args: {},
  handler: async (ctx) => {
    const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
    const draft = await ctx.db
      .query("budgetDrafts")
      .withIndex("by_supabase_user_id", (q) =>
        q.eq("supabaseUserId", supabaseUserId),
      )
      .unique();

    return budgetDraftDto(draft);
  },
});

export const saveBudgetDraft = mutation({
  args: {
    selectedLines: v.array(selectedBudgetLine),
    fees: budgetFees,
    vatClassifications: v.array(budgetVatClassification),
    vatStatus: budgetDraftVatStatus,
    vatModelName: v.string(),
    vatClassifiedSignature: v.string(),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
    const existing = await ctx.db
      .query("budgetDrafts")
      .withIndex("by_supabase_user_id", (q) =>
        q.eq("supabaseUserId", supabaseUserId),
      )
      .unique();
    const lines = args.selectedLines
      .map(cleanBudgetDraftLine)
      .filter((line): line is NonNullable<typeof line> => Boolean(line));

    if (lines.length === 0) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }

    const lineIds = new Set(lines.map((line) => line.id));
    const vatStatus = args.vatStatus === "loading" ? "idle" : args.vatStatus;
    const vatClassifications =
      vatStatus === "ai"
        ? args.vatClassifications
            .map((classification) =>
              cleanBudgetDraftClassification(classification, lineIds),
            )
            .filter((row): row is NonNullable<typeof row> => Boolean(row))
        : [];
    const timestamp = nowIso();
    const payload = {
      supabaseUserId,
      lines,
      fees: {
        otherCharge: String(args.fees.otherCharge ?? ""),
        discount: String(args.fees.discount ?? ""),
      },
      vatClassifications,
      vatStatus,
      vatModelName: args.vatModelName.trim().slice(0, 120),
      vatClassifiedSignature:
        vatStatus === "ai" ? args.vatClassifiedSignature : "",
      updatedAt: timestamp,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return budgetDraftDto(await ctx.db.get(existing._id));
    }

    const id = await ctx.db.insert("budgetDrafts", {
      ...payload,
      createdAt: timestamp,
    });
    return budgetDraftDto(await ctx.db.get(id));
  },
});

export const clearBudgetDraft = mutation({
  args: {},
  handler: async (ctx) => {
    const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
    const draft = await ctx.db
      .query("budgetDrafts")
      .withIndex("by_supabase_user_id", (q) =>
        q.eq("supabaseUserId", supabaseUserId),
      )
      .unique();

    if (draft) await ctx.db.delete(draft._id);
    return { deleted: Boolean(draft) };
  },
});

export const listBudgetItems = query({
  args: {
    search: v.optional(v.string()),
    categoryName: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedSupabaseUserId(ctx);

    const limit = Math.min(Math.max(Math.floor(args.limit ?? 80), 1), 200);
    const search = (args.search ?? "").trim();
    const categoryName = args.categoryName
      ? cleanBudgetCategoryName(args.categoryName)
      : null;

    if (search) {
      const rows = await ctx.db
        .query("budgetItems")
        .withSearchIndex("search_text", (q) => {
          const builder = q.search("searchText", search).eq("isActive", true);
          return categoryName
            ? builder.eq("categoryName", categoryName)
            : builder;
        })
        .take(limit);
      return rows.map(budgetItemDto);
    }

    const rows = categoryName
      ? await ctx.db
          .query("budgetItems")
          .withIndex("by_active_category", (q) =>
            q.eq("isActive", true).eq("categoryName", categoryName),
          )
          .collect()
      : await ctx.db
          .query("budgetItems")
          .withIndex("by_active", (q) => q.eq("isActive", true))
          .collect();

    return rows
      .map(budgetItemDto)
      .sort(
        (a, b) =>
          a.category_name.localeCompare(b.category_name) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, limit);
  },
});

export const upsertCustomBudgetItem = mutation({
  args: {
    name: v.string(),
    categoryName: v.optional(v.union(v.string(), v.null())),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireAdmin(ctx);
    const name = cleanBudgetItemName(args.name);
    const normalizedName = normalizeBudgetItemName(name);
    const price = toPositiveBudgetPrice(args.price);

    if (!normalizedName) {
      throw new ConvexError("Budget item name cannot be empty.");
    }
    if (price === null) {
      throw new ConvexError("Budget item price must be positive.");
    }

    const categoryName = cleanBudgetCategoryName(args.categoryName);
    const normalizedCategoryName = normalizeBudgetCategoryName(categoryName);
    const catalogKey = buildBudgetCatalogKey(name, categoryName);
    const timestamp = nowIso();
    const existing = await ctx.db
      .query("budgetItems")
      .withIndex("by_catalog_key", (q) => q.eq("catalogKey", catalogKey))
      .first();

    const historicalStats = getHistoricalBudgetStats(existing);
    const customStats = getCustomBudgetStats(existing);
    const nextCustomObservationCount = customStats.customObservationCount + 1;
    const nextCustomTotalPrice = roundBudgetPrice(
      customStats.customTotalPrice + price,
    );
    const nextCustomStats = {
      customObservationCount: nextCustomObservationCount,
      customTotalPrice: nextCustomTotalPrice,
      customAveragePrice: roundBudgetPrice(
        nextCustomTotalPrice / nextCustomObservationCount,
      ),
      customLatestPrice: price,
      customMinPrice:
        customStats.customObservationCount > 0
          ? Math.min(customStats.customMinPrice, price)
          : price,
      customMaxPrice:
        customStats.customObservationCount > 0
          ? Math.max(customStats.customMaxPrice, price)
          : price,
      lastCustomAt: timestamp,
    };
    const combined = combineBudgetStats({
      ...historicalStats,
      ...nextCustomStats,
    });

    const newCustomObservation = {
      venue: "Custom Catalog",
      price,
      date: timestamp,
    };

    const existingObservations = existing?.observations ?? [];
    const updatedObservations = [...existingObservations, newCustomObservation].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const payload = {
      name,
      normalizedName,
      categoryName,
      normalizedCategoryName,
      catalogKey,
      searchText: buildBudgetSearchText(name, categoryName),
      ...combined,
      ...historicalStats,
      historicalAveragePrice:
        historicalStats.historicalObservationCount > 0
          ? roundBudgetPrice(
              historicalStats.historicalTotalPrice /
                historicalStats.historicalObservationCount,
            )
          : 0,
      ...nextCustomStats,
      observations: updatedObservations,
      isActive: true,
      createdByUserId: existing?.createdByUserId ?? supabaseUserId,
      updatedAt: timestamp,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      await recordUsageEvent(ctx, {
        actorUserId: supabaseUserId,
        actorRole: "admin",
        eventName: "budget.item_updated",
        eventGroup: "budget",
        surface: "dashboard",
        targetKind: "budgetItem",
        metadata: { amountBucket: bucketAmount(price) },
      });
      return budgetItemDto(await ctx.db.get(existing._id));
    }

    const id = await ctx.db.insert("budgetItems", {
      ...payload,
      createdAt: timestamp,
    });
    await recordUsageEvent(ctx, {
      actorUserId: supabaseUserId,
      actorRole: "admin",
      eventName: "budget.item_created",
      eventGroup: "budget",
      surface: "dashboard",
      targetKind: "budgetItem",
      metadata: { amountBucket: bucketAmount(price) },
    });
    return budgetItemDto(await ctx.db.get(id));
  },
});

export const checkBudgetCatalogSyncState = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedSupabaseUserId(ctx);

    // If there is ANY unmapped observation, the catalog is out of sync.
    const unmappedObs = await ctx.db
      .query("expenseObservations")
      .withIndex("by_status", (q) => q.eq("status", "unmapped"))
      .first();

    return {
      isOutOfSync: unmappedObs !== null,
    };
  },
});

export const getRawObservations = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedSupabaseUserId(ctx);

    const allowedCategories = (await ctx.db.query("categories").collect()).map((c: any) => c.name);
    if (!allowedCategories.includes(UNCATEGORIZED_BUDGET_CATEGORY)) {
      allowedCategories.push(UNCATEGORIZED_BUDGET_CATEGORY);
    }

    // Query unmapped observations from expenseObservations table
    const unmappedDocs = await ctx.db
      .query("expenseObservations")
      .withIndex("by_status", (q) => q.eq("status", "unmapped"))
      .collect();

    const observations = unmappedDocs.map((obs) => ({
      id: obs.observationId,
      itemName: obs.itemName,
      expenseDescription: obs.expenseDescription,
      price: obs.price,
      date: obs.date,
      categoryName: obs.categoryName,
    }));

    return {
      observations,
      allowedCategories,
    };
  }
});

function computeObservationsStats(observations: Array<{
  venue: string;
  price: number;
  date: string;
  expenseId?: string | null;
}>) {
  const historical = observations.filter(obs => obs.expenseId !== undefined && obs.expenseId !== null);
  const custom = observations.filter(obs => obs.expenseId === undefined || obs.expenseId === null);

  const historicalCount = historical.length;
  let historicalTotal = 0;
  let historicalMin = 0;
  let historicalMax = 0;
  let historicalLatest = 0;
  let lastObservedAt: string | null = null;

  if (historicalCount > 0) {
    historicalTotal = roundBudgetPrice(historical.reduce((sum, obs) => sum + obs.price, 0));
    historicalMin = Math.min(...historical.map(obs => obs.price));
    historicalMax = Math.max(...historical.map(obs => obs.price));

    // Find the chronologically latest historical observation
    const latestObs = historical.reduce((latest, current) => {
      return new Date(current.date).getTime() > new Date(latest.date).getTime() ? current : latest;
    }, historical[0]);
    historicalLatest = latestObs.price;
    lastObservedAt = latestObs.date;
  }

  const customCount = custom.length;
  let customTotal = 0;
  let customMin = 0;
  let customMax = 0;
  let customLatest = 0;
  let lastCustomAt: string | null = null;

  if (customCount > 0) {
    customTotal = roundBudgetPrice(custom.reduce((sum, obs) => sum + obs.price, 0));
    customMin = Math.min(...custom.map(obs => obs.price));
    customMax = Math.max(...custom.map(obs => obs.price));

    // Find the chronologically latest custom observation
    const latestObs = custom.reduce((latest, current) => {
      return new Date(current.date).getTime() > new Date(latest.date).getTime() ? current : latest;
    }, custom[0]);
    customLatest = latestObs.price;
    lastCustomAt = latestObs.date;
  }

  return {
    historicalStats: {
      historicalObservationCount: historicalCount,
      historicalTotalPrice: historicalTotal,
      historicalLatestPrice: historicalLatest,
      historicalMinPrice: historicalMin,
      historicalMaxPrice: historicalMax,
      lastObservedAt,
    },
    customStats: {
      customObservationCount: customCount,
      customTotalPrice: customTotal,
      customLatestPrice: customLatest,
      customMinPrice: customMin,
      customMaxPrice: customMax,
      lastCustomAt,
    }
  };
}

export const importCleanedCatalog = mutation({
  args: {
    canonicalItems: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        categoryName: v.string(),
        decipheredVenue: v.union(v.string(), v.null()),
        description: v.string(),
      })
    ),
    mappings: v.array(
      v.object({
        observationId: v.string(),
        canonicalItemId: v.string(),
        decipheredVenue: v.union(v.string(), v.null()),
        cleanedPrice: v.number(),
      })
    ),
    clientSyncTimestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAuthenticatedSupabaseUserId(ctx);
    const timestamp = nowIso();
    
    // 1. TRANSACTIONAL RACE CONDITION PREVENTION (OPTIMISTIC LOCK)
    const newestBudgetItem = await ctx.db
      .query("budgetItems")
      .withIndex("by_updated_at")
      .order("desc")
      .first();

    if (
      newestBudgetItem && 
      new Date(newestBudgetItem.updatedAt).getTime() > new Date(args.clientSyncTimestamp).getTime()
    ) {
      console.warn("⚠️ Sync skipped: A newer catalog sync occurred concurrently.");
      return {
        status: "skipped",
        reason: "concurrency_clash",
        message: "Another sync has already completed in the background.",
      };
    }

    const slugToConvexId = new Map<string, any>();
    let rowsCreated = 0;
    let rowsUpdated = 0;

    // 2. INSERT NEW CANONICAL ITEMS
    for (const canonicalItem of args.canonicalItems) {
      const name = cleanBudgetItemName(canonicalItem.name);
      const categoryName = cleanBudgetCategoryName(canonicalItem.categoryName);
      const catalogKey = buildBudgetCatalogKey(name, categoryName);
      const normalizedName = normalizeBudgetItemName(name);
      const normalizedCategoryName = normalizeBudgetCategoryName(categoryName);
      const searchText = buildBudgetSearchText(name, categoryName);

      let budgetItem = await ctx.db
        .query("budgetItems")
        .withIndex("by_catalog_key", (q: any) => q.eq("catalogKey", catalogKey))
        .first();

      if (!budgetItem) {
        const budgetItemId = await ctx.db.insert("budgetItems", {
          name,
          normalizedName,
          categoryName,
          normalizedCategoryName,
          catalogKey,
          searchText,
          defaultPrice: 0,
          averagePrice: 0,
          latestPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          historicalAveragePrice: 0,
          historicalLatestPrice: 0,
          historicalMinPrice: 0,
          historicalMaxPrice: 0,
          historicalTotalPrice: 0,
          historicalObservationCount: 0,
          customAveragePrice: 0,
          customLatestPrice: 0,
          customMinPrice: 0,
          customMaxPrice: 0,
          customTotalPrice: 0,
          customObservationCount: 0,
          source: "historical",
          isActive: true,
          createdByUserId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          observations: [],
        });
        slugToConvexId.set(canonicalItem.id, budgetItemId);
        rowsCreated++;
      } else {
        slugToConvexId.set(canonicalItem.id, budgetItem._id);
      }
    }

    // 3. PERSIST MAPPINGS AND UPDATE STATUS
    const affectedBudgetItemIds = new Set<string>();
    const idMap: Record<string, string> = {};

    const allBudgetItems = await ctx.db.query("budgetItems").collect();
    const budgetItemByKey = new Map(allBudgetItems.map((item: any) => [item.catalogKey, item]));
    const budgetItemById = new Map(allBudgetItems.map((item: any) => [String(item._id), item]));

    for (const mapping of args.mappings) {
      let resolvedBudgetItemId = null;

      // Resolve budget item ID
      if (slugToConvexId.has(mapping.canonicalItemId)) {
        resolvedBudgetItemId = slugToConvexId.get(mapping.canonicalItemId);
      } else if (budgetItemById.has(mapping.canonicalItemId)) {
        resolvedBudgetItemId = budgetItemById.get(mapping.canonicalItemId)._id;
      } else {
        // Fallback search by catalogKey or normalized slug
        const keyMatch = budgetItemByKey.get(mapping.canonicalItemId);
        if (keyMatch) {
          resolvedBudgetItemId = keyMatch._id;
        } else {
          const nameMatch = allBudgetItems.find(
            (item: any) =>
              item.catalogKey === mapping.canonicalItemId ||
              item.normalizedName === mapping.canonicalItemId ||
              String(item._id) === mapping.canonicalItemId
          );
          if (nameMatch) {
            resolvedBudgetItemId = nameMatch._id;
          }
        }
      }

      if (!resolvedBudgetItemId) {
        // Fallback to first available budget item if unresolved
        const fallbackItem = allBudgetItems[0] || (Array.from(slugToConvexId.values())[0] as any);
        if (fallbackItem) {
          resolvedBudgetItemId = typeof fallbackItem === "object" ? fallbackItem._id : fallbackItem;
        }
      }

      if (resolvedBudgetItemId) {
        idMap[mapping.observationId] = String(resolvedBudgetItemId);
        
        // Find observation doc in DB
        const obsDoc = await ctx.db
          .query("expenseObservations")
          .withIndex("by_observation_id", (q: any) => q.eq("observationId", mapping.observationId))
          .unique();

        if (obsDoc) {
          await ctx.db.patch(obsDoc._id, {
            budgetItemId: resolvedBudgetItemId,
            status: "mapped",
            price: mapping.cleanedPrice,
            expenseDescription: mapping.decipheredVenue || obsDoc.expenseDescription || "Unknown Venue",
            updatedAt: timestamp,
          });
          affectedBudgetItemIds.add(String(resolvedBudgetItemId));
        }
      }
    }

    // 4. RECALCULATE STATISTICS FOR AFFECTED BUDGET ITEMS
    for (const budgetItemIdStr of affectedBudgetItemIds) {
      const budgetItemId = budgetItemIdStr as any;
      const existing = (await ctx.db.get(budgetItemId)) as any;
      if (!existing) continue;

      // Query all observations currently mapped to this item
      const observations = await ctx.db
        .query("expenseObservations")
        .withIndex("by_budget_item_id", (q: any) => q.eq("budgetItemId", budgetItemId))
        .collect();

      const historicalStats = {
        historicalObservationCount: observations.length,
        historicalTotalPrice: roundBudgetPrice(observations.reduce((sum: number, o: any) => sum + o.price, 0)),
        historicalLatestPrice: observations.length > 0 ? observations.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].price : 0,
        historicalMinPrice: observations.length > 0 ? Math.min(...observations.map((o: any) => o.price)) : 0,
        historicalMaxPrice: observations.length > 0 ? Math.max(...observations.map((o: any) => o.price)) : 0,
        lastObservedAt: observations.length > 0 ? observations.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : null,
      };

      const customStats = getCustomBudgetStats(existing);
      const combined = combineBudgetStats({
        ...historicalStats,
        ...customStats,
      });

      const historicalAveragePrice = historicalStats.historicalObservationCount > 0
        ? roundBudgetPrice(historicalStats.historicalTotalPrice / historicalStats.historicalObservationCount)
        : 0;

      const customAveragePrice = customStats.customObservationCount > 0
        ? roundBudgetPrice(customStats.customTotalPrice / customStats.customObservationCount)
        : 0;

      // Cache observation pills (capping at 50)
      const cachedObservations = observations
        .map((o: any) => ({
          venue: o.expenseDescription,
          price: o.price,
          date: o.date,
          expenseId: String(o.expenseId),
        }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 50);

      const existingObservations = existing.observations ?? [];
      const customObservations = existingObservations.filter(
        (obs: any) => !obs.expenseId
      );

      const mergedObservations = [
        ...cachedObservations,
        ...customObservations,
      ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      await ctx.db.patch(existing._id, {
        ...combined,
        ...historicalStats,
        historicalAveragePrice,
        customAveragePrice,
        ...customStats,
        observations: mergedObservations,
        updatedAt: timestamp,
        lastObservedAt: historicalStats.lastObservedAt,
        lastCustomAt: customStats.lastCustomAt,
      });
      rowsUpdated++;
    }

    const profile = await getProfileBySupabaseUserId(ctx, actorUserId);
    const actorRole = profile?.role ?? "user";

    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole,
      eventName: "budget.catalog_sync_completed",
      eventGroup: "budget",
      surface: "background_sync",
      targetKind: "budgetItem",
      metadata: {
        rowsCreated,
        rowsUpdated,
        totalCanonicalItems: args.canonicalItems.length,
      },
    });

    return {
      status: "success",
      rowsCreated,
      rowsUpdated,
      rowsDeleted: 0,
      idMap,
    };
  },
});


export const backfillBudgetItemsFromExpenses = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    expectedEnvironment: v.optional(settleEaseEnvironment),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAuthenticatedSupabaseUserId(ctx);
    if (args.expectedEnvironment) {
      requireExpectedEnvironment(args.expectedEnvironment);
    }
    const dryRun = args.dryRun ?? false;
    const timestamp = nowIso();

    // Clear observations if not dry-run
    if (!dryRun) {
      const existingObservationsDocs = await ctx.db.query("expenseObservations").collect();
      for (const doc of existingObservationsDocs) {
        await ctx.db.delete(doc._id);
      }
    }

    const expenses = await ctx.db.query("expenses").collect();
    const historicalByKey = new Map<string, any>();
    const observationsToInsert: Array<{
      itemId: string;
      itemName: string;
      expenseDescription: string;
      price: number;
      date: string;
      categoryName: string;
      catalogKey: string;
      expenseId: any;
    }> = [];

    let itemObservationCount = 0;
    let validObservationCount = 0;
    let skippedObservationCount = 0;

    for (const expense of expenses) {
      if (expense.excludeFromSettlement) continue;
      if (!Array.isArray(expense.items)) continue;

      for (const item of expense.items) {
        itemObservationCount += 1;
        const name = cleanBudgetItemName(String(item.name ?? ""));
        const normalizedName = normalizeBudgetItemName(name);
        const quantity =
          Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0
            ? Math.max(1, Math.floor(Number(item.quantity)))
            : 1;
        const unitPriceCandidate =
          Number.isFinite(Number(item.unitPrice)) && Number(item.unitPrice) > 0
            ? Number(item.unitPrice)
            : Number(item.price) / quantity;
        const price = toPositiveBudgetPrice(unitPriceCandidate);

        if (!normalizedName || price === null) {
          skippedObservationCount += 1;
          continue;
        }

        validObservationCount += 1;
        const categoryName = cleanBudgetCategoryName(
          item.categoryName || expense.category,
        );
        const normalizedCategoryName =
          normalizeBudgetCategoryName(categoryName);
        const catalogKey = buildBudgetCatalogKey(name, categoryName);
        const observedAt = expense.updatedAt ?? expense.createdAt ?? timestamp;
        
        // Prepare observation object
        const observation = {
          venue: expense.description || "Unknown Venue",
          price,
          date: observedAt,
          expenseId: expense._id,
        };

        observationsToInsert.push({
          itemId: item.id,
          itemName: name,
          expenseDescription: observation.venue,
          price,
          date: observedAt,
          categoryName,
          catalogKey,
          expenseId: expense._id,
        });

        const existing = historicalByKey.get(catalogKey);

        if (!existing) {
          historicalByKey.set(catalogKey, {
            name,
            normalizedName,
            categoryName,
            normalizedCategoryName,
            catalogKey,
            historicalObservationCount: 1,
            historicalTotalPrice: price,
            historicalLatestPrice: price,
            historicalMinPrice: price,
            historicalMaxPrice: price,
            lastObservedAt: observedAt,
            observations: [observation],
          });
          continue;
        }

        existing.historicalObservationCount += 1;
        existing.historicalTotalPrice = roundBudgetPrice(
          existing.historicalTotalPrice + price,
        );
        existing.historicalMinPrice = Math.min(
          existing.historicalMinPrice,
          price,
        );
        existing.historicalMaxPrice = Math.max(
          existing.historicalMaxPrice,
          price,
        );
        
        existing.observations.push(observation);

        const existingTime = new Date(existing.lastObservedAt).getTime();
        const observedTime = new Date(observedAt).getTime();
        if (!Number.isFinite(existingTime) || observedTime >= existingTime) {
          existing.name = name;
          existing.historicalLatestPrice = price;
          existing.lastObservedAt = observedAt;
        }
      }
    }

    const existingBudgetItems = await ctx.db.query("budgetItems").collect();
    const existingByKey = new Map(
      existingBudgetItems.map((item: any) => [item.catalogKey, item]),
    );
    let rowsToInsert = 0;
    let rowsToUpdate = 0;

    const catalogKeyToConvexId = new Map<string, any>();

    for (const historicalStats of historicalByKey.values()) {
      const existing = existingByKey.get(historicalStats.catalogKey);
      if (existing) {
        rowsToUpdate += 1;
        catalogKeyToConvexId.set(historicalStats.catalogKey, existing._id);
      } else {
        rowsToInsert += 1;
      }

      if (dryRun) continue;

      const customStats = getCustomBudgetStats(existing);
      const historicalAveragePrice = roundBudgetPrice(
        historicalStats.historicalTotalPrice /
          historicalStats.historicalObservationCount,
      );
      const combined = combineBudgetStats({
        ...historicalStats,
        ...customStats,
      });

      // Extract and combine existing custom observations
      const existingObservations = existing?.observations ?? [];
      const existingCustomObservations = existingObservations.filter(
        (obs: any) => !obs.expenseId // custom observations don't map to a historic expense ID
      );

      // Concatenate and sort (newest first)
      const mergedObservations = [
        ...historicalStats.observations,
        ...existingCustomObservations,
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Cap cached observations at 50
      const cappedObservations = mergedObservations.slice(0, 50);

      const payload = {
        name: historicalStats.name,
        normalizedName: historicalStats.normalizedName,
        categoryName: historicalStats.categoryName,
        normalizedCategoryName: historicalStats.normalizedCategoryName,
        catalogKey: historicalStats.catalogKey,
        searchText: buildBudgetSearchText(
          historicalStats.name,
          historicalStats.categoryName,
        ),
        ...combined,
        historicalAveragePrice,
        historicalLatestPrice: historicalStats.historicalLatestPrice,
        historicalMinPrice: historicalStats.historicalMinPrice,
        historicalMaxPrice: historicalStats.historicalMaxPrice,
        historicalTotalPrice: historicalStats.historicalTotalPrice,
        historicalObservationCount:
          historicalStats.historicalObservationCount,
        customAveragePrice:
          customStats.customObservationCount > 0
            ? roundBudgetPrice(
                customStats.customTotalPrice /
                  customStats.customObservationCount,
              )
            : 0,
        customLatestPrice: customStats.customLatestPrice,
        customMinPrice: customStats.customMinPrice,
        customMaxPrice: customStats.customMaxPrice,
        customTotalPrice: customStats.customTotalPrice,
        customObservationCount: customStats.customObservationCount,
        observations: cappedObservations,
        isActive: true,
        createdByUserId: existing?.createdByUserId ?? null,
        updatedAt: timestamp,
        lastObservedAt: historicalStats.lastObservedAt,
        lastCustomAt: customStats.lastCustomAt,
      };

      let budgetItemId;
      if (existing) {
        await ctx.db.patch(existing._id, payload);
        budgetItemId = existing._id;
      } else {
        budgetItemId = await ctx.db.insert("budgetItems", {
          ...payload,
          createdAt: timestamp,
        });
      }
      catalogKeyToConvexId.set(historicalStats.catalogKey, budgetItemId);
    }

    // Now populate expenseObservations if not dryRun
    if (!dryRun) {
      for (const obs of observationsToInsert) {
        const budgetItemId = catalogKeyToConvexId.get(obs.catalogKey);
        await ctx.db.insert("expenseObservations", {
          observationId: `${obs.expenseId}::${obs.itemId}`,
          expenseId: obs.expenseId,
          itemId: obs.itemId,
          itemName: obs.itemName,
          expenseDescription: obs.expenseDescription,
          price: obs.price,
          date: obs.date,
          categoryName: obs.categoryName,
          budgetItemId: budgetItemId || null,
          status: budgetItemId ? "mapped" : "unmapped",
          updatedAt: timestamp,
        });
      }
    }

    const result = {
      dryRun,
      expenseCount: expenses.length,
      itemObservationCount,
      validObservationCount,
      skippedObservationCount,
      mergedCatalogRowCount: historicalByKey.size,
      rowsToInsert,
      rowsToUpdate,
    };
    const profile = await getProfileBySupabaseUserId(ctx, actorUserId);
    const actorRole = profile?.role ?? "user";
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole,
      eventName: dryRun ? "budget.backfill_previewed" : "budget.backfilled",
      eventGroup: "budget",
      surface: "settings",
      targetKind: "budgetItem",
      metadata: {
        expenseCount: expenses.length,
        itemCount: itemObservationCount,
      },
    });
    return result;
  },
});

function adjustRoundingDifference(
  items: { personId: string; amount: number }[],
  targetTotal: number
): { personId: string; amount: number }[] {
  if (items.length === 0) return items;

  const roundedItems = items.map((item) => ({
    personId: item.personId,
    amount: Math.round(Number(item.amount) * 100) / 100,
  }));

  const currentTotal = Math.round(roundedItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  const diff = Math.round((targetTotal - currentTotal) * 100) / 100;

  const maxAllowedDiff = Math.max(0.10, items.length * 0.01);
  if (Math.abs(diff) > 0.001 && Math.abs(diff) <= maxAllowedDiff) {
    let maxIndex = 0;
    let maxVal = roundedItems[0].amount;
    for (let i = 1; i < roundedItems.length; i++) {
      if (roundedItems[i].amount > maxVal) {
        maxVal = roundedItems[i].amount;
        maxIndex = i;
      }
    }
    roundedItems[maxIndex].amount = Math.round((roundedItems[maxIndex].amount + diff) * 100) / 100;
  }

  return roundedItems;
}

function extractObservationsFromExpenseDoc(expense: any, timestamp: string) {
  const result: Array<{
    itemId: string;
    itemName: string;
    expenseDescription: string;
    price: number;
    date: string;
    categoryName: string;
  }> = [];

  if (!expense || !Array.isArray(expense.items)) return result;

  const date = expense.updatedAt ?? expense.createdAt ?? timestamp;
  const expenseDescription = expense.description || "Unknown Venue";

  for (const item of expense.items) {
    const name = cleanBudgetItemName(String(item.name ?? ""));
    const normalizedName = normalizeBudgetItemName(name);
    const quantity =
      Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0
        ? Math.max(1, Math.floor(Number(item.quantity)))
        : 1;
    const unitPriceCandidate =
      Number.isFinite(Number(item.unitPrice)) && Number(item.unitPrice) > 0
        ? Number(item.unitPrice)
        : Number(item.price) / quantity;
    const price = toPositiveBudgetPrice(unitPriceCandidate);

    if (!normalizedName || price === null) continue;

    const categoryName = cleanBudgetCategoryName(
      item.categoryName || expense.category,
    );

    result.push({
      itemId: item.id,
      itemName: name,
      expenseDescription,
      price,
      date,
      categoryName,
    });
  }

  return result;
}

export async function syncCatalogForExpenseChange(
  ctx: any,
  oldExpense: any | null,
  newExpense: any | null,
) {
  const timestamp = nowIso();
  const expenseId = newExpense?._id ?? oldExpense?._id;
  if (!expenseId) return;

  // 1. Delete all existing observations for this expense from expenseObservations table
  const existingObs = await ctx.db
    .query("expenseObservations")
    .withIndex("by_expense_id", (q: any) => q.eq("expenseId", expenseId))
    .collect();

  const affectedBudgetItemIds = new Set<string>();

  for (const obs of existingObs) {
    if (obs.budgetItemId) {
      affectedBudgetItemIds.add(obs.budgetItemId);
    }
    await ctx.db.delete(obs._id);
  }

  // 2. If newExpense is provided and not excluded from settlement, insert the new observations
  if (newExpense && !newExpense.excludeFromSettlement) {
    const newObsData = extractObservationsFromExpenseDoc(newExpense, timestamp);

    for (const data of newObsData) {
      const observationId = `${expenseId}::${data.itemId}`;
      const catalogKey = buildBudgetCatalogKey(data.itemName, data.categoryName);

      // Check if there is an existing budgetItem matching this catalogKey
      const budgetItem = await ctx.db
        .query("budgetItems")
        .withIndex("by_catalog_key", (q: any) => q.eq("catalogKey", catalogKey))
        .first();

      const status = budgetItem ? "mapped" : "unmapped";
      const budgetItemId = budgetItem ? budgetItem._id : undefined;

      await ctx.db.insert("expenseObservations", {
        observationId,
        expenseId,
        itemId: data.itemId,
        itemName: data.itemName,
        expenseDescription: data.expenseDescription,
        price: data.price,
        date: data.date,
        categoryName: data.categoryName,
        budgetItemId,
        status,
        updatedAt: timestamp,
      });

      if (budgetItemId) {
        affectedBudgetItemIds.add(budgetItemId);
      }
    }
  }

  // 3. Re-calculate statistics for all affected budget items
  for (const budgetItemIdStr of affectedBudgetItemIds) {
    const budgetItemId = budgetItemIdStr as any;
    const existingBudgetItem = await ctx.db.get(budgetItemId);
    if (!existingBudgetItem) continue;

    // Fetch all mapped observations from the database for this item
    const observations = await ctx.db
      .query("expenseObservations")
      .withIndex("by_budget_item_id", (q: any) => q.eq("budgetItemId", budgetItemId))
      .collect();

    const historicalStats = {
      historicalObservationCount: observations.length,
      historicalTotalPrice: roundBudgetPrice(observations.reduce((sum: number, o: any) => sum + o.price, 0)),
      historicalLatestPrice: observations.length > 0 ? observations.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].price : 0,
      historicalMinPrice: observations.length > 0 ? Math.min(...observations.map((o: any) => o.price)) : 0,
      historicalMaxPrice: observations.length > 0 ? Math.max(...observations.map((o: any) => o.price)) : 0,
      lastObservedAt: observations.length > 0 ? observations.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : null,
    };

    const customStats = getCustomBudgetStats(existingBudgetItem);
    const combined = combineBudgetStats({
      ...historicalStats,
      ...customStats,
    });

    const historicalAveragePrice = historicalStats.historicalObservationCount > 0
      ? roundBudgetPrice(historicalStats.historicalTotalPrice / historicalStats.historicalObservationCount)
      : 0;

    const customAveragePrice = customStats.customObservationCount > 0
      ? roundBudgetPrice(customStats.customTotalPrice / customStats.customObservationCount)
      : 0;

    // Cache the observations array (sorted by date desc, capped at 50 to prevent overflow)
    const cachedObservations = observations
      .map((o: any) => ({
        venue: o.expenseDescription,
        price: o.price,
        date: o.date,
        expenseId: String(o.expenseId),
      }))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50);

    const existingObservations = existingBudgetItem.observations ?? [];
    const customObservations = existingObservations.filter(
      (obs: any) => !obs.expenseId
    );

    const mergedObservations = [
      ...cachedObservations,
      ...customObservations,
    ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // If no observations remain, check if we should delete or demote the item
    if (mergedObservations.length === 0) {
      if (existingBudgetItem.source === "historical" || (existingBudgetItem.source === "mixed" && customObservations.length === 0)) {
        await ctx.db.delete(budgetItemId);
      } else {
        // Demote to custom
        await ctx.db.patch(budgetItemId, {
          ...combined,
          source: "custom",
          historicalObservationCount: 0,
          historicalTotalPrice: 0,
          historicalLatestPrice: 0,
          historicalMinPrice: 0,
          historicalMaxPrice: 0,
          lastObservedAt: null,
          customAveragePrice,
          customLatestPrice: customStats.customLatestPrice,
          customMinPrice: customStats.customMinPrice,
          customMaxPrice: customStats.customMaxPrice,
          customTotalPrice: customStats.customTotalPrice,
          customObservationCount: customStats.customObservationCount,
          observations: customObservations,
          updatedAt: timestamp,
        });
      }
    } else {
      await ctx.db.patch(budgetItemId, {
        ...combined,
        ...historicalStats,
        historicalAveragePrice,
        customAveragePrice,
        ...customStats,
        observations: mergedObservations,
        updatedAt: timestamp,
        lastObservedAt: historicalStats.lastObservedAt,
        lastCustomAt: customStats.lastCustomAt,
      });
    }
  }
}

export const saveExpense = mutation({
  args: {
    id: v.optional(v.string()),
    description: v.string(),
    totalAmount: v.number(),
    category: v.string(),
    paidBy: v.array(payerShare),
    splitMethod: v.union(
      v.literal("equal"),
      v.literal("unequal"),
      v.literal("itemwise"),
    ),
    shares: v.array(payerShare),
    items: v.optional(v.union(v.array(expenseItem), v.null())),
    celebrationContribution: v.optional(
      v.union(celebrationContribution, v.null()),
    ),
    discount: v.optional(v.number()),
    excludeFromSettlement: v.optional(v.boolean()),
    createdAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);

    // 1. Enforce strict currency-resolution rounding to 2 decimal places
    const totalAmount = Math.round(args.totalAmount * 100) / 100;
    if (totalAmount <= 0) {
      throw new ConvexError("Expense total amount must be positive.");
    }

    let celebrationContribution: any = null;
    if (args.celebrationContribution && args.celebrationContribution.amount > 0) {
      const amount = Math.round(Number(args.celebrationContribution.amount) * 100) / 100;
      if (amount > totalAmount) {
        throw new ConvexError("Celebration contribution cannot exceed the total expense amount.");
      }
      celebrationContribution = {
        personId: args.celebrationContribution.personId,
        amount,
      };
    }

    const celebrationAmount = celebrationContribution ? celebrationContribution.amount : 0;

    let discount: number | undefined = undefined;
    if (args.discount !== undefined && args.discount !== null) {
      if (args.discount <= 0) {
        throw new ConvexError("Discount amount must be positive.");
      }
      const discountVal = Math.round(Number(args.discount) * 100) / 100;
      if (discountVal > totalAmount - celebrationAmount) {
        throw new ConvexError("Discount cannot exceed total amount minus celebration amount.");
      }
      discount = discountVal;
    }
    const discountAmount = discount || 0;

    const paidBy = adjustRoundingDifference(args.paidBy, totalAmount);

    const expectedShareSum = Math.round((totalAmount - celebrationAmount - discountAmount) * 100) / 100;
    const shares = adjustRoundingDifference(args.shares, expectedShareSum);

    let items = null;
    if (Array.isArray(args.items)) {
      items = args.items.map((item) => {
        const roundedPrice = Math.round(Number(item.price) * 100) / 100;
        const roundedQuantity = item.quantity !== undefined ? Math.round(Number(item.quantity) * 1000) / 1000 : undefined;
        const roundedUnitPrice = item.unitPrice !== undefined ? Math.round(Number(item.unitPrice) * 100) / 100 : undefined;
        
        const quantitySplits = Array.isArray(item.quantitySplits)
          ? item.quantitySplits.map((split) => ({
              unitIndex: Number(split.unitIndex),
              sharedBy: split.sharedBy,
            }))
          : undefined;

        return {
          id: item.id,
          name: item.name,
          price: roundedPrice,
          sharedBy: item.sharedBy,
          categoryName: item.categoryName,
          quantity: roundedQuantity,
          unitPrice: roundedUnitPrice,
          ...(quantitySplits ? { quantitySplits } : {}),
        };
      });
    }

    // 2. Validate that the payer shares sum up to exactly totalAmount
    const totalPaid = Math.round(paidBy.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
    if (Math.abs(totalPaid - totalAmount) > 0.01) {
      throw new ConvexError(`Sum of payer amounts ($${totalPaid.toFixed(2)}) must equal total amount ($${totalAmount.toFixed(2)}).`);
    }

    // 3. Validate that the sharer shares sum up to exactly (totalAmount - celebrationAmount - discountAmount)
    const totalShares = Math.round(shares.reduce((sum, s) => sum + s.amount, 0) * 100) / 100;
    
    if (Math.abs(totalShares - expectedShareSum) > 0.01) {
      if (celebrationContribution && discount) {
        throw new ConvexError(
          `Sum of shares ($${totalShares.toFixed(2)}) must equal total bill minus celebration contribution and discount ($${expectedShareSum.toFixed(2)}).`
        );
      } else if (celebrationContribution) {
        throw new ConvexError(
          `Sum of shares ($${totalShares.toFixed(2)}) must equal total bill minus celebration contribution ($${expectedShareSum.toFixed(2)}).`
        );
      } else if (discount) {
        throw new ConvexError(
          `Sum of shares ($${totalShares.toFixed(2)}) must equal total bill minus discount ($${expectedShareSum.toFixed(2)}).`
        );
      } else {
        throw new ConvexError(
          `Sum of shares ($${totalShares.toFixed(2)}) must equal total amount ($${totalAmount.toFixed(2)}).`
        );
      }
    }

    const payload = {
      description: args.description,
      totalAmount,
      category: args.category,
      paidBy,
      splitMethod: args.splitMethod,
      shares,
      items: items ?? null,
      celebrationContribution,
      discount,
      excludeFromSettlement: args.excludeFromSettlement ?? false,
      updatedAt: nowIso(),
    };
    const patchPayload =
      args.createdAt !== undefined
        ? { ...payload, createdAt: args.createdAt }
        : payload;

    const oldExpense = args.id ? await ctx.db.get(args.id as any) : null;
    let expenseId;

    if (args.id) {
      const expense: any = await ctx.db.get(args.id as any);
      if (!expense) throw new ConvexError("Expense not found.");
      await ctx.db.patch(expense._id, patchPayload);
      expenseId = expense._id;
      await recordUsageEvent(ctx, {
        actorUserId,
        actorRole: "admin",
        eventName: "expense.updated",
        eventGroup: "expenses",
        surface: "editExpenses",
        targetKind: "expense",
        metadata: {
          amountBucket: bucketAmount(totalAmount),
          splitMethod: args.splitMethod,
          participantCount: new Set([
            ...paidBy.map((payer: any) => payer.personId),
            ...shares.map((share: any) => share.personId),
          ]).size,
          itemCount: items?.length ?? 0,
          hasItems: Boolean(items?.length),
        },
      });
    } else {
      expenseId = await ctx.db.insert("expenses", {
        ...payload,
        createdAt: args.createdAt ?? nowIso(),
      });
      await recordUsageEvent(ctx, {
        actorUserId,
        actorRole: "admin",
        eventName: "expense.created",
        eventGroup: "expenses",
        surface: "addExpense",
        targetKind: "expense",
        metadata: {
          amountBucket: bucketAmount(totalAmount),
          splitMethod: args.splitMethod,
          participantCount: new Set([
            ...paidBy.map((payer: any) => payer.personId),
            ...shares.map((share: any) => share.personId),
          ]).size,
          itemCount: items?.length ?? 0,
          hasItems: Boolean(items?.length),
        },
      });
    }

    const newExpense = await ctx.db.get(expenseId);
    await syncCatalogForExpenseChange(ctx, oldExpense, newExpense);

    return expenseId;
  },
});

export const updateExpenseExcludeFromSettlement = mutation({
  args: {
    id: v.string(),
    excludeFromSettlement: v.boolean(),
    strategy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const expense: any = await ctx.db.get(args.id as any);
    if (!expense) throw new ConvexError("Expense not found.");
    const oldExpense = { ...expense };
    await ctx.db.patch(expense._id, {
      excludeFromSettlement: args.excludeFromSettlement,
      exclusionStrategy: args.excludeFromSettlement ? args.strategy : undefined,
      updatedAt: nowIso(),
    });
    const newExpense = await ctx.db.get(expense._id);
    await syncCatalogForExpenseChange(ctx, oldExpense, newExpense);

    if (args.excludeFromSettlement && args.strategy) {
      const settlements = await ctx.db.query("settlementPayments").collect();
      const expenseDate = new Date(expense.createdAt || 0).getTime();
      const expenseParticipantIds = new Set([
        ...(expense.paidBy ?? []).map((p: any) => p.personId),
        ...(expense.shares ?? []).map((s: any) => s.personId),
      ]);

      const entangledSettlements = settlements.filter((payment) => {
        const paymentDate = new Date(payment.settledAt).getTime();
        const isExplicitLink = payment.associatedExpenseId === args.id;
        const isLegacyGeneral = !isExplicitLink && 
          expenseParticipantIds.has(payment.debtorId) &&
          expenseParticipantIds.has(payment.creditorId) &&
          paymentDate >= expenseDate - 60000;
        return isExplicitLink || isLegacyGeneral;
      });

      if (args.strategy === "unlink_and_archive") {
        for (const payment of entangledSettlements) {
          await ctx.db.patch(payment._id, {
            isArchived: true,
          });
        }
      } else if (args.strategy === "pro_rata_adjust") {
        for (const payment of entangledSettlements) {
          const totalAmount = expense.totalAmount;
          const entangledAmount = Math.round(Math.min(payment.amountSettled, totalAmount) * 100) / 100;
          const remainingAmount = Math.round((payment.amountSettled - entangledAmount) * 100) / 100;
          
          if (remainingAmount <= 0.01) {
            await ctx.db.patch(payment._id, {
              amountSettled: 0,
              isArchived: true,
            });
          } else {
            await ctx.db.patch(payment._id, {
              amountSettled: remainingAmount,
            });
          }
        }
      }
    }

    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: args.excludeFromSettlement ? "expense.excluded" : "expense.included",
      eventGroup: "expenses",
      surface: "editExpenses",
      targetKind: "expense",
      metadata: {
        amountBucket: bucketAmount(expense.totalAmount),
        splitMethod: expense.splitMethod,
        strategy: args.strategy ?? "none",
      },
    });
  },
});

export const deleteExpense = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const expense: any = await ctx.db.get(args.id as any);
    if (!expense) throw new ConvexError("Expense not found.");
    await ctx.db.delete(expense._id);
    await syncCatalogForExpenseChange(ctx, expense, null);
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "expense.deleted",
      eventGroup: "expenses",
      surface: "editExpenses",
      targetKind: "expense",
      metadata: {
        amountBucket: bucketAmount(expense.totalAmount),
        splitMethod: expense.splitMethod,
        itemCount: expense.items?.length ?? 0,
      },
    });
  },
});

export const listSettlementPayments = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedSupabaseUserId(ctx);
    const payments = await ctx.db.query("settlementPayments").collect();
    return payments
      .map(settlementPaymentDto)
      .sort(
        (a, b) =>
          new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime(),
      );
  },
});

export const addSettlementPayment = mutation({
  args: {
    debtorId: v.string(),
    creditorId: v.string(),
    amountSettled: v.number(),
    markedByUserId: v.string(),
    settledAt: v.optional(v.string()),
    notes: v.optional(v.union(v.string(), v.null())),
    associatedExpenseId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const amountSettled = Math.round(args.amountSettled * 100) / 100;
    const id = await ctx.db.insert("settlementPayments", {
      debtorId: args.debtorId,
      creditorId: args.creditorId,
      amountSettled,
      markedByUserId: args.markedByUserId,
      settledAt: args.settledAt ?? nowIso(),
      notes: args.notes ?? null,
      associatedExpenseId: args.associatedExpenseId ?? null,
    });
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "settlement.created",
      eventGroup: "settlements",
      surface: "manageSettlements",
      targetKind: "settlementPayment",
      metadata: { amountBucket: bucketAmount(amountSettled) },
    });
    return id;
  },
});

export const updateSettlementPayment = mutation({
  args: {
    id: v.string(),
    amountSettled: v.number(),
    notes: v.optional(v.union(v.string(), v.null())),
    settledAt: v.string(),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const payment: any = await ctx.db.get(args.id as any);
    if (!payment) throw new ConvexError("Payment not found.");
    const amountSettled = Math.round(args.amountSettled * 100) / 100;
    await ctx.db.patch(payment._id, {
      amountSettled,
      notes: args.notes ?? null,
      settledAt: args.settledAt,
    });
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "settlement.updated",
      eventGroup: "settlements",
      surface: "manageSettlements",
      targetKind: "settlementPayment",
      metadata: { amountBucket: bucketAmount(amountSettled) },
    });
  },
});

export const deleteSettlementPayment = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const payment: any = await ctx.db.get(args.id as any);
    if (!payment) throw new ConvexError("Payment not found.");
    await ctx.db.delete(payment._id);
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "settlement.deleted",
      eventGroup: "settlements",
      surface: "manageSettlements",
      targetKind: "settlementPayment",
      metadata: { amountBucket: bucketAmount(payment.amountSettled) },
    });
  },
});

export const listManualSettlementOverrides = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedSupabaseUserId(ctx);
    const overrides = await ctx.db.query("manualSettlementOverrides").collect();
    return overrides
      .map(manualOverrideDto)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  },
});

export const addManualSettlementOverride = mutation({
  args: {
    debtorId: v.string(),
    creditorId: v.string(),
    amount: v.number(),
    createdByUserId: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const timestamp = nowIso();
    const amount = Math.round(args.amount * 100) / 100;
    const id = await ctx.db.insert("manualSettlementOverrides", {
      debtorId: args.debtorId,
      creditorId: args.creditorId,
      amount,
      createdByUserId: args.createdByUserId ?? null,
      notes: args.notes ?? null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "manual_override.created",
      eventGroup: "settlements",
      surface: "manageSettlements",
      targetKind: "manualSettlementOverride",
      metadata: { amountBucket: bucketAmount(amount) },
    });
    return id;
  },
});

export const deactivateManualSettlementOverride = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const override: any = await ctx.db.get(args.id as any);
    if (!override) throw new ConvexError("Override not found.");
    await ctx.db.patch(override._id, { isActive: false, updatedAt: nowIso() });
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "manual_override.deactivated",
      eventGroup: "settlements",
      surface: "manageSettlements",
      targetKind: "manualSettlementOverride",
      metadata: { amountBucket: bucketAmount(override.amount) },
    });
  },
});

export const deleteManualSettlementOverride = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const override: any = await ctx.db.get(args.id as any);
    if (!override) throw new ConvexError("Override not found.");
    await ctx.db.delete(override._id);
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "manual_override.deleted",
      eventGroup: "settlements",
      surface: "manageSettlements",
      targetKind: "manualSettlementOverride",
      metadata: { amountBucket: bucketAmount(override.amount) },
    });
  },
});

export const clearActiveManualSettlementOverrides = mutation({
  args: {},
  handler: async (ctx) => {
    const actorUserId = await requireAdmin(ctx);
    const overrides = await ctx.db.query("manualSettlementOverrides").collect();
    const activeOverrides = overrides.filter((override: any) => override.isActive);
    await Promise.all(
      activeOverrides
        .map((override: any) =>
          ctx.db.patch(override._id, { isActive: false, updatedAt: nowIso() }),
        ),
    );
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "manual_override.cleared",
      eventGroup: "settlements",
      surface: "manageSettlements",
      targetKind: "manualSettlementOverride",
      metadata: { manualOverrideCount: activeOverrides.length },
    });
  },
});

export const getActiveAiPrompt = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const prompt = await ctx.db
      .query("aiPrompts")
      .withIndex("by_name_active", (q) =>
        q.eq("name", args.name).eq("isActive", true),
      )
      .first();
    return aiPromptDto(prompt);
  },
});

export const getActiveAiConfig = query({
  args: { key: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const configKey = args.key ?? DEFAULT_AI_CONFIG_KEY;

    try {
      const config = await ctx.db
        .query("aiConfigs")
        .withIndex("by_key", (q) => q.eq("key", configKey))
        .first();
      return aiConfigDto(config, configKey);
    } catch (error) {
      console.warn(
        "Falling back to default AI config after read failure:",
        error,
      );
      return defaultAiConfigDto(configKey);
    }
  },
});

export const listAiModelCapabilities = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("aiModelCapabilities").collect();
  },
});

export const updateAiConfig = mutation({
  args: {
    expectedEnvironment: settleEaseEnvironment,
    modelCode: aiModelCode,
    fallbackModelCodes: v.array(aiModelCode),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireAdmin(ctx);
    requireExpectedEnvironment(args.expectedEnvironment);

    const fallbackModelCodes = [
      ...new Set(
        args.fallbackModelCodes.filter((code) => code !== args.modelCode),
      ),
    ];
    const normalizedFallbacks =
      fallbackModelCodes.length > 0
        ? fallbackModelCodes
        : DEFAULT_AI_FALLBACK_MODEL_CODES.filter(
            (code) => code !== args.modelCode,
          );
    const timestamp = nowIso();
    const payload = {
      key: DEFAULT_AI_CONFIG_KEY,
      modelCode: args.modelCode,
      fallbackModelCodes: normalizedFallbacks,
      updatedAt: timestamp,
      updatedByUserId: supabaseUserId,
    };
    const existing = await ctx.db
      .query("aiConfigs")
      .withIndex("by_key", (q: any) => q.eq("key", DEFAULT_AI_CONFIG_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      const result = aiConfigDto(await ctx.db.get(existing._id));
      await recordUsageEvent(ctx, {
        actorUserId: supabaseUserId,
        actorRole: "admin",
        eventName: "settings.ai_config_saved",
        eventGroup: "settings",
        surface: "settings",
        targetKind: "aiConfig",
        metadata: {
          aiModelName: args.modelCode,
          fallback: normalizedFallbacks.length > 0,
        },
      });
      return result;
    }

    const id = await ctx.db.insert("aiConfigs", payload);
    const result = aiConfigDto(await ctx.db.get(id));
    await recordUsageEvent(ctx, {
      actorUserId: supabaseUserId,
      actorRole: "admin",
      eventName: "settings.ai_config_saved",
      eventGroup: "settings",
      surface: "settings",
      targetKind: "aiConfig",
      metadata: {
        aiModelName: args.modelCode,
        fallback: normalizedFallbacks.length > 0,
      },
    });
    return result;
  },
});

export const getAiSummaryByHash = query({
  args: { dataHash: v.string() },
  handler: async (ctx, args) => {
    await requireAuthenticatedSupabaseUserId(ctx);
    const summary = await ctx.db
      .query("aiSummaries")
      .withIndex("by_data_hash", (q) => q.eq("dataHash", args.dataHash))
      .first();
    if (!summary || summary.cacheKeyVersion !== 3 || summary.status !== "ready") return null;
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
  },
});

export const storeAiSummary = mutation({
  args: {
    userId: v.string(),
    dataHash: v.string(),
    summary: v.string(),
    modelName: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
    const requestedUserId = normalizeSupabaseUserId(args.userId);
    if (requestedUserId !== supabaseUserId) {
      throw new ConvexError("Cannot store summaries for another user.");
    }
    const existing = await ctx.db
      .query("aiSummaries")
      .withIndex("by_data_hash", (q) => q.eq("dataHash", args.dataHash))
      .first();
    const timestamp = nowIso();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: supabaseUserId,
        summary: args.summary,
        modelName: args.modelName ?? null,
        status: "ready",
        generationId: null,
        lastError: null,
        updatedAt: timestamp,
      });
      return existing._id;
    }
    return await ctx.db.insert("aiSummaries", {
      userId: supabaseUserId,
      dataHash: args.dataHash,
      summary: args.summary,
      modelName: args.modelName ?? null,
      status: "ready",
      generationId: null,
      lastError: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const getAiRedactionByHash = query({
  args: { dataHash: v.string() },
  handler: async (ctx, args) => {
    await requireAuthenticatedSupabaseUserId(ctx);
    const redaction = await ctx.db
      .query("aiRedactions")
      .withIndex("by_data_hash", (q) => q.eq("dataHash", args.dataHash))
      .first();
    if (!redaction) return null;
    return {
      id: redaction._id,
      user_id: redaction.userId,
      data_hash: redaction.dataHash,
      redactions: redaction.redactions,
      model_name: redaction.modelName ?? null,
      created_at: redaction.createdAt,
      updated_at: redaction.updatedAt,
    };
  },
});

export const storeAiRedaction = mutation({
  args: {
    userId: v.string(),
    dataHash: v.string(),
    redactions: v.string(),
    modelName: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
    if (args.userId !== supabaseUserId) {
      throw new ConvexError("Cannot store redactions for another user.");
    }
    const existing = await ctx.db
      .query("aiRedactions")
      .withIndex("by_data_hash", (q) => q.eq("dataHash", args.dataHash))
      .first();
    if (existing) return existing._id;
    const timestamp = nowIso();
    return await ctx.db.insert("aiRedactions", {
      userId: args.userId,
      dataHash: args.dataHash,
      redactions: args.redactions,
      modelName: args.modelName ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const trackUsageEvent = mutation({
  args: {
    eventName: v.string(),
    eventGroup: v.optional(v.string()),
    surface: v.string(),
    status: v.optional(usageEventStatus),
    sessionId: v.optional(v.union(v.string(), v.null())),
    targetKind: v.optional(v.union(v.string(), v.null())),
    durationMs: v.optional(v.union(v.number(), v.null())),
    metadataJson: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAuthenticatedSupabaseUserId(ctx);
    await recordUsageEvent(ctx, {
      actorUserId,
      sessionId: args.sessionId ?? null,
      eventName: args.eventName,
      eventGroup: args.eventGroup,
      surface: args.surface,
      status: args.status ?? "success",
      source: "client",
      targetKind: args.targetKind ?? null,
      durationMs: args.durationMs ?? null,
      metadata: args.metadataJson ?? null,
    });
  },
});

export const getAppUsageAnalytics = query({
  args: {
    datePreset: v.optional(usageDatePreset),
    surface: v.optional(v.string()),
    status: v.optional(v.string()),
    role: v.optional(v.string()),
    eventGroup: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const datePreset = args.datePreset ?? "30d";
    const startDateKey = usageRangeStartDateKey(datePreset);
    const allRollups = await ctx.db
      .query("usageDailyRollups")
      .withIndex("by_date_key", (q: any) => q.gte("dateKey", startDateKey))
      .collect();

    const rollups = allRollups.filter((row: any) => {
      if (args.surface && args.surface !== "all" && row.surface !== args.surface) return false;
      if (args.status && args.status !== "all" && row.status !== args.status) return false;
      if (args.role && args.role !== "all" && row.actorRole !== args.role) return false;
      if (args.eventGroup && args.eventGroup !== "all" && row.eventGroup !== args.eventGroup) return false;
      return true;
    });

    const touches = await ctx.db
      .query("usageDailyTouches")
      .withIndex("by_date_kind", (q: any) => q.gte("dateKey", startDateKey))
      .collect();
    const filteredTouches = touches.filter((touch: any) => {
      if (args.role && args.role !== "all" && touch.actorRole !== args.role) return false;
      return true;
    });

    const totalEvents = rollups.reduce((sum: number, row: any) => sum + Number(row.count || 0), 0);
    const failureEvents = rollups
      .filter((row: any) => row.status === "failure")
      .reduce((sum: number, row: any) => sum + Number(row.count || 0), 0);
    const cancelledEvents = rollups
      .filter((row: any) => row.status === "cancelled")
      .reduce((sum: number, row: any) => sum + Number(row.count || 0), 0);
    const userTouches = new Set(
      filteredTouches
        .filter((touch: any) => touch.touchKind === "user")
        .map((touch: any) => touch.touchIdHash),
    );
    const sessionTouches = new Set(
      filteredTouches
        .filter((touch: any) => touch.touchKind === "session")
        .map((touch: any) => touch.touchIdHash),
    );

    const increment = (
      map: Record<string, number>,
      key: string,
      count: number,
    ) => {
      map[key] = (map[key] ?? 0) + count;
    };

    const byDate: Record<string, number> = {};
    const bySurface: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byEventGroup: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const eventCount = (name: string) =>
      rollups
        .filter((row: any) => row.eventName === name)
        .reduce((sum: number, row: any) => sum + Number(row.count || 0), 0);

    for (const row of rollups as any[]) {
      const count = Number(row.count || 0);
      increment(byDate, row.dateKey, count);
      increment(bySurface, row.surface, count);
      increment(byStatus, row.status, count);
      increment(byEventGroup, row.eventGroup, count);
      increment(byAction, row.eventName, count);
    }

    const sortRows = (map: Record<string, number>, limit = 12) =>
      Object.entries(map)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
        .slice(0, limit);

    const topSurface = sortRows(bySurface, 1)[0] ?? null;
    const scanSuccess = eventCount("scan.receipt_scan_completed");
    const scanFailures =
      eventCount("scan.receipt_scan_failed") + eventCount("scan.receipt_scan_cancelled");
    const aiCacheHits =
      eventCount("report.redaction_cache_hit") +
      eventCount("summary.cache_hit") +
      eventCount("health.cache_hit");
    const aiGenerated =
      eventCount("report.redaction_generated") +
      eventCount("summary.generated") +
      eventCount("health.generated");
    const aiFallbacks =
      eventCount("report.redaction_fallback") +
      eventCount("summary.failed") +
      eventCount("health.failed") +
      eventCount("budget.vat_classification_failed");

    return {
      datePreset,
      filters: {
        surface: args.surface ?? "all",
        status: args.status ?? "all",
        role: args.role ?? "all",
        eventGroup: args.eventGroup ?? "all",
      },
      range: {
        startDateKey,
        endDateKey: usageDateKey(),
      },
      cards: {
        activeUsers: userTouches.size,
        sessions: sessionTouches.size,
        totalEvents,
        failureRate: totalEvents > 0 ? failureEvents / totalEvents : 0,
        topSurface: topSurface?.key ?? "none",
        expenseSaves: eventCount("expense.created") + eventCount("expense.updated"),
        scanSuccessRate:
          scanSuccess + scanFailures > 0 ? scanSuccess / (scanSuccess + scanFailures) : 0,
        settlementActions:
          eventCount("settlement.created") +
          eventCount("settlement.updated") +
          eventCount("settlement.deleted"),
        reportDownloads: eventCount("report.download_clicked"),
        aiCacheRate:
          aiCacheHits + aiGenerated > 0 ? aiCacheHits / (aiCacheHits + aiGenerated) : 0,
        aiFallbackFailureRate:
          aiCacheHits + aiGenerated + aiFallbacks > 0
            ? aiFallbacks / (aiCacheHits + aiGenerated + aiFallbacks)
            : 0,
      },
      totals: {
        success: byStatus.success ?? 0,
        failure: failureEvents,
        cancelled: cancelledEvents,
        info: byStatus.info ?? 0,
      },
      activityByDate: Object.entries(byDate)
        .map(([dateKey, count]) => ({ dateKey, count }))
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
      featureAdoption: sortRows(bySurface, 16),
      eventGroups: sortRows(byEventGroup, 16),
      statuses: sortRows(byStatus, 8),
      topActions: sortRows(byAction, 16),
      workflowFunnel: [
        { key: "session.started", count: eventCount("session.started") },
        { key: "expense.created", count: eventCount("expense.created") },
        { key: "scan.receipt_scan_completed", count: eventCount("scan.receipt_scan_completed") },
        { key: "settlement.created", count: eventCount("settlement.created") },
        { key: "report.preview_generated", count: eventCount("report.preview_generated") },
        { key: "report.download_clicked", count: eventCount("report.download_clicked") },
      ],
      aiReportHealth: [
        { key: "AI cache hits", count: aiCacheHits },
        { key: "AI generated", count: aiGenerated },
        { key: "AI fallback/failure", count: aiFallbacks },
        { key: "Report previews", count: eventCount("report.preview_generated") },
        { key: "Report downloads", count: eventCount("report.download_clicked") },
      ],
    };
  },
});

export const trackReportGenerationEvent = mutation({
  args: {
    userId: v.string(),
    eventType: reportGenerationEventType,
    reportMode: exportReportMode,
    datePreset: v.string(),
    dateRangeLabel: v.string(),
    redacted: v.boolean(),
    usedCache: v.optional(v.union(v.boolean(), v.null())),
    aiModelName: v.optional(v.union(v.string(), v.null())),
    expenseCount: v.number(),
    settlementCount: v.number(),
    participantCount: v.number(),
    manualOverrideCount: v.number(),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
    if (args.userId !== supabaseUserId) {
      throw new ConvexError("Cannot track report events for another user.");
    }

    const id = await ctx.db.insert("reportGenerationEvents", {
      ...args,
      usedCache: args.usedCache ?? null,
      aiModelName: args.aiModelName ?? null,
      createdAt: nowIso(),
    });

    await recordUsageEvent(ctx, {
      actorUserId: supabaseUserId,
      actorRole: "admin",
      eventName: `report.${args.eventType}`,
      eventGroup: "report",
      surface: "exportExpense",
      status: args.eventType === "redaction_fallback" ? "info" : "success",
      source: "compat",
      targetKind: "report",
      metadata: {
        eventType: args.eventType,
        reportMode: args.reportMode,
        datePreset: args.datePreset,
        redacted: args.redacted,
        usedCache: args.usedCache ?? false,
        aiModelName: args.aiModelName ?? undefined,
        expenseCount: args.expenseCount,
        settlementCount: args.settlementCount,
        participantCount: args.participantCount,
        manualOverrideCount: args.manualOverrideCount,
      },
    });

    return id;
  },
});

export const getReportGenerationAnalytics = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 500), 1), 1000);
    const events = await ctx.db
      .query("reportGenerationEvents")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);

    const byEventType: Record<string, number> = {};
    const byReportMode = { group: 0, personal: 0 };
    const byDatePreset: Record<string, number> = {};
    let redactedEvents = 0;
    let cacheHits = 0;
    let fallbackEvents = 0;
    let generatedRedactions = 0;

    for (const event of events) {
      byEventType[event.eventType] = (byEventType[event.eventType] ?? 0) + 1;
      byDatePreset[event.datePreset] =
        (byDatePreset[event.datePreset] ?? 0) + 1;
      if (event.reportMode === "group") byReportMode.group += 1;
      if (event.reportMode === "personal") byReportMode.personal += 1;
      if (event.redacted) redactedEvents += 1;
      if (event.eventType === "redaction_cache_hit" || event.usedCache === true)
        cacheHits += 1;
      if (event.eventType === "redaction_fallback") fallbackEvents += 1;
      if (event.eventType === "redaction_generated") generatedRedactions += 1;
    }

    return {
      sampledEventCount: events.length,
      actions: {
        previews: byEventType.preview_generated ?? 0,
        prints: byEventType.print_clicked ?? 0,
        downloads: byEventType.download_clicked ?? 0,
      },
      redaction: {
        enabledEvents: redactedEvents,
        cacheHits,
        generated: generatedRedactions,
        fallbacks: fallbackEvents,
      },
      byEventType,
      byReportMode,
      byDatePreset,
      recentEvents: events.slice(0, 50).map((event: any) => ({
        eventType: event.eventType,
        reportMode: event.reportMode,
        datePreset: event.datePreset,
        dateRangeLabel: event.dateRangeLabel,
        redacted: event.redacted,
        usedCache: event.usedCache ?? null,
        aiModelName: event.aiModelName ?? null,
        expenseCount: event.expenseCount,
        settlementCount: event.settlementCount,
        participantCount: event.participantCount,
        manualOverrideCount: event.manualOverrideCount,
        createdAt: event.createdAt,
      })),
    };
  },
});

export const clearReportGenerationEvents = mutation({
  args: {
    expectedEnvironment: settleEaseEnvironment,
    confirmation: v.string(),
    dangerZoneUnlockConfirmation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    requireDangerAction(
      args.expectedEnvironment,
      args.confirmation,
      getDangerConfirmationPhrase(
        args.expectedEnvironment,
        "clearReportLogs",
      ),
      args.dangerZoneUnlockConfirmation,
    );

    const deletedCount = await deleteAllFromTable(
      ctx,
      "reportGenerationEvents",
    );
    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "settings.report_logs_cleared",
      eventGroup: "settings",
      surface: "settings",
      targetKind: "reportGenerationEvents",
      metadata: { eventType: "clear_report_logs" },
    });
    return { deletedCount };
  },
});

export const clearAppUsageAnalytics = mutation({
  args: {
    expectedEnvironment: settleEaseEnvironment,
    confirmation: v.string(),
    dangerZoneUnlockConfirmation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    requireDangerAction(
      args.expectedEnvironment,
      args.confirmation,
      getDangerConfirmationPhrase(args.expectedEnvironment, "clearUsageAnalytics"),
      args.dangerZoneUnlockConfirmation,
    );

    const deletedReportEvents = await deleteAllFromTable(
      ctx,
      "reportGenerationEvents",
    );
    const deletedUsageEvents = await deleteAllFromTable(ctx, "appUsageEvents");
    const deletedRollups = await deleteAllFromTable(ctx, "usageDailyRollups");
    const deletedTouches = await deleteAllFromTable(ctx, "usageDailyTouches");

    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "settings.usage_analytics_cleared",
      eventGroup: "settings",
      surface: "settings",
      targetKind: "appUsageEvents",
      metadata: { eventType: "clear_usage_analytics" },
    });

    return {
      deletedReportEvents,
      deletedUsageEvents,
      deletedRollups,
      deletedTouches,
    };
  },
});

export const clearAiCaches = mutation({
  args: {
    expectedEnvironment: settleEaseEnvironment,
    confirmation: v.string(),
    dangerZoneUnlockConfirmation: v.optional(v.string()),
    includeSummaries: v.optional(v.boolean()),
    includeRedactions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    requireDangerAction(
      args.expectedEnvironment,
      args.confirmation,
      getDangerConfirmationPhrase(args.expectedEnvironment, "clearAiCaches"),
      args.dangerZoneUnlockConfirmation,
    );

    const includeSummaries = args.includeSummaries ?? true;
    const includeRedactions = args.includeRedactions ?? true;
    const deletedSummaries = includeSummaries
      ? await deleteAllFromTable(ctx, "aiSummaries")
      : 0;
    const deletedRedactions = includeRedactions
      ? await deleteAllFromTable(ctx, "aiRedactions")
      : 0;

    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "settings.ai_caches_cleared",
      eventGroup: "settings",
      surface: "settings",
      targetKind: "aiCache",
      metadata: {
        eventType: "clear_ai_caches",
      },
    });

    return { deletedSummaries, deletedRedactions };
  },
});

export const clearSettlementRecords = mutation({
  args: {
    expectedEnvironment: settleEaseEnvironment,
    confirmation: v.string(),
    dangerZoneUnlockConfirmation: v.optional(v.string()),
    scope: settlementClearScope,
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const expectedConfirmation =
      args.scope === "activeManualOverrides"
        ? getDangerConfirmationPhrase(
            args.expectedEnvironment,
            "clearActiveOverrides",
          )
        : getDangerConfirmationPhrase(
            args.expectedEnvironment,
            "clearSettlementRecords",
          );

    requireDangerAction(
      args.expectedEnvironment,
      args.confirmation,
      expectedConfirmation,
      args.dangerZoneUnlockConfirmation,
    );

    if (args.scope === "activeManualOverrides") {
      const clearedManualOverrides = await patchAllFromTable(
        ctx,
        "manualSettlementOverrides",
        { isActive: false, updatedAt: nowIso() },
        (override) => override.isActive,
      );
      await recordUsageEvent(ctx, {
        actorUserId,
        actorRole: "admin",
        eventName: "settings.active_overrides_cleared",
        eventGroup: "settings",
        surface: "settings",
        targetKind: "manualSettlementOverride",
        metadata: { manualOverrideCount: clearedManualOverrides },
      });
      return {
        clearedManualOverrides,
        deletedSettlementPayments: 0,
        deletedManualOverrides: 0,
      };
    }

    const deletedSettlementPayments = await deleteAllFromTable(
      ctx,
      "settlementPayments",
    );
    const deletedManualOverrides = await deleteAllFromTable(
      ctx,
      "manualSettlementOverrides",
    );

    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: "settings.settlement_records_cleared",
      eventGroup: "settings",
      surface: "settings",
      targetKind: "settlementRecords",
      metadata: {
        paymentCount: deletedSettlementPayments,
        manualOverrideCount: deletedManualOverrides,
      },
    });

    return {
      clearedManualOverrides: 0,
      deletedSettlementPayments,
      deletedManualOverrides,
    };
  },
});

export const resetSettleEaseData = mutation({
  args: {
    expectedEnvironment: settleEaseEnvironment,
    confirmation: v.string(),
    dangerZoneUnlockConfirmation: v.optional(v.string()),
    mode: resetDataMode,
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    requireDangerAction(
      args.expectedEnvironment,
      args.confirmation,
      getDangerConfirmationPhrase(
        args.expectedEnvironment,
        args.mode === "factory" ? "factoryReset" : "resetOperational",
      ),
      args.dangerZoneUnlockConfirmation,
    );

    const deleted = {
      expenses: await deleteAllFromTable(ctx, "expenses"),
      settlementPayments: await deleteAllFromTable(ctx, "settlementPayments"),
      manualOverrides: await deleteAllFromTable(
        ctx,
        "manualSettlementOverrides",
      ),
      budgetItems: await deleteAllFromTable(ctx, "budgetItems"),
      budgetDrafts: await deleteAllFromTable(ctx, "budgetDrafts"),
      reportGenerationEvents: await deleteAllFromTable(
        ctx,
        "reportGenerationEvents",
      ),
      aiSummaries: await deleteAllFromTable(ctx, "aiSummaries"),
      aiRedactions: await deleteAllFromTable(ctx, "aiRedactions"),
      appUsageEvents: await deleteAllFromTable(ctx, "appUsageEvents"),
      usageDailyRollups: await deleteAllFromTable(ctx, "usageDailyRollups"),
      usageDailyTouches: await deleteAllFromTable(ctx, "usageDailyTouches"),
      people: 0,
      categories: 0,
    };

    if (args.mode === "factory") {
      deleted.people = await deleteAllFromTable(ctx, "people");
      deleted.categories = await deleteAllFromTable(ctx, "categories");
    }

    await recordUsageEvent(ctx, {
      actorUserId,
      actorRole: "admin",
      eventName: args.mode === "factory" ? "settings.factory_reset" : "settings.operational_reset",
      eventGroup: "settings",
      surface: "settings",
      targetKind: "appData",
      metadata: { mode: args.mode },
    });

    return {
      mode: args.mode,
      deleted,
    };
  },
});

// ==========================================
// Announcements DTO, Queries & Mutations
// ==========================================

function announcementDto(ann: any) {
  if (!ann) return null;
  return {
    id: ann._id,
    title: ann.title,
    description: ann.description,
    tone: ann.tone,
    icon_name: ann.iconName,
    display_frequency: ann.displayFrequency,
    is_active: ann.isActive,
    created_at: ann.createdAt,
    updated_at: ann.updatedAt,
    created_by_user_id: ann.createdByUserId ?? null,
  };
}

export const listActiveAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const active = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q: any) => q.eq("isActive", true))
      .collect();
    return active.map(announcementDto);
  },
});

export const listAllAnnouncementsForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("announcements").collect();
    return all
      .map(announcementDto)
      .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
  },
});

export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    tone: v.union(
      v.literal("default"),
      v.literal("success"),
      v.literal("warning"),
      v.literal("danger"),
      v.literal("brand"),
    ),
    iconName: v.string(),
    displayFrequency: v.union(
      v.literal("once"),
      v.literal("everytime"),
    ),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAdmin(ctx);
    const now = nowIso();
    const id = await ctx.db.insert("announcements", {
      title: args.title,
      description: args.description,
      tone: args.tone,
      iconName: args.iconName,
      displayFrequency: args.displayFrequency,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
      createdByUserId: actorUserId,
    });
    return announcementDto(await ctx.db.get(id));
  },
});

export const updateAnnouncement = mutation({
  args: {
    id: v.string(),
    title: v.string(),
    description: v.string(),
    tone: v.union(
      v.literal("default"),
      v.literal("success"),
      v.literal("warning"),
      v.literal("danger"),
      v.literal("brand"),
    ),
    iconName: v.string(),
    displayFrequency: v.union(
      v.literal("once"),
      v.literal("everytime"),
    ),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const announcement = await ctx.db.get(args.id as any);
    if (!announcement) throw new ConvexError("Announcement not found.");

    const updates = {
      title: args.title,
      description: args.description,
      tone: args.tone,
      iconName: args.iconName,
      displayFrequency: args.displayFrequency,
      isActive: args.isActive,
      updatedAt: nowIso(),
    };
    await ctx.db.patch(announcement._id, updates);
    return announcementDto(await ctx.db.get(announcement._id));
  },
});

export const toggleAnnouncementActive = mutation({
  args: {
    id: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const announcement = await ctx.db.get(args.id as any);
    if (!announcement) throw new ConvexError("Announcement not found.");

    await ctx.db.patch(announcement._id, {
      isActive: args.isActive,
      updatedAt: nowIso(),
    });
    return announcementDto(await ctx.db.get(announcement._id));
  },
});

export const deleteAnnouncement = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const announcement = await ctx.db.get(args.id as any);
    if (!announcement) throw new ConvexError("Announcement not found.");

    await ctx.db.delete(announcement._id);
    return { success: true, id: args.id };
  },
});

export const markAnnouncementAsSeen = mutation({
  args: {
    supabaseUserId: v.string(),
    announcementId: v.string(),
  },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireSelf(ctx, args.supabaseUserId);
    const profile = await getProfileBySupabaseUserId(ctx, supabaseUserId);
    if (!profile) throw new ConvexError("User profile not found.");

    const currentSeen = profile.seenAnnouncementIds ?? [];
    if (!currentSeen.includes(args.announcementId)) {
      const updatedSeen = [...currentSeen, args.announcementId];
      await ctx.db.patch(profile._id, {
        seenAnnouncementIds: updatedSeen,
        updatedAt: nowIso(),
      });
    }
    return profileDto(await ctx.db.get(profile._id));
  },
});

export const logOutGlobally = mutation({
  args: {},
  handler: async (ctx) => {
    const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
    const profile = await getProfileBySupabaseUserId(ctx, supabaseUserId);
    if (!profile) return;

    await ctx.db.patch(profile._id, {
      lastGlobalLogoutAt: nowIso(),
      updatedAt: nowIso(),
    });
  },
});

export const analyzeExpenseExclusionImpact = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAuthenticatedSupabaseUserId(ctx);
    const expense: any = await ctx.db.get(args.id as any);
    if (!expense) throw new ConvexError("Expense not found.");

    const allExpenses = await ctx.db.query("expenses").collect();
    const people = await ctx.db.query("people").collect();
    const settlements = await ctx.db.query("settlementPayments").collect();

    const peopleMap = new Map(people.map((p) => [p._id, p.name]));

    const expenseDate = new Date(expense.createdAt || 0).getTime();
    const expenseParticipantIds = new Set([
      ...(expense.paidBy ?? []).map((p: any) => p.personId),
      ...(expense.shares ?? []).map((s: any) => s.personId),
    ]);

    const totalAmount = expense.totalAmount;

    // Helper: pre-filter and structure all entangled settlements
    const entangledSettlements = settlements.map((payment) => {
      const debtorName = peopleMap.get(payment.debtorId as any) || "Unknown";
      const creditorName = peopleMap.get(payment.creditorId as any) || "Unknown";
      const paymentDate = new Date(payment.settledAt).getTime();

      const isExplicitLink = payment.associatedExpenseId === args.id;
      const isLegacyGeneral = !isExplicitLink && 
        expenseParticipantIds.has(payment.debtorId) &&
        expenseParticipantIds.has(payment.creditorId) &&
        paymentDate >= expenseDate - 60000;

      if (!isExplicitLink && !isLegacyGeneral) return null;

      const entangledAmount = Math.round(Math.min(payment.amountSettled, totalAmount) * 100) / 100;

      return {
        id: payment._id,
        debtorId: payment.debtorId,
        creditorId: payment.creditorId,
        debtorName,
        creditorName,
        amountSettled: payment.amountSettled,
        entangledAmount,
        settledAt: payment.settledAt,
        associationType: isExplicitLink ? ("explicit_link" as const) : ("legacy_general" as const),
        impactSeverity: isExplicitLink ? ("critical" as const) : ("warning" as const),
      };
    }).filter((s) => s !== null) as any[];

    const hasSettlements = entangledSettlements.length > 0;

    // Unified helper: compute ledger balances for any simulated strategy
    const computeLedgerBalances = (
      excludeTargetExpense: boolean,
      settlementModifications?: {
        archivedIds: Set<string>;
        adjustedAmounts: Map<string, number>;
      },
      simulatedStrategy?: string
    ) => {
      const balances: Record<string, number> = {};
      people.forEach((p) => (balances[p._id] = 0));

      const lahuExcludedExpenses = allExpenses.filter((exp) => {
        const isExcluded = exp.excludeFromSettlement || (excludeTargetExpense && exp._id === args.id);
        const strategy = exp._id === args.id 
          ? (simulatedStrategy || exp.exclusionStrategy) 
          : exp.exclusionStrategy;
        return isExcluded && strategy === "lahu_debt_settlement";
      });

      allExpenses.forEach((exp) => {
        const isExcluded = exp.excludeFromSettlement || (excludeTargetExpense && exp._id === args.id);
        if (isExcluded) return;

        const discountAmount = exp.discount || 0;
        const totalPaid = Array.isArray(exp.paidBy)
          ? exp.paidBy.reduce((sum: number, pb: any) => sum + Number(pb.amount), 0)
          : 0;

        if (Array.isArray(exp.paidBy)) {
          exp.paidBy.forEach((p: any) => {
            const pPaid = Number(p.amount);
            const pActualPaid = totalPaid > 0 ? pPaid - (discountAmount * (pPaid / totalPaid)) : pPaid;
            balances[p.personId] = (balances[p.personId] || 0) + pActualPaid;
          });
        }
        if (Array.isArray(exp.shares)) {
          exp.shares.forEach((s: any) => {
            balances[s.personId] = (balances[s.personId] || 0) - Number(s.amount);
          });
        }
        if (exp.celebrationContribution && exp.celebrationContribution.amount > 0) {
          const contributorId = exp.celebrationContribution.personId;
          balances[contributorId] = (balances[contributorId] || 0) - Number(exp.celebrationContribution.amount);
        }
      });

      settlements.forEach((payment) => {
        if (payment.isArchived) return;
        if (settlementModifications?.archivedIds.has(payment._id)) return;

        // Skip if legacy-general entangled with any Lahu-excluded expense
        const isLegacyGeneralEntangled = lahuExcludedExpenses.some((exp) => {
          const expenseDate = new Date(exp.createdAt || 0).getTime();
          const paymentDate = new Date(payment.settledAt).getTime();

          const expenseParticipantIds = new Set([
            ...(exp.paidBy ?? []).map((p: any) => p.personId),
            ...(exp.shares ?? []).map((s: any) => s.personId),
          ]);

          return (
            !payment.associatedExpenseId &&
            expenseParticipantIds.has(payment.debtorId) &&
            expenseParticipantIds.has(payment.creditorId) &&
            paymentDate >= expenseDate - 60000
          );
        });

        if (isLegacyGeneralEntangled) return;

        let activeAmount = Number(payment.amountSettled);
        if (settlementModifications?.adjustedAmounts.has(payment._id)) {
          activeAmount = settlementModifications.adjustedAmounts.get(payment._id)!;
        }

        balances[payment.debtorId] = (balances[payment.debtorId] || 0) + activeAmount;
        balances[payment.creditorId] = (balances[payment.creditorId] || 0) - activeAmount;
      });

      Object.keys(balances).forEach((key) => {
        balances[key] = Math.round(balances[key] * 100) / 100;
      });

      return balances;
    };

    // Calculate baseline current balances (target expense active, all settlements active)
    const currentBalances = computeLedgerBalances(false);

    // Lock & Carry Forward Simulation (target expense excluded, all settlements fully active)
    const lockAndCarryBalances = computeLedgerBalances(true, undefined, "lock_and_carry");
    const lockAndCarryShifts = people.map((p) => {
      const current = currentBalances[p._id] || 0;
      const projected = lockAndCarryBalances[p._id] || 0;
      const shift = Math.round((projected - current) * 100) / 100;
      return {
        personId: p._id,
        personName: p.name,
        currentBalance: current,
        projectedBalance: projected,
        shiftAmount: shift,
      };
    }).filter((shift) => Math.abs(shift.shiftAmount) >= 0.01);

    // Pro-Rata Simulation (target expense excluded, overlapping settlements scaled down)
    const proRataArchivedIds = new Set<string>();
    const proRataAdjustedAmounts = new Map<string, number>();
    entangledSettlements.forEach((payment) => {
      const entangledAmount = Math.min(payment.amountSettled, totalAmount);
      const remainingAmount = payment.amountSettled - entangledAmount;
      if (remainingAmount <= 0.01) {
        proRataArchivedIds.add(payment.id);
      } else {
        proRataAdjustedAmounts.set(payment.id, Math.round(remainingAmount * 100) / 100);
      }
    });

    const proRataBalances = computeLedgerBalances(true, {
      archivedIds: proRataArchivedIds,
      adjustedAmounts: proRataAdjustedAmounts,
    }, "pro_rata_adjust");
    const proRataShifts = people.map((p) => {
      const current = currentBalances[p._id] || 0;
      const projected = proRataBalances[p._id] || 0;
      const shift = Math.round((projected - current) * 100) / 100;
      return {
        personId: p._id,
        personName: p.name,
        currentBalance: current,
        projectedBalance: projected,
        shiftAmount: shift,
      };
    }).filter((shift) => Math.abs(shift.shiftAmount) >= 0.01);

    // Unlink & Archive Simulation (target expense excluded, overlapping settlements voided/archived)
    const unlinkArchivedIds = new Set<string>(entangledSettlements.map((s) => s.id));
    const unlinkBalances = computeLedgerBalances(true, {
      archivedIds: unlinkArchivedIds,
      adjustedAmounts: new Map(),
    }, "unlink_and_archive");
    const unlinkShifts = people.map((p) => {
      const current = currentBalances[p._id] || 0;
      const projected = unlinkBalances[p._id] || 0;
      const shift = Math.round((projected - current) * 100) / 100;
      return {
        personId: p._id,
        personName: p.name,
        currentBalance: current,
        projectedBalance: projected,
        shiftAmount: shift,
      };
    }).filter((shift) => Math.abs(shift.shiftAmount) >= 0.01);

    // Lahu Debt Settlement Simulation
    // 1. Calculate General Balances (excluding this expense and any explicit settlements)
    const lahuExclSettlementIds = new Set<string>(entangledSettlements.map(s => s.id));
    const lahuGeneralBalances = computeLedgerBalances(true, {
      archivedIds: lahuExclSettlementIds,
      adjustedAmounts: new Map()
    }, "lahu_debt_settlement");

    // 2. Calculate dynamic pairwise Lahu obligations
    const lahuDirectDebts: Array<{
      fromId: string;
      toId: string;
      amount: number;
    }> = [];

    const lahuDirectBalances: Record<string, number> = {};
    people.forEach(p => lahuDirectBalances[p._id] = 0);

    // Identify net creditors/debtors for this specific expense
    const rawContributions: Record<string, number> = {};
    const targetDiscountAmount = expense.discount || 0;
    const targetTotalPaid = Array.isArray(expense.paidBy)
      ? expense.paidBy.reduce((sum: number, pb: any) => sum + Number(pb.amount), 0)
      : 0;

    people.forEach(p => {
      const pPaid = expense.paidBy?.find((pb: any) => pb.personId === p._id)?.amount || 0;
      const pActualPaid = targetTotalPaid > 0 ? pPaid - (targetDiscountAmount * (pPaid / targetTotalPaid)) : pPaid;
      const share = expense.shares?.find((s: any) => s.personId === p._id)?.amount || 0;
      let totalShare = Number(share);
      if (expense.celebrationContribution && expense.celebrationContribution.personId === p._id) {
        totalShare += Number(expense.celebrationContribution.amount);
      }
      rawContributions[p._id] = pActualPaid - totalShare;
    });

    // Adjust raw contributions by applying entangled settlements
    const lahuAdjustedContributions = { ...rawContributions };
    entangledSettlements.forEach((sp) => {
      const debtorId = sp.debtorId;
      const creditorId = sp.creditorId;
      const settledAmount = Number(sp.amountSettled);

      if (lahuAdjustedContributions[debtorId] !== undefined) {
        lahuAdjustedContributions[debtorId] += settledAmount;
      }
      if (lahuAdjustedContributions[creditorId] !== undefined) {
        lahuAdjustedContributions[creditorId] -= settledAmount;
      }
    });

    // Identify surplus (creditors) and deficit (debtors) based on adjusted contributions
    const lahuCreditors = Object.entries(lahuAdjustedContributions)
      .filter(([_, contrib]) => contrib > 0.009)
      .map(([id, contrib]) => ({ id, amount: Math.round(contrib * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);

    const lahuDebtors = Object.entries(lahuAdjustedContributions)
      .filter(([_, contrib]) => contrib < -0.009)
      .map(([id, contrib]) => ({ id, amount: Math.round(Math.abs(contrib) * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);

    let lahuDebtorIndex = 0;
    let lahuCreditorIndex = 0;

    while (lahuDebtorIndex < lahuDebtors.length && lahuCreditorIndex < lahuCreditors.length) {
      const debtor = lahuDebtors[lahuDebtorIndex];
      const creditor = lahuCreditors[lahuCreditorIndex];

      const settlementAmount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

      if (settlementAmount >= 0.01) {
        lahuDirectDebts.push({
          fromId: debtor.id,
          toId: creditor.id,
          amount: settlementAmount
        });
        lahuDirectBalances[debtor.id] -= settlementAmount;
        lahuDirectBalances[creditor.id] += settlementAmount;

        debtor.amount = Math.round((debtor.amount - settlementAmount) * 100) / 100;
        creditor.amount = Math.round((creditor.amount - settlementAmount) * 100) / 100;
      }

      if (debtor.amount < 0.01 || settlementAmount < 0.01) lahuDebtorIndex++;
      if (creditor.amount < 0.01 || settlementAmount < 0.01) lahuCreditorIndex++;
    }

    // Combine general balances and direct Lahu balances
    const lahuTotalBalances: Record<string, number> = {};
    people.forEach(p => {
      const gen = lahuGeneralBalances[p._id] || 0;
      const dir = lahuDirectBalances[p._id] || 0;
      lahuTotalBalances[p._id] = Math.round((gen + dir) * 100) / 100;
    });

    const lahuShifts = people.map((p) => {
      const current = currentBalances[p._id] || 0;
      const projected = lahuTotalBalances[p._id] || 0;
      const shift = Math.round((projected - current) * 100) / 100;
      return {
        personId: p._id,
        personName: p.name,
        currentBalance: current,
        projectedBalance: projected,
        shiftAmount: shift,
      };
    }).filter((shift) => Math.abs(shift.shiftAmount) >= 0.01);

    // Format strategies with context-specific descriptions
    const strategies = [
      {
        id: "lahu_debt_settlement" as const,
        title: "Lahu Debt Settlement",
        badge: "Recommended",
        shortDescription: "Bypass netting and enforce direct payments.",
        fullDescription: `Reserves all paid settlements and locks remaining unpaid shares into direct, un-netted pairwise payments to the original payer(s). Outstanding debts will bypass global netting optimization entirely.`,
        impactLabel: "High Integrity",
        impactColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40",
        simulatedOutcome: {
          balanceShifts: lahuShifts,
          entangledSettlements: entangledSettlements.map((payment) => ({
            id: payment.id,
            debtorName: payment.debtorName,
            creditorName: payment.creditorName,
            amountSettled: payment.amountSettled,
            entangledAmount: payment.entangledAmount,
            adjustedAmount: payment.amountSettled,
            isArchived: false,
            associationType: payment.associationType,
          })),
          isolatedDirectTransactions: lahuDirectDebts.map(d => ({
            fromName: peopleMap.get(d.fromId as any) || "Unknown",
            toName: peopleMap.get(d.toId as any) || "Unknown",
            amount: d.amount
          }))
        },
      },
      {
        id: "lock_and_carry" as const,
        title: "Lock & Carry Forward",
        badge: "Alternative",
        shortDescription: "Keeps past settlements intact.",
        fullDescription: hasSettlements
          ? `Keeps all ${entangledSettlements.length} overlapping settlements active in the database. SettleEase will dynamically offset the remaining balances, re-routing debts to active creditors. Perfect for netting without rewriting history.`
          : "Keeps all outstanding settlements fully intact. SettleEase will calculate outstanding debts normally.",
        impactLabel: "Minimal Impact",
        impactColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40",
        simulatedOutcome: {
          balanceShifts: lockAndCarryShifts,
          entangledSettlements: entangledSettlements.map((payment) => ({
            id: payment.id,
            debtorName: payment.debtorName,
            creditorName: payment.creditorName,
            amountSettled: payment.amountSettled,
            entangledAmount: payment.entangledAmount,
            adjustedAmount: payment.amountSettled,
            isArchived: false,
            associationType: payment.associationType,
          })),
        },
      },
      {
        id: "pro_rata_adjust" as const,
        title: "Pro-Rata Adjustment",
        shortDescription: "Scale down overlapping payments.",
        fullDescription: hasSettlements
          ? `Scales back the ${entangledSettlements.length} overlapping settlements by their entangled shares in this expense. Settlements scaled down to zero are archived safely. Maintains strict alignment between expenses and cash transfers.`
          : "Scales back overlapping settlements in proportion to this excluded expense.",
        impactLabel: "Moderate Impact",
        impactColor: "text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40",
        simulatedOutcome: {
          balanceShifts: proRataShifts,
          entangledSettlements: entangledSettlements.map((payment) => {
            const entangledAmount = Math.min(payment.amountSettled, totalAmount);
            const remainingAmount = payment.amountSettled - entangledAmount;
            const isArchived = remainingAmount <= 0.01;
            return {
              id: payment.id,
              debtorName: payment.debtorName,
              creditorName: payment.creditorName,
              amountSettled: payment.amountSettled,
              entangledAmount: payment.entangledAmount,
              adjustedAmount: isArchived ? 0 : Math.round(remainingAmount * 100) / 100,
              isArchived,
              associationType: payment.associationType,
            };
          }),
        },
      },
      {
        id: "unlink_and_archive" as const,
        title: "Unlink & Archive",
        shortDescription: "Void and reset overlapping payments.",
        fullDescription: hasSettlements
          ? `Completely voids and archives all ${entangledSettlements.length} overlapping settlements. Re-opens historical dinner debts in full, requiring you to log new settlements. Best for correcting wrong payments.`
          : "Completely voids and archives all overlapping settlements from future ledger calculations.",
        impactLabel: "High Impact",
        impactColor: "text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40",
        simulatedOutcome: {
          balanceShifts: unlinkShifts,
          entangledSettlements: entangledSettlements.map((payment) => ({
            id: payment.id,
            debtorName: payment.debtorName,
            creditorName: payment.creditorName,
            amountSettled: payment.amountSettled,
            entangledAmount: payment.entangledAmount,
            adjustedAmount: 0,
            isArchived: true,
            associationType: payment.associationType,
          })),
        },
      },
    ];

    // Standard high-level messaging
    let explanationText = "";
    let warningBoxText = "";
    let recommendedAction = "";

    if (hasSettlements) {
      explanationText = `Excluding this expense will shift outstanding balances because prior payments have already settled parts of it. SettleEase detected ${entangledSettlements.length} settlement payment(s) overlapping this expense's timeframe.`;
      
      const criticalLinks = entangledSettlements.filter(s => s.associationType === "explicit_link");
      if (criticalLinks.length > 0) {
        warningBoxText = `CRITICAL LEDGER MISMATCH: Settlement payments are directly linked to this expense. Excluding it will leave these payments orphaned, creating incorrect overpayment credits.`;
        recommendedAction = "Select 'Pro-Rata Adjustment' or 'Unlink & Archive' to automatically adjust these linked payments in the database.";
      } else {
        warningBoxText = `LEDGER WARNING: Excluding this expense will shift net balances because global settlements were logged to net out outstanding debts.`;
        recommendedAction = "Use 'Lahu Debt Settlement' (Bypass Netting) to enforce direct pairwise payments and respect existing settlements.";
      }
    } else {
      explanationText = `Excluding this expense is safe. SettleEase did not find any settlement payments overlapping this expense. Outstanding balances will shift cleanly without any phantom debts.`;
      recommendedAction = "Confirm the exclusion to update the group ledger.";
    }

    return {
      hasSettlements,
      totalAmount,
      entangledSettlements,
      balanceShifts: lahuShifts, // Keep Lahu projected shifts as baseline
      explanationText,
      warningBoxText,
      recommendedAction,
      strategies,
    };
  },
});

