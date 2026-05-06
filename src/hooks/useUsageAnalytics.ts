"use client";

import { useCallback, useMemo, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  bucketUsageDuration,
  getUsageEventGroup,
  sanitizeUsageMetadata,
  type UsageEventStatus,
  type UsageMetadata,
  type UsageSurface,
} from "@/lib/settleease/usageAnalytics";

const SESSION_STORAGE_KEY = "settleease:usage-session-id";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getUsageSessionId() {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const next = createSessionId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return createSessionId();
  }
}

export interface TrackUsageEventInput {
  eventName: string;
  surface?: UsageSurface;
  status?: UsageEventStatus;
  targetKind?: string | null;
  durationMs?: number | null;
  metadata?: UsageMetadata;
}

export function useUsageAnalytics({
  surface,
  enabled = true,
}: {
  surface: UsageSurface;
  enabled?: boolean;
}) {
  const trackUsageEvent = useMutation(api.app.trackUsageEvent);
  const onceKeysRef = useRef(new Set<string>());
  const sessionId = useMemo(() => getUsageSessionId(), []);

  const track = useCallback(
    (input: TrackUsageEventInput) => {
      if (!enabled) return;
      const metadata = sanitizeUsageMetadata({
        ...input.metadata,
        durationBucket: input.durationMs ? bucketUsageDuration(input.durationMs) : input.metadata?.durationBucket,
      });

      void trackUsageEvent({
        eventName: input.eventName,
        eventGroup: getUsageEventGroup(input.eventName),
        surface: input.surface ?? surface,
        status: input.status ?? "success",
        sessionId,
        targetKind: input.targetKind ?? null,
        durationMs: input.durationMs ?? null,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      }).catch((error) => {
        console.warn("Usage analytics event was not recorded:", error);
      });
    },
    [enabled, sessionId, surface, trackUsageEvent],
  );

  const trackOnce = useCallback(
    (key: string, input: TrackUsageEventInput) => {
      if (onceKeysRef.current.has(key)) return;
      onceKeysRef.current.add(key);
      track(input);
    },
    [track],
  );

  const startTimer = useCallback(() => {
    const startedAt = performance.now();
    return (input: Omit<TrackUsageEventInput, "durationMs">) => {
      track({
        ...input,
        durationMs: Math.round(performance.now() - startedAt),
      });
    };
  }, [track]);

  return useMemo(
    () => ({ sessionId, track, trackOnce, startTimer }),
    [sessionId, startTimer, track, trackOnce],
  );
}
