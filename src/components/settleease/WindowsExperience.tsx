"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ControlKind = "button" | "tab" | "select" | "sidebar";

type WindowsExperienceContextValue = {
  enabled: boolean;
  surface: string;
  generation: number;
};

const WindowsExperienceContext = createContext<WindowsExperienceContextValue>({
  enabled: false,
  surface: "unknown",
  generation: 0,
});

const sessionState = {
  enabled: false,
  enabledAt: 0,
  generation: 0,
  pendingMisses: new Map<string, number>(),
  lastMissAt: 0,
  missCount: 0,
  lastReloadAt: 0,
  reloadCount: 0,
  lastCrashAt: 0,
  crashCount: 0,
  crashedComponents: new Set<string>(),
  lastLagAt: 0,
  lagCount: 0,
};

const checkedCrashKeys = new Set<string>();

const SAFE_CONTROL_PATTERN =
  /settings|windows experience|profile|open profile|log ?out|sign ?out|keyboard shortcuts|danger|unlock production|lock production|confirmation|sign in|sign up|google/i;

const RELOAD_BLOCK_PATTERN =
  /save|delete|remove|factory|reset|clear|unlock|lock|confirm|submit|add|scan|upload|camera|download|print|pay|seed|apply|export|sign|log ?out|edit name|try again/i;

const LOCAL_RELOAD_SURFACES = new Set(["dashboard", "analytics", "health"]);

function now() {
  return Date.now();
}

