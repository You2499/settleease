import type { ActiveView, UserProfile, UserRole } from "./types";

const VALID_ACTIVE_VIEWS: ActiveView[] = [
  "dashboard",
  "health",
  "analytics",
  "addExpense",
  "editExpenses",
  "managePeople",
  "manageCategories",
  "manageSettlements",
  "exportExpense",
  "scanReceipt",
  "settings",
];

const ADMIN_ONLY_VIEWS = new Set<ActiveView>([
  "addExpense",
  "editExpenses",
  "managePeople",
  "manageCategories",
  "manageSettlements",
  "exportExpense",
  "scanReceipt",
  "settings",
]);

const VIEW_NAMES: Record<ActiveView, string> = {
  dashboard: "Dashboard",
  health: "Health",
  analytics: "Analytics",
  addExpense: "Add Expense",
  editExpenses: "Edit Expenses",
  managePeople: "Manage People",
  manageCategories: "Manage Categories",
  manageSettlements: "Manage Settlements",
  exportExpense: "Export Expense",
  scanReceipt: "Smart Scan",
  settings: "Settings",
};

export const SETTLEEASE_AUTH_LOGOUT_CHANNEL = "settleease-auth";
export const SETTLEEASE_AUTH_LOGOUT_STORAGE_KEY = "settleease:logout";
const SETTLEEASE_AUTH_LOGOUT_TYPE = "settleease:logout";

type LogoutMessage = {
  type: typeof SETTLEEASE_AUTH_LOGOUT_TYPE;
  issuedAt: number;
  userId?: string | null;
};

export function isValidActiveView(view: string | null | undefined): view is ActiveView {
  return !!view && VALID_ACTIVE_VIEWS.includes(view as ActiveView);
}

export function canAccessView(view: ActiveView, userRole: UserRole) {
  return !ADMIN_ONLY_VIEWS.has(view) || userRole === "admin";
}

export function resolveInitialView({
  requestedView,
  currentView,
  lastActiveView,
  userRole,
}: {
  requestedView: string | null | undefined;
  currentView: ActiveView;
  lastActiveView: string | null | undefined;
  userRole: UserRole;
}) {
  const hasUrlView = requestedView !== null && requestedView !== undefined;
  const restorableView =
    isValidActiveView(lastActiveView) && lastActiveView !== "dashboard"
      ? lastActiveView
      : null;

  let resolvedView = isValidActiveView(requestedView) ? requestedView : currentView;
  let restoredView: ActiveView | null = null;
  let deniedView: ActiveView | null = null;

  if (!hasUrlView && restorableView && canAccessView(restorableView, userRole)) {
    resolvedView = restorableView;
    restoredView = restorableView;
  }

  if (!canAccessView(resolvedView, userRole)) {
    deniedView = resolvedView;
    resolvedView = "dashboard";
    restoredView = null;
  }

  return {
    deniedView,
    resolvedView,
    restoredView,
  };
}

export function getWelcomeUserName({
  profileFirstName,
  metadataFullName,
  email,
}: {
  profileFirstName?: string | null;
  metadataFullName?: string | null;
  email?: string | null;
}) {
  const metadataFirstName = metadataFullName ? String(metadataFullName).split(" ")[0] : "";
  const emailUsername = email?.split("@")[0] || "there";
  return profileFirstName || metadataFirstName || emailUsername;
}

export function buildWelcomeToastModel({
  profile,
  restoredInitialView,
  userName,
}: {
  profile: Pick<UserProfile, "has_seen_welcome_toast" | "should_show_welcome_toast">;
  restoredInitialView: ActiveView | null;
  userName: string;
}) {
  const isNewUser = !profile.has_seen_welcome_toast;
  const profileUpdates: Partial<UserProfile> = {};

  if (isNewUser) {
    profileUpdates.has_seen_welcome_toast = true;
  }

  if (profile.should_show_welcome_toast) {
    profileUpdates.should_show_welcome_toast = false;
  }

  if (isNewUser) {
    return {
      action: null as "dashboard" | null,
      description: `Hi ${userName}! Your account has been created and you're now signed in.`,
      profileUpdates,
      title: "Welcome to SettleEase!",
      variant: "default" as const,
    };
  }

  if (restoredInitialView) {
    const viewName = VIEW_NAMES[restoredInitialView] || "your last view";

    return {
      action: "dashboard" as const,
      description: `Session restored to ${viewName}. Use the sidebar to navigate or click the button to go to Dashboard.`,
      profileUpdates,
      title: "Welcome back!",
      variant: "default" as const,
    };
  }

  return {
    action: null as "dashboard" | null,
    description: "You've successfully signed in to SettleEase.",
    profileUpdates,
    title: "Welcome back!",
    variant: "default" as const,
  };
}

export function createLogoutMessage(userId?: string | null, issuedAt = Date.now()): LogoutMessage {
  return {
    type: SETTLEEASE_AUTH_LOGOUT_TYPE,
    issuedAt,
    userId: userId ?? null,
  };
}

export function parseLogoutMessage(value: unknown): LogoutMessage | null {
  if (!value) return null;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as LogoutMessage).type === SETTLEEASE_AUTH_LOGOUT_TYPE &&
      typeof (parsed as LogoutMessage).issuedAt === "number"
    ) {
      return parsed as LogoutMessage;
    }
  } catch {
    return null;
  }

  return null;
}

export function shouldApplyLogoutMessage({
  currentUserId,
  lastHandledIssuedAt,
  message,
}: {
  currentUserId?: string | null;
  lastHandledIssuedAt: number;
  message: LogoutMessage | null;
}) {
  if (!message || message.issuedAt <= lastHandledIssuedAt) return false;
  if (message.userId && currentUserId && message.userId !== currentUserId) return false;
  return true;
}
