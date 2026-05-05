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
  surfaceVisitKey: number;
  freezeUntil: number;
  requestFreeze: (durationMs?: number) => void;
};

const WindowsExperienceContext = createContext<WindowsExperienceContextValue>({
  enabled: false,
  surface: "unknown",
  generation: 0,
  surfaceVisitKey: 0,
  freezeUntil: 0,
  requestFreeze: () => {},
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
  surfaceVisitKey: 0,
};

const checkedCrashKeys = new Set<string>();

const SAFE_CONTROL_PATTERN =
  /settings|windows experience|profile|open profile|log ?out|sign ?out|keyboard shortcuts|danger|unlock production|lock production|confirmation|sign in|sign up|google/i;

const RELOAD_BLOCK_PATTERN =
  /save|delete|remove|factory|reset|clear|unlock|lock|confirm|submit|add|scan|upload|camera|download|print|pay|seed|apply|export|sign|log ?out|edit name|try again/i;

const LOCAL_RELOAD_SURFACES = new Set([
  "dashboard",
  "analytics",
  "health",
  "addExpense",
  "editExpenses",
  "managePeople",
  "manageCategories",
  "manageSettlements",
  "exportExpense",
  "scanReceipt",
]);

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

function getInteractiveElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest(
    "button,a,[role='button'],[role='tab'],[data-sidebar='menu-button'],[data-radix-collection-item]",
  );
}

function getControlKind(element: Element | null): ControlKind {
  if (!element) return "button";
  if (element.getAttribute("data-sidebar") === "menu-button") return "sidebar";
  if (element.getAttribute("role") === "tab") return "tab";
  if (element.getAttribute("role") === "option") return "select";
  return "button";
}

function isExplicitlySafe(element: Element | null, label: string) {
  if (!element) return false;
  if (element.closest("[data-windows-experience-safe='true']")) return true;
  return SAFE_CONTROL_PATTERN.test(label);
}

