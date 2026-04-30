"use client";

import { useEffect } from "react";

import type { ActiveView } from "@/lib/settleease";
import {
  SETTLEEASE_SHORTCUTS,
  isEditableShortcutTarget,
  isMacPlatform,
  matchesShortcut,
} from "@/lib/settleease/shortcuts";

interface UseSettleEaseShortcutsOptions {
  activeView: ActiveView;
  isReady: boolean;
  onNavigate: (view: ActiveView) => void;
  onShowShortcuts: () => void;
  onOpenProfileMenu: () => void;
}

function focusDashboardSearch(attempt = 0) {
  window.setTimeout(() => {
    const searchInput = document.getElementById("expense-search-input");
    if (searchInput instanceof HTMLInputElement) {
      searchInput.focus();
      searchInput.select();
      return;
    }

    if (attempt < 12) {
      focusDashboardSearch(attempt + 1);
    }
  }, attempt === 0 ? 120 : 80);
}

export function useSettleEaseShortcuts({
  activeView,
  isReady,
  onNavigate,
  onShowShortcuts,
  onOpenProfileMenu,
}: UseSettleEaseShortcutsOptions) {
  useEffect(() => {
    const isMac = isMacPlatform();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      const matchedShortcut = SETTLEEASE_SHORTCUTS.find((shortcut) =>
        matchesShortcut(event, shortcut, isMac),
      );
      if (!matchedShortcut) return;

      if (!matchedShortcut.modifier && isEditableShortcutTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (matchedShortcut.id === "action.shortcuts") {
        onShowShortcuts();
        return;
      }

      if (!isReady) return;

      if (matchedShortcut.id === "focus.dashboardSearch") {
        if (activeView !== "dashboard") {
          onNavigate("dashboard");
        }
        focusDashboardSearch();
        return;
      }

      if (matchedShortcut.id === "action.profileMenu") {
        onOpenProfileMenu();
        return;
      }

      if (matchedShortcut.view) {
        onNavigate(matchedShortcut.view);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeView, isReady, onNavigate, onOpenProfileMenu, onShowShortcuts]);
}
