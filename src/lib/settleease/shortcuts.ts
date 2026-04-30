import type { ActiveView } from "./types";

export type ShortcutGroup = "navigation" | "actions" | "focus";

export type ShortcutId =
  | "nav.dashboard"
  | "nav.health"
  | "nav.analytics"
  | "nav.addExpense"
  | "nav.scanReceipt"
  | "nav.editExpenses"
  | "nav.manageSettlements"
  | "nav.managePeople"
  | "nav.manageCategories"
  | "nav.settings"
  | "action.addExpense"
  | "action.exportExpense"
  | "action.shortcuts"
  | "action.toggleSidebar"
  | "action.profileMenu"
  | "focus.dashboardSearch";

export interface ShortcutDefinition {
  id: ShortcutId;
  group: ShortcutGroup;
  label: string;
  description: string;
  key: string;
  displayKey: string;
  modifier?: boolean;
  shift?: boolean;
  adminOnly?: boolean;
  view?: ActiveView;
}

export const SETTLEEASE_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: "nav.dashboard",
    group: "navigation",
    label: "Home",
    description: "Go to Home",
    key: "1",
    displayKey: "1",
    modifier: true,
    view: "dashboard",
  },
  {
    id: "nav.health",
    group: "navigation",
    label: "Health",
    description: "Go to Health",
    key: "2",
    displayKey: "2",
    modifier: true,
    view: "health",
  },
  {
    id: "nav.analytics",
    group: "navigation",
    label: "Analytics",
    description: "Go to Analytics",
    key: "3",
    displayKey: "3",
    modifier: true,
    view: "analytics",
  },
  {
    id: "nav.addExpense",
    group: "navigation",
    label: "Add Expense",
    description: "Go to Add Expense",
    key: "4",
    displayKey: "4",
    modifier: true,
    adminOnly: true,
    view: "addExpense",
  },
  {
    id: "nav.scanReceipt",
    group: "navigation",
    label: "Smart Scan",
    description: "Go to Smart Scan",
    key: "5",
    displayKey: "5",
    modifier: true,
    adminOnly: true,
    view: "scanReceipt",
  },
  {
    id: "nav.editExpenses",
    group: "navigation",
    label: "Edit Expenses",
    description: "Go to Edit Expenses",
    key: "6",
    displayKey: "6",
    modifier: true,
    adminOnly: true,
    view: "editExpenses",
  },
  {
    id: "nav.manageSettlements",
    group: "navigation",
    label: "Settlements",
    description: "Go to Settlements",
    key: "7",
    displayKey: "7",
    modifier: true,
    adminOnly: true,
    view: "manageSettlements",
  },
  {
    id: "nav.managePeople",
    group: "navigation",
    label: "People",
    description: "Go to People",
    key: "8",
    displayKey: "8",
    modifier: true,
    adminOnly: true,
    view: "managePeople",
  },
  {
    id: "nav.manageCategories",
    group: "navigation",
    label: "Categories",
    description: "Go to Categories",
    key: "9",
    displayKey: "9",
    modifier: true,
    adminOnly: true,
    view: "manageCategories",
  },
  {
    id: "nav.settings",
    group: "navigation",
    label: "Settings",
    description: "Go to Settings",
    key: "0",
    displayKey: "0",
    modifier: true,
    adminOnly: true,
    view: "settings",
  },
  {
    id: "action.addExpense",
    group: "actions",
    label: "Add Expense",
    description: "Add new expense",
    key: "e",
    displayKey: "E",
    modifier: true,
    adminOnly: true,
    view: "addExpense",
  },
  {
    id: "action.exportExpense",
    group: "actions",
    label: "Export",
    description: "Open Export",
    key: "e",
    displayKey: "E",
    modifier: true,
    shift: true,
    adminOnly: true,
    view: "exportExpense",
  },
  {
    id: "focus.dashboardSearch",
    group: "focus",
    label: "Search",
    description: "Focus dashboard search",
    key: "f",
    displayKey: "F",
    modifier: true,
  },
  {
    id: "action.shortcuts",
    group: "actions",
    label: "Shortcuts",
    description: "Show shortcuts",
    key: "/",
    displayKey: "/",
    modifier: true,
  },
  {
    id: "action.shortcuts",
    group: "actions",
    label: "Shortcuts",
    description: "Show shortcuts",
    key: "?",
    displayKey: "?",
  },
  {
    id: "action.toggleSidebar",
    group: "actions",
    label: "Toggle Sidebar",
    description: "Collapse or expand the sidebar",
    key: "b",
    displayKey: "B",
    modifier: true,
  },
  {
    id: "action.profileMenu",
    group: "actions",
    label: "Profile Menu",
    description: "Open profile menu",
    key: ",",
    displayKey: ",",
    modifier: true,
  },
];

export function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

export function getShortcutModifierLabel(isMac = isMacPlatform()) {
  return isMac ? "⌘" : "Ctrl";
}

export function getShortcutById(id: ShortcutId) {
  return SETTLEEASE_SHORTCUTS.find((shortcut) => shortcut.id === id);
}

export function getShortcutsByGroup(group: ShortcutGroup) {
  return SETTLEEASE_SHORTCUTS.filter((shortcut) => shortcut.group === group);
}

export function formatShortcut(
  shortcut: ShortcutDefinition,
  isMac = isMacPlatform(),
) {
  const keys = [];
  if (shortcut.modifier) keys.push(getShortcutModifierLabel(isMac));
  if (shortcut.shift) keys.push("Shift");
  keys.push(shortcut.displayKey);
  return keys;
}

export function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutDefinition,
  isMac = isMacPlatform(),
) {
  const modifierPressed = isMac ? event.metaKey : event.ctrlKey;
  const key = event.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();
  const keyMatches =
    key === shortcutKey ||
    (shortcut.key === "/" && event.code === "Slash") ||
    (shortcut.key === "?" && event.key === "?");

  if (!keyMatches) return false;
  if (!!shortcut.modifier !== modifierPressed) return false;
  if (shortcut.key !== "?" && !!shortcut.shift !== event.shiftKey) return false;
  return true;
}
