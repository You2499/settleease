import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

const aiModelCode = v.union(
  v.literal("gemini-3.1-flash-lite-preview"),
  v.literal("gemini-3-flash-preview"),
  v.literal("gemini-2.5-flash"),
);

const activeView = v.union(
  v.literal("dashboard"),
  v.literal("addExpense"),
  v.literal("editExpenses"),
  v.literal("managePeople"),
  v.literal("manageCategories"),
  v.literal("manageSettlements"),
  v.literal("analytics"),
  v.literal("testErrorBoundary"),
  v.literal("exportExpense"),
  v.literal("scanReceipt"),
  v.literal("settings"),
);

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

function aiConfigDto(config: any) {
  if (!config) return null;
  return {
    id: config._id,
    key: config.key,
    modelCode: config.modelCode,
    fallbackModelCodes: config.fallbackModelCodes ?? [],
    updatedAt: config.updatedAt,
    updatedByUserId: config.updatedByUserId ?? null,
  };
}

async function getProfileBySupabaseUserId(ctx: any, supabaseUserId: string) {
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_supabase_user_id", (q: any) => q.eq("supabaseUserId", supabaseUserId))
    .unique();
}

async function requireAuthenticatedSupabaseUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    throw new ConvexError("Authentication required.");
  }
  return identity.subject;
}

async function requireSelf(ctx: any, supabaseUserId: string) {
  const authenticatedUserId = await requireAuthenticatedSupabaseUserId(ctx);
  if (authenticatedUserId !== supabaseUserId) {
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
  const existing = await getProfileBySupabaseUserId(ctx, args.supabaseUserId);
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
    supabaseUserId: args.supabaseUserId,
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
    await requireSelf(ctx, args.supabaseUserId);
    return profileDto(await getProfileBySupabaseUserId(ctx, args.supabaseUserId));
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
    await requireSelf(ctx, args.supabaseUserId);
    const id = await ensureUserProfile(ctx, args);
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
    await requireSelf(ctx, args.supabaseUserId);
    const id = await ensureUserProfile(ctx, args);
    await ctx.db.patch(id, {
      email: args.email,
      lastSignInAt: nowIso(),
      shouldShowWelcomeToast: true,
      updatedAt: nowIso(),
    });
    return profileDto(await ctx.db.get(id));
  },
});

export const updateUserProfile = mutation({
  args: {
    supabaseUserId: v.string(),
    firstName: v.optional(v.union(v.string(), v.null())),
    lastName: v.optional(v.union(v.string(), v.null())),
    fontPreference: v.optional(
      v.union(v.literal("geist"), v.literal("system"), v.literal("inter"), v.literal("google-sans")),
    ),
    themePreference: v.optional(v.string()),
    lastActiveView: v.optional(activeView),
    hasSeenWelcomeToast: v.optional(v.boolean()),
    shouldShowWelcomeToast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.supabaseUserId);
    const profile = await getProfileBySupabaseUserId(ctx, args.supabaseUserId);
    if (!profile) throw new ConvexError("User profile not found.");

    const updates: Record<string, any> = { updatedAt: nowIso() };
    if (args.firstName !== undefined) updates.firstName = args.firstName ?? undefined;
    if (args.lastName !== undefined) updates.lastName = args.lastName ?? undefined;
    if (args.fontPreference !== undefined) updates.fontPreference = args.fontPreference;
    if (args.themePreference !== undefined) updates.themePreference = args.themePreference;
    if (args.lastActiveView !== undefined) updates.lastActiveView = args.lastActiveView;
    if (args.hasSeenWelcomeToast !== undefined) updates.hasSeenWelcomeToast = args.hasSeenWelcomeToast;
    if (args.shouldShowWelcomeToast !== undefined) updates.shouldShowWelcomeToast = args.shouldShowWelcomeToast;

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
    if (people.some((person: any) => person.name.trim().toLowerCase() === name.toLowerCase())) {
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
    const paymentCount = payments.filter((payment: any) => payment.debtorId === args.id || payment.creditorId === args.id).length;
    if (paymentCount > 0) {
      throw new ConvexError(`${person.name} is involved in ${paymentCount} recorded settlement(s).`);
    }

    const expenses = await ctx.db.query("expenses").collect();
    const involvedInExpense = expenses.some((expense: any) => {
      const isPayer = Array.isArray(expense.paidBy) && expense.paidBy.some((p: any) => p.personId === args.id);
      const isSharer = Array.isArray(expense.shares) && expense.shares.some((s: any) => s.personId === args.id);
      const isItemSharer =
        Array.isArray(expense.items) &&
        expense.items.some((item: any) => Array.isArray(item.sharedBy) && item.sharedBy.includes(args.id));
      const isCelebrationContributor = expense.celebrationContribution?.personId === args.id;
      return isPayer || isSharer || isItemSharer || isCelebrationContributor;
    });
    if (involvedInExpense) {
      throw new ConvexError(`${person.name} is involved in one or more expenses.`);
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
    await Promise.all(["Alice", "Bob", "Charlie"].map((name) => ctx.db.insert("people", { name, createdAt: nowIso() })));
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
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name));
  },
});

