"use client";

export type UsageEventStatus = "success" | "failure" | "cancelled" | "info";

export type UsageEventGroup =
  | "session"
  | "navigation"
  | "expenses"
  | "people"
  | "categories"
  | "settlements"
  | "scan"
  | "summary"
  | "health"
  | "budget"
  | "report"
  | "analytics"
  | "settings"
  | "errors";

export type UsageSurface =
  | "app"
  | "dashboard"
  | "analytics"
  | "health"
  | "addExpense"
  | "editExpenses"
  | "managePeople"
  | "manageCategories"
  | "manageSettlements"
  | "exportExpense"
  | "scanReceipt"
  | "settings";

export type UsageMetadataValue = string | number | boolean | null | undefined;
export type UsageMetadata = Record<string, UsageMetadataValue>;

const SAFE_METADATA_KEYS = new Set([
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

export function getUsageEventGroup(eventName: string): UsageEventGroup {
  const prefix = eventName.split(".")[0];
  if (
    prefix === "session" ||
    prefix === "navigation" ||
    prefix === "expense" ||
    prefix === "person" ||
    prefix === "category" ||
    prefix === "settlement" ||
    prefix === "manual_override" ||
    prefix === "scan" ||
    prefix === "summary" ||
    prefix === "health" ||
    prefix === "budget" ||
    prefix === "report" ||
    prefix === "analytics" ||
    prefix === "settings" ||
    prefix === "error"
  ) {
    if (prefix === "expense") return "expenses";
    if (prefix === "person") return "people";
    if (prefix === "category") return "categories";
    if (prefix === "settlement" || prefix === "manual_override") return "settlements";
    if (prefix === "error") return "errors";
    return prefix as UsageEventGroup;
  }
  return "settings";
}

export function bucketUsageDuration(durationMs: number | null | undefined) {
  if (!durationMs || durationMs < 0) return "unknown";
  if (durationMs < 1000) return "lt_1s";
  if (durationMs < 3000) return "1s_3s";
  if (durationMs < 10000) return "3s_10s";
  if (durationMs < 30000) return "10s_30s";
  return "gte_30s";
}

export function bucketUsageAmount(value: number | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "unknown";
  if (amount < 100) return "lt_100";
  if (amount < 500) return "100_499";
  if (amount < 1000) return "500_999";
  if (amount < 5000) return "1000_4999";
  if (amount < 10000) return "5000_9999";
  return "gte_10000";
}

function sanitizeString(value: string) {
  const compact = value.trim().replace(/\s+/g, "_");
  return /^[a-zA-Z0-9_.:/-]{1,80}$/.test(compact) ? compact : "text_present";
}

export function sanitizeUsageMetadata(metadata: UsageMetadata | undefined) {
  if (!metadata) return null;
  const sanitized: Record<string, string | number | boolean> = {};

  Object.entries(metadata).forEach(([key, value]) => {
    if (!SAFE_METADATA_KEYS.has(key) || value === null || value === undefined) return;
    if (typeof value === "boolean") {
      sanitized[key] = value;
      return;
    }
    if (typeof value === "number") {
      if (Number.isFinite(value)) sanitized[key] = Number(value.toFixed(3));
      return;
    }
    if (typeof value === "string" && value.trim()) {
      sanitized[key] = sanitizeString(value);
    }
  });

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}
