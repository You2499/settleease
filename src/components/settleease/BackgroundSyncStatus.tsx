"use client";

import React from "react";
import { Sparkles, Check, AlertCircle, Loader2 } from "lucide-react";
import type { SyncStatus, SyncStats } from "@/hooks/settleease/useAutomaticCatalogSync";

interface BackgroundSyncStatusProps {
  status: SyncStatus;
  error: string | null;
  stats: SyncStats | null;
  isOutOfSync: boolean;
  onRetry: () => void;
}

export function BackgroundSyncStatus({
  status,
  error,
  stats,
  isOutOfSync,
  onRetry,
}: BackgroundSyncStatusProps) {
  // If the catalog is completely synced and idle, display a very minimal, premium status indicator
  if (status === "idle" && !isOutOfSync) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-50/80 dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-800/60 shadow-sm text-xs font-medium text-stone-600 dark:text-stone-400">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Catalog up to date</span>
      </div>
    );
  }

  if (status === "syncing") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100/90 dark:bg-stone-900/90 border border-stone-200/60 dark:border-stone-800/60 shadow-sm text-xs font-medium text-stone-700 dark:text-stone-300">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-500" />
        <span className="flex items-center gap-1">
          Smart AI Syncing <span className="animate-pulse">...</span>
        </span>
      </div>
    );
  }

  if (status === "success") {
    const summary = stats
      ? `${stats.totalCanonicalItems} products normalized`
      : "Catalog optimized";
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 shadow-sm text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-fadeIn">
        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>{summary}</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 shadow-sm text-xs font-medium text-amber-900 dark:text-amber-300 animate-fadeIn">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
        <span className="max-w-[180px] truncate">{error || "AI service busy"}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="ml-1 px-1.5 py-0.5 rounded bg-stone-200/60 hover:bg-stone-200 dark:bg-stone-800/60 dark:hover:bg-stone-800 text-[10px] text-stone-700 dark:text-stone-300 font-semibold active:scale-95 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