function canMiss(kind: ControlKind) {
  if (!sessionState.enabled) return false;
  if (sessionState.missCount >= 140) return false;
  const timestamp = now();
  if (timestamp - sessionState.enabledAt < 600) return false;
  if (timestamp - sessionState.lastMissAt < 350) return false;

  const chanceByKind: Record<ControlKind, number> = {
    button: 0.62,
    tab: 0.58,
    select: 0.52,
    sidebar: 0.6,
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
  if (sessionState.reloadCount >= 5) return false;
  if (kind === "button" && RELOAD_BLOCK_PATTERN.test(label)) return false;
  if (isExplicitlySafe(element, label)) return false;

  const timestamp = now();
  const lastStoredReload = Number(sessionStorage.getItem("settleease_windows_experience_reload_at") || "0");
  if (timestamp - sessionState.enabledAt < 4500) return false;
  if (timestamp - sessionState.lastReloadAt < 32000) return false;
  if (timestamp - lastStoredReload < 24000) return false;

  const chanceByKind: Record<ControlKind, number> = {
    button: 0.12,
    tab: 0.28,
    select: 0.2,
    sidebar: 0.24,
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

  const timestamp = now();
  if (timestamp - sessionState.enabledAt < 1200) return false;

  const isWholePage = /^(Home|Analytics|Health|Add Expense|Edit Expenses|Manage People|Manage Categories|Manage Settlements|Export Expense|Smart Scan)$/.test(componentName);
  const isNormalUserSurface = /^(Home|Analytics|Health)/.test(componentName);
  const crashChance = isWholePage ? 0.18 : isNormalUserSurface ? 0.62 : 0.42;
  if (Math.random() >= crashChance) return false;

  sessionState.crashCount += 1;
  sessionState.lastCrashAt = timestamp;
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
  const [surfaceVisitKey, setSurfaceVisitKey] = useState(0);
  const [freezeUntil, setFreezeUntil] = useState(0);
  const freezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFreeze = useCallback(() => {
    if (freezeTimerRef.current) {
      clearTimeout(freezeTimerRef.current);
      freezeTimerRef.current = null;
    }
    setFreezeUntil(0);
  }, []);

  const requestFreeze = useCallback(
    (durationMs?: number) => {
      if (!sessionState.enabled) return;
      const nextFreezeUntil = now() + (durationMs ?? randomBetween(4000, 12000));
      setFreezeUntil(nextFreezeUntil);

      if (freezeTimerRef.current) {
        clearTimeout(freezeTimerRef.current);
      }

      freezeTimerRef.current = setTimeout(() => {
        freezeTimerRef.current = null;
        setFreezeUntil(0);
      }, Math.max(0, nextFreezeUntil - now()));
    },
    [],
  );

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
    clearFreeze();
    setGeneration(sessionState.generation);
  }, [clearFreeze, enabled]);

  useEffect(() => {
    if (!enabled) return;
    sessionState.surfaceVisitKey += 1;
    checkedCrashKeys.clear();
    setSurfaceVisitKey(sessionState.surfaceVisitKey);
  }, [enabled, surface]);

  useEffect(() => {
    if (!enabled) return;

    const handleGlobalClick = (event: MouseEvent) => {
      const element = getInteractiveElement(event.target);
      if (!element) return;

      const label = getControlLabel(element);
      if (isExplicitlySafe(element, label)) return;

      const kind = getControlKind(element);
      if (maybeMarkMiss(kind, element, label)) {
        if (Math.random() < 0.36) {
          requestFreeze(randomBetween(4000, 12000));
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (Math.random() < 0.18) {
        requestFreeze(randomBetween(4000, 10000));
      }
      scheduleReload(kind, surface, element, label);
    };

    window.addEventListener("click", handleGlobalClick, true);
    return () => window.removeEventListener("click", handleGlobalClick, true);
  }, [enabled, requestFreeze, surface]);

  const value = useMemo(
    () => ({
      enabled,
      surface,
      generation,
      surfaceVisitKey,
      freezeUntil,
      requestFreeze,
    }),
    [enabled, freezeUntil, generation, requestFreeze, surface, surfaceVisitKey],
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
  const { enabled, surface, requestFreeze } = useWindowsExperience();

  const guardInteraction = useCallback(
    (event: { preventDefault: () => void; stopPropagation: () => void; currentTarget?: EventTarget | null; target?: EventTarget | null }) => {
      if (!enabled) return false;

      const element = getElementFromEvent(event);
      const label = getControlLabel(element);
      if (!maybeMarkMiss(kind, element, label)) return false;

      if (Math.random() < 0.34) {
        requestFreeze(randomBetween(4000, 12000));
      }

      event.preventDefault();
      event.stopPropagation();
      return true;
    },
    [enabled, kind, requestFreeze],
  );

  const maybeReloadAfterInteraction = useCallback(
    (event: { currentTarget?: EventTarget | null; target?: EventTarget | null }) => {
      if (!enabled) return;
      const element = getElementFromEvent(event);
      const label = getControlLabel(element);
      if (!isExplicitlySafe(element, label) && Math.random() < 0.2) {
        requestFreeze(randomBetween(4000, 10000));
      }
      scheduleReload(kind, surface, element, label);
    },
    [enabled, kind, requestFreeze, surface],
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
  const { enabled, generation, surfaceVisitKey } = useWindowsExperience();
  const checkKey = `${generation}:${surfaceVisitKey}:${componentName}`;

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
      sessionState.lagCount < 90 &&
      timestamp - sessionState.enabledAt > 600 &&
      timestamp - sessionState.lastLagAt > 700 &&
      Math.random() < 0.78;

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
    }, randomBetween(3000, 10000));

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, key, loading]);

  return displayLoading;
}

export function useWindowsExperienceNavigation({
  activeView,
  enabled,
}: {
  activeView: string;
  enabled: boolean;
}) {
  const [renderedView, setRenderedView] = useState(activeView);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!enabled || activeView === "settings") {
      setRenderedView(activeView);
      setIsTransitioning(false);
      return;
    }

    if (activeView === renderedView) {
      setIsTransitioning(false);
      return;
    }

    setIsTransitioning(true);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setRenderedView(activeView);
      setIsTransitioning(false);
    }, randomBetween(2200, 8200));

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [activeView, enabled, renderedView]);

  return {
    renderedView,
    isTransitioning,
  };
}

export function WindowsExperienceFreezeLayer() {
  const { enabled, freezeUntil } = useWindowsExperience();
  const [isFrozen, setIsFrozen] = useState(false);

  useEffect(() => {
    if (!enabled || freezeUntil <= now()) {
      setIsFrozen(false);
      return;
    }

    setIsFrozen(true);
    const timer = setTimeout(() => setIsFrozen(false), freezeUntil - now());
    return () => clearTimeout(timer);
  }, [enabled, freezeUntil]);

  if (!isFrozen) return null;

  return (
    <div
      aria-hidden="true"
      data-windows-experience-safe="true"
      className="absolute inset-0 z-40 cursor-wait"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    />
  );
}