function randomBetween(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function getElementFromEvent(event: { currentTarget?: EventTarget | null; target?: EventTarget | null }) {
  const target = event.currentTarget || event.target;
  return target instanceof Element ? target : null;
}

function getControlLabel(element: Element | null) {
  if (!element) return "";
  const ariaLabel = element.getAttribute("aria-label");
  const title = element.getAttribute("title");
  const text = element.textContent?.replace(/\s+/g, " ").trim();
  return [ariaLabel, title, text].filter(Boolean).join(" ");
}

function getControlKey(kind: ControlKind, element: Element | null, label: string) {
  if (!element) return `${kind}:unknown`;
  const id = element.getAttribute("id");
  const value = element.getAttribute("value");
  const href = element.getAttribute("href");
  const role = element.getAttribute("role");
  const sidebar = element.getAttribute("data-sidebar");
  return [kind, id, value, href, role, sidebar, label].filter(Boolean).join(":").slice(0, 180);
}

function isExplicitlySafe(element: Element | null, label: string) {
  if (!element) return false;
  if (element.closest("[data-windows-experience-safe='true']")) return true;
  return SAFE_CONTROL_PATTERN.test(label);
}

function canMiss(kind: ControlKind) {
  if (!sessionState.enabled) return false;
  if (sessionState.missCount >= 28) return false;
  const timestamp = now();
  if (timestamp - sessionState.enabledAt < 2500) return false;
  if (timestamp - sessionState.lastMissAt < 1800) return false;

  const chanceByKind: Record<ControlKind, number> = {
    button: 0.22,
    tab: 0.18,
    select: 0.15,
    sidebar: 0.2,
  };

  return Math.random() < chanceByKind[kind];
}

function maybeMarkMiss(kind: ControlKind, element: Element | null, label: string) {
  if (!canMiss(kind)) return false;
  if (isExplicitlySafe(element, label)) return false;

  const timestamp = now();
  const key = getControlKey(kind, element, label);
  const pendingAt = sessionState.pendingMisses.get(key);
  if (pendingAt && timestamp - pendingAt < 5500) {
    sessionState.pendingMisses.delete(key);
    return false;
  }

  sessionState.pendingMisses.set(key, timestamp);
  sessionState.lastMissAt = timestamp;
  sessionState.missCount += 1;
  return true;
}

function canReload(kind: ControlKind, surface: string, element: Element | null, label: string) {
  if (!sessionState.enabled) return false;
  if (!LOCAL_RELOAD_SURFACES.has(surface)) return false;
  if (sessionState.reloadCount >= 3) return false;
  if (kind === "button" && RELOAD_BLOCK_PATTERN.test(label)) return false;
  if (isExplicitlySafe(element, label)) return false;

  const timestamp = now();
  const lastStoredReload = Number(sessionStorage.getItem("settleease_windows_experience_reload_at") || "0");
  if (timestamp - sessionState.enabledAt < 9000) return false;
  if (timestamp - sessionState.lastReloadAt < 70000) return false;
  if (timestamp - lastStoredReload < 18000) return false;

  const chanceByKind: Record<ControlKind, number> = {
    button: 0.06,
    tab: 0.16,
    select: 0.13,
    sidebar: 0.12,
  };

  return Math.random() < chanceByKind[kind];
}

function scheduleReload(kind: ControlKind, surface: string, element: Element | null, label: string) {
  if (!canReload(kind, surface, element, label)) return;

  sessionState.lastReloadAt = now();
  sessionState.reloadCount += 1;

  window.setTimeout(() => {
    if (!sessionState.enabled) return;
    sessionStorage.setItem("settleease_windows_experience_reload_at", String(now()));
    window.location.reload();
  }, randomBetween(450, 1300));
}

function shouldCrashComponent(componentName: string) {
  if (!sessionState.enabled) return false;
  if (componentName === "Settings") return false;
  if (sessionState.crashCount >= 2) return false;
  if (sessionState.crashedComponents.has(componentName)) return false;

  const timestamp = now();
  if (timestamp - sessionState.enabledAt < 7000) return false;
  if (timestamp - sessionState.lastCrashAt < 42000) return false;
  if (Math.random() >= 0.18) return false;

  sessionState.crashCount += 1;
  sessionState.lastCrashAt = timestamp;
  sessionState.crashedComponents.add(componentName);
  return true;
}

function getCrashMessage(componentName: string) {
  const messages = [
    `Cannot read properties of undefined (reading '${componentName.toLowerCase().replace(/\s+/g, "")}')`,
    "ResizeObserver loop completed with undelivered notifications.",
    "Maximum update depth exceeded while reconciling local state.",
    `Failed to reconcile ${componentName} data after realtime update.`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function WindowsExperienceProvider({
  enabled,
  surface,
  children,
}: {
  enabled: boolean;
  surface: string;
  children: React.ReactNode;
}) {
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    sessionState.enabled = enabled;

    if (enabled) {
      sessionState.enabledAt = now();
      sessionState.pendingMisses.clear();
      checkedCrashKeys.clear();
      sessionState.lastMissAt = 0;
      sessionState.missCount = 0;
      sessionState.lastReloadAt = 0;
      sessionState.reloadCount = 0;
      sessionState.lastCrashAt = 0;
      sessionState.crashCount = 0;
      sessionState.crashedComponents.clear();
      sessionState.lastLagAt = 0;
      sessionState.lagCount = 0;
      return;
    }

    sessionState.generation += 1;
    sessionState.pendingMisses.clear();
    checkedCrashKeys.clear();
    sessionState.enabledAt = 0;
    setGeneration(sessionState.generation);
  }, [enabled]);

  const value = useMemo(
    () => ({
      enabled,
      surface,
      generation,
    }),
    [enabled, generation, surface],
  );

  return (
    <WindowsExperienceContext.Provider value={value}>
      {children}
    </WindowsExperienceContext.Provider>
  );
}

export function useWindowsExperience() {
  return useContext(WindowsExperienceContext);
}

export function useWindowsExperienceControl(kind: ControlKind) {
  const { enabled, surface } = useWindowsExperience();

  const guardInteraction = useCallback(
    (event: { preventDefault: () => void; stopPropagation: () => void; currentTarget?: EventTarget | null; target?: EventTarget | null }) => {
      if (!enabled) return false;

      const element = getElementFromEvent(event);
      const label = getControlLabel(element);
      if (!maybeMarkMiss(kind, element, label)) return false;

      event.preventDefault();
      event.stopPropagation();
      return true;
    },
    [enabled, kind],
  );

  const maybeReloadAfterInteraction = useCallback(
    (event: { currentTarget?: EventTarget | null; target?: EventTarget | null }) => {
      if (!enabled) return;
      const element = getElementFromEvent(event);
      const label = getControlLabel(element);
      scheduleReload(kind, surface, element, label);
    },
    [enabled, kind, surface],
  );

  return {
    enabled,
    guardInteraction,
    maybeReloadAfterInteraction,
  };
}

export function WindowsExperienceCrashGate({
  componentName,
  children,
}: {
  componentName: string;
  children: React.ReactNode;
}) {
  const { enabled, generation } = useWindowsExperience();
  const checkKey = `${generation}:${componentName}`;

  if (enabled && !checkedCrashKeys.has(checkKey)) {
    checkedCrashKeys.add(checkKey);
    if (shouldCrashComponent(componentName)) {
      throw new Error(getCrashMessage(componentName));
    }
  }

  return <>{children}</>;
}

export function useWindowsExperienceLoadingDelay(enabled: boolean, loading: boolean, key: string) {
  const [displayLoading, setDisplayLoading] = useState(loading);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!enabled) {
      setDisplayLoading(loading);
      return;
    }

    if (loading) {
      setDisplayLoading(true);
      return;
    }

    const timestamp = now();
    const shouldLag =
      sessionState.lagCount < 30 &&
      timestamp - sessionState.enabledAt > 2000 &&
      timestamp - sessionState.lastLagAt > 2200 &&
      Math.random() < 0.38;

    if (!shouldLag) {
      setDisplayLoading(false);
      return;
    }

    sessionState.lagCount += 1;
    sessionState.lastLagAt = timestamp;
    setDisplayLoading(true);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setDisplayLoading(false);
    }, randomBetween(800, 2600));

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, key, loading]);

  return displayLoading;
}
