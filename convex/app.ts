import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
});

const celebrationContribution = v.object({
  personId: v.string(),
  amount: v.number(),
});

const DEFAULT_AI_CONFIG_KEY = "global-ai-config";
const DEFAULT_AI_MODEL_CODE = "gemini-3.1-flash-lite-preview";
const DEFAULT_AI_FALLBACK_MODEL_CODES = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
];

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

function profileDto(profile: any) {
  if (!profile) return null;
  return {
    id: profile._id,
    user_id: profile.supabaseUserId,
    email: profile.email ?? null,
    role: profile.role ?? "user",
    first_name: profile.firstName ?? null,
    last_name: profile.lastName ?? null,
    font_preference: profile.fontPreference ?? undefined,
    theme_preference: profile.themePreference ?? undefined,
    last_active_view: profile.lastActiveView ?? undefined,
    has_seen_welcome_toast: profile.hasSeenWelcomeToast ?? false,
    should_show_welcome_toast: profile.shouldShowWelcomeToast ?? false,
    last_sign_in_at: profile.lastSignInAt ?? undefined,
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
    exclude_from_settlement: expense.excludeFromSettlement ?? false,
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
  return {
    id: config._id,
    key: config.key ?? key,
    modelCode: config.modelCode ?? DEFAULT_AI_MODEL_CODE,
    fallbackModelCodes: Array.isArray(config.fallbackModelCodes)
      ? config.fallbackModelCodes
      : DEFAULT_AI_FALLBACK_MODEL_CODES,
    updatedAt: config.updatedAt ?? null,
    updatedByUserId: config.updatedByUserId ?? null,
  };
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

async function requireSelf(ctx: any, supabaseUserId: string) {
  const authenticatedUserId = await requireAuthenticatedSupabaseUserId(ctx);
  const requestedUserId = normalizeSupabaseUserId(supabaseUserId);

  if (authenticatedUserId !== requestedUserId) {
    throw new ConvexError("Cannot access another user's profile.");
  }

  return authenticatedUserId;
}

async function requireAdmin(ctx: any) {
  const supabaseUserId = await requireAuthenticatedSupabaseUserId(ctx);
  const profile = await getProfileBySupabaseUserId(ctx, supabaseUserId);
  if (profile?.role !== "admin") {
    throw new ConvexError("Admin access required.");
  }
  return supabaseUserId;
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
    await ctx.db.patch(existing._id, {
      email: args.email ?? existing.email,
      firstName: args.firstName || existing.firstName,
      lastName: args.lastName || existing.lastName,
      updatedAt: timestamp,
    });
    return existing._id;
  }

  return await ctx.db.insert("userProfiles", {
    supabaseUserId: normalizedUserId,
    email: args.email,
    role: "user",
    firstName: args.firstName || undefined,
    lastName: args.lastName || undefined,
    fontPreference: "google-sans",
    themePreference: "light",
    lastActiveView: "dashboard",
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

export const getUserProfile = query({
  args: { supabaseUserId: v.string() },
  handler: async (ctx, args) => {
    const supabaseUserId = await requireSelf(ctx, args.supabaseUserId);
    return profileDto(
      await getProfileBySupabaseUserId(ctx, supabaseUserId),
    );
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
        v.literal("geist"),
        v.literal("system"),
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
    await requireAdmin(ctx);
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
    await ctx.db.insert("people", { name, createdAt: nowIso() });
  },
});

export const updatePerson = mutation({
  args: { id: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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
  },
});

export const removePerson = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const person: any = await ctx.db.get(args.id as any);
    if (!person) throw new ConvexError("Person not found.");

    const payments = await ctx.db.query("settlementPayments").collect();
    const paymentCount = payments.filter(
      (payment: any) =>
        payment.debtorId === args.id || payment.creditorId === args.id,
    ).length;
    if (paymentCount > 0) {
      throw new ConvexError(
        `${person.name} is involved in ${paymentCount} recorded settlement(s).`,
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
            Array.isArray(item.sharedBy) && item.sharedBy.includes(args.id),
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

    await ctx.db.delete(person._id);
  },
});

export const ensureDefaultPeople = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("people").take(1);
    if (existing.length > 0) return false;
    await Promise.all(
      ["Alice", "Bob", "Charlie"].map((name) =>
        ctx.db.insert("people", { name, createdAt: nowIso() }),
      ),
    );
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
    await requireAdmin(ctx);
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
  },
});

export const updateCategory = mutation({
  args: { id: v.string(), name: v.string(), iconName: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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
    await ctx.db.patch(category._id, { name, iconName: args.iconName });
  },
});

export const deleteCategory = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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
    await ctx.db.delete(category._id);
  },
});

export const reorderCategories = mutation({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await Promise.all(
      args.ids.map(async (id, index) => {
        const category = await ctx.db.get(id as any);
        if (category) await ctx.db.patch(category._id, { rank: index + 1 });
      }),
    );
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
      isActive: true,
      createdByUserId: existing?.createdByUserId ?? supabaseUserId,
      updatedAt: timestamp,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return budgetItemDto(await ctx.db.get(existing._id));
    }

    const id = await ctx.db.insert("budgetItems", {
      ...payload,
      createdAt: timestamp,
    });
    return budgetItemDto(await ctx.db.get(id));
  },
});

