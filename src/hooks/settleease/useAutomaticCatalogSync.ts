"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useConvex } from "convex/react";
import { api } from "@convex/_generated/api";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface SyncStats {
  rowsCreated: number;
  rowsUpdated: number;
  totalCanonicalItems: number;
}

const LOCK_KEY = "settleease-catalog-sync-lock";
const LOCK_EXPIRY_MS = 60 * 1000; // 60-second lock safety window
const BROADCAST_CHANNEL_NAME = "settleease-catalog-sync";

export function useAutomaticCatalogSync(isOpen: boolean) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const syncInProgressRef = useRef(false);
  const convex = useConvex();

  // Convex Queries and Mutations
  const syncState = useQuery(
    api.app.checkBudgetCatalogSyncState,
    isOpen ? {} : "skip"
  );
  
  const importCleanedCatalog = useMutation(api.app.importCleanedCatalog);

  // Setup Broadcast Channel for Cross-Tab Coordination
  useEffect(() => {
    if (typeof window === "undefined") return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === "SYNC_START") {
          setStatus("syncing");
          setError(null);
        } else if (type === "SYNC_SUCCESS") {
          setStatus("success");
          setStats(payload);
          setError(null);
        } else if (type === "SYNC_ERROR") {
          setStatus("error");
          setError(payload);
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported or failed to initialize", e);
    }

    return () => {
      if (channel) {
        channel.close();
      }
    };
  }, []);

  const broadcast = useCallback((type: string, payload?: any) => {
    if (typeof window === "undefined") return;
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type, payload });
      channel.close();
    } catch {
      // Ignore broadcast errors
    }
  }, []);

  // Main Sync Pipeline
  const runSync = useCallback(async () => {
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;

    setStatus("syncing");
    setError(null);
    broadcast("SYNC_START");

    const clientSyncTimestamp = new Date().toISOString();

    try {
      // 1. Gather messy raw observations from Convex
      const { observations, allowedCategories } = await convex.query(api.app.getRawObservations);

      if (!observations || observations.length === 0) {
        console.log("No observations found to sync. Skipping AI cleanup.");
        setStatus("success");
        broadcast("SYNC_SUCCESS", { rowsCreated: 0, rowsUpdated: 0, totalCanonicalItems: 0 });
        return;
      }

      // 2. Dispatch to the Next.js API route with sequential model fallback & retry mechanisms
      let response: Response | null = null;
      let attempt = 0;
      const maxAttempts = 3;
      let delay = 1000;

      while (attempt < maxAttempts) {
        try {
          response = await fetch("/api/ai-clean-catalog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ observations, allowedCategories }),
          });

          // If the status is not a transient/server issue, break and handle properly
          if (response.status !== 503 && response.status !== 429 && response.status < 500) {
            break;
          }
        } catch (fetchErr) {
          console.warn(`Fetch attempt ${attempt + 1} failed:`, fetchErr);
        }

        attempt++;
        if (attempt < maxAttempts) {
          console.log(`Retrying API call in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }

      if (!response || !response.ok) {
        let errMessage = "AI catalog cleaning service failed.";
        try {
          const errData = await response?.json();
          if (errData?.error) errMessage = errData.error;
        } catch {}
        throw new Error(errMessage);
      }

      const cleanedData = await response.json();

      // 3. Commit back to Convex database using transaction-safe mutation
      const result = await importCleanedCatalog({
        canonicalItems: cleanedData.canonicalItems,
        mappings: cleanedData.mappings,
        clientSyncTimestamp,
      });

      if (result.status === "skipped") {
        console.log("Sync skipped by server due to newer concurrent update.");
        setStatus("success");
        broadcast("SYNC_SUCCESS", { rowsCreated: 0, rowsUpdated: 0, totalCanonicalItems: cleanedData.canonicalItems.length });
        return;
      }

      const syncStats: SyncStats = {
        rowsCreated: result.rowsCreated ?? 0,
        rowsUpdated: result.rowsUpdated ?? 0,
        totalCanonicalItems: cleanedData.canonicalItems.length,
      };

      setStats(syncStats);
      setStatus("success");
      broadcast("SYNC_SUCCESS", syncStats);
    } catch (err: any) {
      console.error("Catalog background sync failed:", err);
      const errMsg = err?.message || "Failed to consolidate catalog.";
      setError(errMsg);
      setStatus("error");
      broadcast("SYNC_ERROR", errMsg);
    } finally {
      // Release lock
      if (typeof window !== "undefined") {
        localStorage.removeItem(LOCK_KEY);
      }
      syncInProgressRef.current = false;
    }
  }, [convex, importCleanedCatalog, broadcast]);

  // Tab lock acquisition and automatic triggering logic
  useEffect(() => {
    if (!isOpen || !syncState?.isOutOfSync || status === "syncing" || syncInProgressRef.current) {
      return;
    }

    // Try to acquire local storage tab lock
    const now = Date.now();
    const existingLockVal = localStorage.getItem(LOCK_KEY);
    const existingLockTime = existingLockVal ? parseInt(existingLockVal, 10) : 0;

    if (existingLockTime && now - existingLockTime < LOCK_EXPIRY_MS) {
      // Another tab is actively working on it. Set status to syncing and wait for broadcast messages.
      setStatus("syncing");
      return;
    }

    // Set lock
    localStorage.setItem(LOCK_KEY, now.toString());

    // Double check that we actually acquired it (handles concurrent set)
    setTimeout(() => {
      const lockVal = localStorage.getItem(LOCK_KEY);
      if (lockVal === now.toString()) {
        // We own the lock! Run the sync.
        void runSync();
      } else {
        setStatus("syncing");
      }
    }, 50);

  }, [isOpen, syncState, status, runSync]);

  const triggerManualSync = useCallback(async () => {
    if (syncInProgressRef.current) return;
    const now = Date.now();
    localStorage.setItem(LOCK_KEY, now.toString());
    await runSync();
  }, [runSync]);

  return {
    status,
    error,
    stats,
    isOutOfSync: !!syncState?.isOutOfSync,
    triggerSync: triggerManualSync,
  };
}
