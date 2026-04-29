import { ConvexError } from "convex/values";

export const DEVELOPMENT_SUPABASE_USER_ID = "settleease-development-admin";

export function normalizeSupabaseUserId(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export function isConvexDevelopmentAuthDisabled() {
  return process.env.SETTLEEASE_DISABLE_AUTH === "true";
}

export async function requireAuthenticatedSupabaseUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  const supabaseUserId = normalizeSupabaseUserId(identity?.subject);

  if (supabaseUserId) {
    return supabaseUserId;
  }

  if (isConvexDevelopmentAuthDisabled()) {
    return DEVELOPMENT_SUPABASE_USER_ID;
  }

  throw new ConvexError("Authentication required.");
}

export async function requireSelf(ctx: any, supabaseUserId: string) {
  const authenticatedUserId = await requireAuthenticatedSupabaseUserId(ctx);
  const requestedUserId = normalizeSupabaseUserId(supabaseUserId);

  if (!requestedUserId) {
    throw new ConvexError("Authentication required.");
  }

  if (authenticatedUserId !== requestedUserId) {
    throw new ConvexError("Cannot access another user's profile.");
  }

  return authenticatedUserId;
}