export const backfillBudgetItemsFromExpenses = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const dryRun = args.dryRun ?? false;
    const timestamp = nowIso();
    const expenses = await ctx.db.query("expenses").collect();
    const historicalByKey = new Map<string, any>();
    let itemObservationCount = 0;
    let validObservationCount = 0;
    let skippedObservationCount = 0;

    for (const expense of expenses) {
      if (!Array.isArray(expense.items)) continue;

      for (const item of expense.items) {
        itemObservationCount += 1;
        const name = cleanBudgetItemName(String(item.name ?? ""));
        const normalizedName = normalizeBudgetItemName(name);
        const price = toPositiveBudgetPrice(item.price);

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

    for (const historicalStats of historicalByKey.values()) {
      const existing = existingByKey.get(historicalStats.catalogKey);
      if (existing) rowsToUpdate += 1;
      else rowsToInsert += 1;

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
        isActive: true,
        createdByUserId: existing?.createdByUserId ?? null,
        updatedAt: timestamp,
        lastObservedAt: historicalStats.lastObservedAt,
        lastCustomAt: customStats.lastCustomAt,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("budgetItems", {
          ...payload,
          createdAt: timestamp,
        });
      }
    }

    return {
      dryRun,
      expenseCount: expenses.length,
      itemObservationCount,
      validObservationCount,
      skippedObservationCount,
      mergedCatalogRowCount: historicalByKey.size,
      rowsToInsert,
      rowsToUpdate,
    };
  },
});

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
    excludeFromSettlement: v.optional(v.boolean()),
    createdAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const payload = {
      description: args.description,
      totalAmount: args.totalAmount,
      category: args.category,
      paidBy: args.paidBy,
      splitMethod: args.splitMethod,
      shares: args.shares,
      items: args.items ?? null,
      celebrationContribution: args.celebrationContribution ?? null,
      excludeFromSettlement: args.excludeFromSettlement ?? false,
      updatedAt: nowIso(),
    };
    const patchPayload =
      args.createdAt !== undefined
        ? { ...payload, createdAt: args.createdAt }
        : payload;

    if (args.id) {
      const expense: any = await ctx.db.get(args.id as any);
      if (!expense) throw new ConvexError("Expense not found.");
      await ctx.db.patch(expense._id, patchPayload);
      return expense._id;
    }

    return await ctx.db.insert("expenses", {
      ...payload,
      createdAt: args.createdAt ?? nowIso(),
    });
  },
});

export const updateExpenseExcludeFromSettlement = mutation({
  args: { id: v.string(), excludeFromSettlement: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const expense: any = await ctx.db.get(args.id as any);
    if (!expense) throw new ConvexError("Expense not found.");
    await ctx.db.patch(expense._id, {
      excludeFromSettlement: args.excludeFromSettlement,
      updatedAt: nowIso(),
    });
  },
});

export const deleteExpense = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const expense: any = await ctx.db.get(args.id as any);
    if (!expense) throw new ConvexError("Expense not found.");
    await ctx.db.delete(expense._id);
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
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("settlementPayments", {
      debtorId: args.debtorId,
      creditorId: args.creditorId,
      amountSettled: args.amountSettled,
      markedByUserId: args.markedByUserId,
      settledAt: args.settledAt ?? nowIso(),
      notes: args.notes ?? null,
    });
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
    await requireAdmin(ctx);
    const payment: any = await ctx.db.get(args.id as any);
    if (!payment) throw new ConvexError("Payment not found.");
    await ctx.db.patch(payment._id, {
      amountSettled: args.amountSettled,
      notes: args.notes ?? null,
      settledAt: args.settledAt,
    });
  },
});

export const deleteSettlementPayment = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const payment: any = await ctx.db.get(args.id as any);
    if (!payment) throw new ConvexError("Payment not found.");
    await ctx.db.delete(payment._id);
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
    await requireAdmin(ctx);
    const timestamp = nowIso();
    return await ctx.db.insert("manualSettlementOverrides", {
      debtorId: args.debtorId,
      creditorId: args.creditorId,
      amount: args.amount,
      createdByUserId: args.createdByUserId ?? null,
      notes: args.notes ?? null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const deactivateManualSettlementOverride = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const override: any = await ctx.db.get(args.id as any);
    if (!override) throw new ConvexError("Override not found.");
    await ctx.db.patch(override._id, { isActive: false, updatedAt: nowIso() });
  },
});

export const deleteManualSettlementOverride = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const override: any = await ctx.db.get(args.id as any);
    if (!override) throw new ConvexError("Override not found.");
    await ctx.db.delete(override._id);
  },
});

export const clearActiveManualSettlementOverrides = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const overrides = await ctx.db.query("manualSettlementOverrides").collect();
    await Promise.all(
      overrides
        .filter((override: any) => override.isActive)
        .map((override: any) =>
          ctx.db.patch(override._id, { isActive: false, updatedAt: nowIso() }),
        ),
    );
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

    return await ctx.db.insert("reportGenerationEvents", {
      ...args,
      usedCache: args.usedCache ?? null,
      aiModelName: args.aiModelName ?? null,
      createdAt: nowIso(),
    });
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
