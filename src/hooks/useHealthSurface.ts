"use client";

import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@convex/_generated/api";

import type {
  HealthChunkAvailabilityResult,
  HealthGranularity,
  HealthMode,
  HealthSurfaceId,
  HealthSurfacePayloadMap,
  HealthSurfaceState,
} from "@/lib/settleease/healthTypes";

const inFlightEnsureRequests = new Map<string, Promise<unknown>>();

function buildEnsureKey({
  startDate,
  endDate,
  regenerateFailed,
}: {
  startDate?: string;
  endDate?: string;
  regenerateFailed?: boolean;
}) {
  return `${startDate || "all"}:${endDate || "all"}:${regenerateFailed ? "retry" : "auto"}`;
}

function runEnsureOnce(key: string, task: () => Promise<unknown>) {
  const existing = inFlightEnsureRequests.get(key);
  if (existing) return existing;

  const promise = task().finally(() => {
    inFlightEnsureRequests.delete(key);
  });
  inFlightEnsureRequests.set(key, promise);
  return promise;
}

export function useHealthSurface<TSurfaceId extends HealthSurfaceId>({
  surfaceId,
  mode,
  selectedPersonId,
  startDate,
  endDate,
  granularity,
  enabled = true,
}: {
  surfaceId: TSurfaceId;
  mode: HealthMode;
  selectedPersonId?: string | null;
  startDate?: string;
  endDate?: string;
  granularity?: HealthGranularity;
  enabled?: boolean;
}) {
  const queryArgs = enabled
    ? {
      surfaceId,
      mode,
      selectedPersonId: selectedPersonId || undefined,
      startDate,
      endDate,
      granularity,
    }
    : "skip";

  const availabilityArgs = enabled
    ? {
      startDate,
      endDate,
    }
    : "skip";

  const availability = useQuery(
    api.healthQueries.getHealthChunkAvailability,
    availabilityArgs,
  ) as HealthChunkAvailabilityResult | undefined;
  const liveState = useQuery(
    api.healthQueries.getHealthSurfaceState,
    queryArgs,
  ) as HealthSurfaceState<HealthSurfacePayloadMap[TSurfaceId]> | undefined;
  const ensureHealthChunks = useAction(api.healthActions.ensureHealthChunks);
  const [lastResolvedState, setLastResolvedState] = useState<HealthSurfaceState<HealthSurfacePayloadMap[TSurfaceId]> | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const requestKey = useMemo(
    () => `${surfaceId}:${mode}:${selectedPersonId || "group"}:${startDate || "all"}:${endDate || "all"}:${granularity || "default"}`,
    [endDate, granularity, mode, selectedPersonId, startDate, surfaceId],
  );
  const availabilitySummary = availability?.summary;

  useEffect(() => {
    if (!liveState) return;
    setLastResolvedState(liveState);
  }, [liveState, requestKey]);

  useEffect(() => {
    if (!enabled || !availabilitySummary) return;
    if (availabilitySummary.candidateRowCount <= 0) return;
    if (availabilitySummary.missingChunkCount <= 0) return;

    const ensureKey = buildEnsureKey({ startDate, endDate });
    void runEnsureOnce(ensureKey, () =>
      ensureHealthChunks({
        startDate,
        endDate,
      }),
    ).catch(() => {
      // Surface-level UI handles failures through the availability and state queries.
    });
  }, [
    availabilitySummary,
    availabilitySummary?.candidateRowCount,
    availabilitySummary?.missingChunkCount,
    enabled,
    endDate,
    ensureHealthChunks,
    startDate,
  ]);

  const surfaceState = liveState || (
    lastResolvedState
      ? {
        ...lastResolvedState,
        isRefreshing: true,
      }
      : null
  );

  async function retry() {
    if (!enabled) return;
    setIsRetrying(true);
    try {
      await runEnsureOnce(
        buildEnsureKey({ startDate, endDate, regenerateFailed: true }),
        () =>
          ensureHealthChunks({
            startDate,
            endDate,
            regenerateFailed: true,
          }),
      );
    } finally {
      setIsRetrying(false);
    }
  }

  return {
    availability,
    surfaceState,
    isInitialLoading: enabled && !availability && !surfaceState,
    isRetrying,
    retry,
  };
}