export const addCategory = mutation({
  args: { name: v.string(), iconName: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError("Category name cannot be empty.");
    const categories = await ctx.db.query("categories").collect();
    if (categories.some((category: any) => category.name.trim().toLowerCase() === name.toLowerCase())) {
      throw new ConvexError(`A category named "${name}" already exists.`);
    }
    const maxRank = categories.length > 0 ? Math.max(...categories.map((category: any) => category.rank ?? 0)) : 0;
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
      throw new ConvexError(`Category "${category.name}" is used by ${count} expense(s).`);
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
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
  },
});

export const saveExpense = mutation({
  args: {
    id: v.optional(v.string()),
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
      .sort((a, b) => new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime());
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
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
        .map((override: any) => ctx.db.patch(override._id, { isActive: false, updatedAt: nowIso() })),
    );
  },
});

export const getActiveAiPrompt = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const prompt = await ctx.db
      .query("aiPrompts")
      .withIndex("by_name_active", (q) => q.eq("name", args.name).eq("isActive", true))
      .first();
    return aiPromptDto(prompt);
  },
});

export const getActiveAiConfig = query({
  args: { key: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const configKey = args.key ?? "global-ai-config";
    const config = await ctx.db
      .query("aiConfigs")
      .withIndex("by_key", (q) => q.eq("key", configKey))
      .first();
    return aiConfigDto(config);
  },
});

export const saveAiConfig = mutation({
  args: {
    key: v.optional(v.string()),
    modelCode: aiModelCode,
    fallbackModelCodes: v.array(aiModelCode),
    currentUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const configKey = args.key ?? "global-ai-config";
    const timestamp = nowIso();
    const uniqueFallbacks = [...new Set(args.fallbackModelCodes)].filter(
      (modelCode) => modelCode !== args.modelCode,
    );

    const existing = await ctx.db
      .query("aiConfigs")
      .withIndex("by_key", (q) => q.eq("key", configKey))
      .first();

    const update = {
      modelCode: args.modelCode,
      fallbackModelCodes: uniqueFallbacks,
      updatedAt: timestamp,
      updatedByUserId: args.currentUserId ?? null,
    };

    if (existing) {
      await ctx.db.patch(existing._id, update);
      return existing._id;
    }

    return await ctx.db.insert("aiConfigs", {
      key: configKey,
      ...update,
    });
  },
});

export const getAiPromptEditorData = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const prompts = await ctx.db.query("aiPrompts").collect();
    const matching = prompts.filter((prompt: any) => prompt.name === args.name);
    return {
      activePrompt: aiPromptDto(matching.find((prompt: any) => prompt.isActive)),
      promptHistory: matching.map(aiPromptDto).sort((a: any, b: any) => b.version - a.version),
    };
  },
});

export const saveAiPrompt = mutation({
  args: {
    name: v.string(),
    promptText: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    currentUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const active = await ctx.db
      .query("aiPrompts")
      .withIndex("by_name_active", (q) => q.eq("name", args.name).eq("isActive", true))
      .first();
    const timestamp = nowIso();
    const nextVersion = active ? active.version + 1 : 1;

    if (active) {
      await ctx.db.patch(active._id, {
        isActive: false,
        updatedAt: timestamp,
      });
    }

    await ctx.db.insert("aiPrompts", {
      name: args.name,
      promptText: args.promptText,
      isActive: true,
      createdByUserId: args.currentUserId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: nextVersion,
      description: args.description ?? null,
    });
    return nextVersion;
  },
});

export const clearAiSummaries = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const summaries = await ctx.db.query("aiSummaries").collect();
    await Promise.all(summaries.map((summary: any) => ctx.db.delete(summary._id)));
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
    if (!summary) return null;
    return {
      id: summary._id,
      user_id: summary.userId,
      data_hash: summary.dataHash,
      summary: summary.summary,
      model_name: summary.modelName ?? null,
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
    if (args.userId !== supabaseUserId) {
      throw new ConvexError("Cannot store summaries for another user.");
    }
    const existing = await ctx.db
      .query("aiSummaries")
      .withIndex("by_data_hash", (q) => q.eq("dataHash", args.dataHash))
      .first();
    if (existing) return existing._id;
    const timestamp = nowIso();
    return await ctx.db.insert("aiSummaries", {
      userId: args.userId,
      dataHash: args.dataHash,
      summary: args.summary,
      modelName: args.modelName ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});
