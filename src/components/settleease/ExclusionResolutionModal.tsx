"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SettleEaseDialog, {
  SettleEaseModalBody,
  SettleEaseModalFooter,
  SettleEaseModalHeader,
  SettleEaseModalNotice,
} from "./SettleEaseDialog";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Scale,
  Archive,
  TrendingDown,
  Info,
  Coins,
  ArrowRight,
  Sparkles,
  HandCoins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/settleease";
import type { DynamicExclusionStrategy } from "@/lib/settleease/types";

interface ExclusionResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
  expenseDescription: string;
  expenseAmount: number;
  onConfirm: (strategy: string) => void;
  onCancel: () => void;
}

const STRATEGY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  lock_and_carry: Lock,
  pro_rata_adjust: Scale,
  unlink_and_archive: Archive,
  lahu_debt_settlement: HandCoins,
};

export default function ExclusionResolutionModal({
  open,
  onOpenChange,
  expenseId,
  expenseDescription,
  expenseAmount,
  onConfirm,
  onCancel,
}: ExclusionResolutionModalProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<string>("lock_and_carry");

  // Fetch dynamic impact analysis from the Convex backend
  const analysis = useQuery(api.app.analyzeExpenseExclusionImpact, {
    id: expenseId,
  });

  const isLoading = analysis === undefined;

  // Auto-select recommended strategy when backend analysis loads
  useEffect(() => {
    if (analysis?.strategies && analysis.strategies.length > 0) {
      const recommended = analysis.strategies.find((s) => s.badge === "Recommended");
      setSelectedStrategy(recommended ? recommended.id : analysis.strategies[0].id);
    }
  }, [analysis]);

  // Find the selected strategy data and its specific simulated outcomes
  const currentStrategy = analysis?.strategies?.find((s) => s.id === selectedStrategy) || analysis?.strategies?.[0];
  const simulatedShifts = currentStrategy?.simulatedOutcome?.balanceShifts || [];
  const simulatedSettlements = currentStrategy?.simulatedOutcome?.entangledSettlements || [];

  return (
    <SettleEaseDialog open={open} onOpenChange={onOpenChange} className="sm:max-w-2xl">
      {isLoading ? (
        <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col" aria-busy="true" aria-label="Analyzing exclusion ledger impact...">
          <SettleEaseModalHeader
            icon={Scale}
            tone="default"
            title="Exclude from Settlements"
            description="Analyzing dynamic ledger entanglement..."
          />
          <SettleEaseModalBody className="space-y-6">
            {/* Warning Notice Banner Skeleton */}
            <div className="rounded-xl border border-border/50 p-4 space-y-2.5 bg-muted/10">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full shrink-0 animate-pulse" />
                <Skeleton className="h-5 w-48 animate-pulse" />
              </div>
              <Skeleton className="h-4 w-full animate-pulse" />
              <Skeleton className="h-4 w-5/6 animate-pulse" />
            </div>

            {/* Calculations Columns Skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Projected Balance Shifts Skeletons */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 shrink-0 rounded animate-pulse" />
                  <Skeleton className="h-4 w-36 animate-pulse" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                      <Skeleton className="h-4 w-20 animate-pulse" />
                      <div className="flex gap-2 items-center">
                        <Skeleton className="h-3 w-8 animate-pulse" />
                        <Skeleton className="h-4.5 w-16 rounded-full animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Entangled Past Payments Skeletons */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 shrink-0 rounded animate-pulse" />
                  <Skeleton className="h-4 w-40 animate-pulse" />
                </div>
                <div className="space-y-2.5">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-3 border border-border/50 rounded-xl space-y-2 bg-card">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-28 animate-pulse" />
                        <Skeleton className="h-4 w-12 animate-pulse" />
                      </div>
                      <Skeleton className="h-3.5 w-36 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Strategies List Skeletons */}
            <div className="space-y-3 pt-2">
              <Skeleton className="h-4 w-52 animate-pulse" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 p-4 border border-border/50 rounded-xl bg-card">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0 animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-36 animate-pulse" />
                      <Skeleton className="h-4 w-20 rounded animate-pulse" />
                    </div>
                    <Skeleton className="h-3.5 w-full animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </SettleEaseModalBody>

          <SettleEaseModalFooter className="sm:justify-end">
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Skeleton className="h-10 w-24 rounded-full" />
              <Skeleton className="h-10 w-44 rounded-full" />
            </div>
          </SettleEaseModalFooter>
        </div>
      ) : (
        <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col">
          <SettleEaseModalHeader
            icon={Scale}
            tone={analysis.hasSettlements ? "warning" : "default"}
            title="Exclude from Settlements"
            description={
              <span className="tracking-[0.14px] text-muted-foreground font-medium">
                Configure exclusion rules for{" "}
                <span className="font-semibold text-foreground">
                  &ldquo;{expenseDescription}&rdquo;
                </span>{" "}
                ({formatCurrency(expenseAmount)}).
              </span>
            }
          />

          <SettleEaseModalBody className="space-y-6 select-none">
            {/* Safe / Conflict Banners */}
            {analysis.hasSettlements ? (
              <SettleEaseModalNotice tone="warning" className="space-y-4 shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset] dark:shadow-[rgba(255,255,255,0.05)_0px_0px_0px_0.5px_inset]">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold tracking-tight text-amber-900 dark:text-amber-200 leading-tight">
                      {analysis.warningBoxText}
                    </h4>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed mt-1.5 tracking-[0.14px]">
                      {analysis.explanationText}
                    </p>
                  </div>
                </div>

                {/* Strategy-Specific Simulations Dashboard */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-amber-200/50 dark:border-amber-950/40">
                  {/* Balance Shifts Preview */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/60 dark:text-amber-200/60 flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5" />
                      Projected Balance Shifts
                    </span>
                    {simulatedShifts.length > 0 ? (
                      <ul className="space-y-2 max-h-[140px] overflow-y-auto pr-1" aria-label="Simulated balance impacts">
                        {simulatedShifts.map((shift, idx) => {
                          const isPositive = shift.shiftAmount > 0;
                          return (
                            <li
                              key={idx}
                              className="text-xs flex items-center justify-between py-1.5 border-b border-amber-200/10 dark:border-amber-950/20 last:border-0"
                            >
                              <span className="font-medium text-amber-900 dark:text-amber-200">
                                {shift.personName}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-amber-900/40 dark:text-amber-200/40 line-through font-mono text-[10px]">
                                  {shift.currentBalance.toFixed(2)}
                                </span>
                                <ArrowRight className="h-3 w-3 text-amber-900/30 dark:text-amber-200/30" />
                                <span className="font-semibold text-amber-950 dark:text-white font-mono">
                                  {shift.projectedBalance.toFixed(2)}
                                </span>
                                <span
                                  className={cn(
                                    "font-mono font-semibold px-2 py-0.5 rounded-full text-[10px] border shadow-sm",
                                    isPositive
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-100/50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30"
                                      : "bg-rose-50 text-rose-700 border-rose-100/50 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/30"
                                  )}
                                >
                                  {isPositive ? "+" : ""}
                                  {shift.shiftAmount.toFixed(2)} INR
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="text-xs text-amber-800/60 dark:text-amber-300/60 py-2 italic">
                        No balance shifts projected.
                      </div>
                    )}
                  </div>

                  {/* Entangled Payments Preview */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/60 dark:text-amber-200/60 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      Entangled Past Payments
                    </span>
                    <ul className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1" aria-label="Affected settlement payments preview">
                      {simulatedSettlements.map((settlement, idx) => (
                        <li
                          key={idx}
                          className={cn(
                            "text-xs flex flex-col border rounded-xl p-3 shadow-[rgba(0,0,0,0.02)_0px_2px_4px] transition-all duration-150",
                            settlement.isArchived
                              ? "bg-rose-950/5 border-rose-200/40 dark:bg-rose-950/10 dark:border-rose-900/20 opacity-70"
                              : "bg-amber-950/5 border-amber-200/30 dark:bg-amber-950/20 dark:border-amber-900/40"
                          )}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-amber-950 dark:text-amber-200">
                              {settlement.debtorName} &rarr; {settlement.creditorName}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {settlement.isArchived ? (
                                <span className="font-mono text-rose-600 dark:text-rose-400 font-bold line-through">
                                  {settlement.amountSettled.toFixed(2)}
                                </span>
                              ) : (
                                <>
                                  {settlement.adjustedAmount !== settlement.amountSettled && (
                                    <span className="font-mono text-amber-900/40 dark:text-amber-200/40 line-through text-[10px]">
                                      {settlement.amountSettled.toFixed(2)}
                                    </span>
                                  )}
                                  <span className="font-mono font-bold text-amber-950 dark:text-white">
                                    {settlement.adjustedAmount.toFixed(2)}
                                  </span>
                                </>
                              )}
                              <span className="font-mono text-[9px] font-medium text-amber-900/50 dark:text-amber-200/50">INR</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-amber-900/5 dark:border-amber-200/5 text-[10px] text-amber-800/70 dark:text-amber-300/70">
                            <span className="flex items-center gap-1">
                              <Coins className="h-3.5 w-3.5 text-amber-600/70 dark:text-amber-400/70" />
                              Entangled Share: {settlement.entangledAmount.toFixed(2)} INR
                            </span>
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded-full border text-[9px] font-semibold tracking-wider uppercase leading-none",
                                settlement.isArchived
                                  ? "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/30"
                                  : settlement.adjustedAmount !== settlement.amountSettled
                                  ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/30"
                                  : "bg-muted/40 text-muted-foreground border-border/40"
                              )}
                            >
                              {settlement.isArchived
                                ? "Void / Archived"
                                : settlement.adjustedAmount !== settlement.amountSettled
                                ? "Scaled Down"
                                : settlement.associationType === "explicit_link"
                                ? "Explicit Link"
                                : "General net"}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Direct Lahu Payments Preview */}
                  {selectedStrategy === "lahu_debt_settlement" && currentStrategy?.simulatedOutcome?.isolatedDirectTransactions && (
                    <div className="col-span-1 md:col-span-2 space-y-3 mt-4 pt-4 border-t border-amber-200/40 dark:border-amber-950/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/60 dark:text-amber-200/60 flex items-center gap-1.5">
                        <HandCoins className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
                        Bypassed Direct Pairwise Settlements
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentStrategy.simulatedOutcome.isolatedDirectTransactions.map((tx, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col border-l-4 border-neutral-700 dark:border-neutral-400 bg-white/40 dark:bg-neutral-950/40 p-3 rounded-r-xl rounded-l-sm shadow-[rgba(0,0,0,0.02)_0px_2px_4px] transition-all duration-150"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                                {tx.fromName} &rarr; {tx.toName}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-bold text-neutral-950 dark:text-white text-sm">
                                  {tx.amount.toFixed(2)}
                                </span>
                                <span className="font-mono text-[9px] font-medium text-neutral-500">INR</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 text-[9px]">
                              <span className="text-neutral-500 font-medium">Bypasses global simplified netting</span>
                              <span className="bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-0.5 rounded font-bold tracking-wider uppercase text-[8px] leading-none">
                                DIRECT PAIRWISE
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SettleEaseModalNotice>
            ) : (
              <SettleEaseModalNotice tone="success" className="flex gap-3 shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset] dark:shadow-[rgba(255,255,255,0.05)_0px_0px_0px_0.5px_inset]">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold tracking-tight text-emerald-900 dark:text-emerald-200 leading-tight">
                    Clean Ledger Exclusion Safe
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1 tracking-[0.14px]">
                    {analysis.explanationText}
                  </p>
                </div>
              </SettleEaseModalNotice>
            )}

            {/* Dynamic Selector Cards */}
            {analysis.hasSettlements && analysis.strategies && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Select Settlement Exclusion Strategy
                  </h4>
                  <span className="text-[10px] text-muted-foreground tracking-[0.14px]">
                    Choose strategy to preview outcomes.
                  </span>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Settlement exclusion strategy options"
                  className="grid grid-cols-1 gap-3.5"
                >
                  {analysis.strategies.map((strategy: DynamicExclusionStrategy) => {
                    const isSelected = selectedStrategy === strategy.id;
                    const IconComponent = STRATEGY_ICONS[strategy.id] || Lock;

                    return (
                      <label
                        key={strategy.id}
                        onClick={() => setSelectedStrategy(strategy.id)}
                        className={cn(
                          "group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                          isSelected
                            ? "border-primary bg-primary/[0.02] shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset,rgba(0,0,0,0.06)_0px_0px_0px_1px,rgba(78,50,23,0.06)_0px_6px_16px] dark:border-primary dark:bg-primary/[0.04] dark:shadow-[rgba(255,255,255,0.08)_0px_0px_0px_0.5px_inset,rgba(0,0,0,0.5)_0px_0px_0px_1px,rgba(0,0,0,0.42)_0px_6px_16px]"
                            : "border-border/60 bg-card hover:bg-accent/5 hover:border-border shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset,rgba(0,0,0,0.04)_0px_4px_4px] dark:border-border/40 dark:bg-card/40 dark:hover:bg-accent/10 dark:shadow-[rgba(255,255,255,0.05)_0px_0px_0px_0.5px_inset,rgba(0,0,0,0.38)_0px_1px_2px]"
                        )}
                        aria-checked={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        role="radio"
                        aria-label={`${strategy.title} strategy`}
                        aria-describedby={`desc-${strategy.id}`}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            setSelectedStrategy(strategy.id);
                          } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                            e.preventDefault();
                            const currIdx = analysis.strategies.findIndex((s) => s.id === strategy.id);
                            const nextIdx = (currIdx + 1) % analysis.strategies.length;
                            setSelectedStrategy(analysis.strategies[nextIdx].id);
                            const labelEl = document.querySelectorAll('[role="radio"]')[nextIdx] as HTMLElement;
                            labelEl?.focus();
                          } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                            e.preventDefault();
                            const currIdx = analysis.strategies.findIndex((s) => s.id === strategy.id);
                            const prevIdx = (currIdx - 1 + analysis.strategies.length) % analysis.strategies.length;
                            setSelectedStrategy(analysis.strategies[prevIdx].id);
                            const labelEl = document.querySelectorAll('[role="radio"]')[prevIdx] as HTMLElement;
                            labelEl?.focus();
                          }
                        }}
                      >
                        <input
                          type="radio"
                          name="exclusion-strategy"
                          value={strategy.id}
                          checked={isSelected}
                          onChange={() => setSelectedStrategy(strategy.id)}
                          className="sr-only"
                          tabIndex={-1}
                          id={`input-${strategy.id}`}
                        />
                        
                        {/* Strategy Icon Container */}
                        <div
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all duration-200",
                            isSelected
                              ? "bg-foreground text-background border-foreground shadow-sm dark:bg-foreground dark:text-background"
                              : "text-muted-foreground border-border bg-muted/20 group-hover:bg-muted/40 dark:border-border/40"
                          )}
                        >
                          <IconComponent className="h-4.5 w-4.5" />
                        </div>

                        {/* Strategy Copy */}
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground leading-none tracking-normal group-hover:font-medium transition-all duration-200">
                              {strategy.title}
                            </span>
                            {strategy.badge && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f5f2ef] shadow-[rgba(78,50,23,0.04)_0px_6px_16px] text-black border border-border/50 leading-none dark:bg-muted dark:text-white dark:border-border/30">
                                {strategy.badge}
                              </span>
                            )}
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none capitalize", strategy.impactColor)}>
                              {strategy.impactLabel}
                            </span>
                          </div>
                          
                          <p id={`desc-${strategy.id}`} className="text-xs text-muted-foreground leading-relaxed mt-1.5 tracking-[0.14px]">
                            {strategy.fullDescription}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </SettleEaseModalBody>

          <SettleEaseModalFooter className="sm:justify-end">
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                className="h-10 px-5 rounded-full text-foreground border border-border/70 bg-white hover:bg-neutral-50 shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(0,0,0,0.04)_0px_4px_4px] dark:bg-[#141414] dark:border-border/40 dark:hover:bg-accent/10"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                className="h-10 px-5 rounded-full bg-black text-white hover:bg-black/90 shadow-sm dark:bg-white dark:text-black dark:hover:bg-white/90"
                onClick={() =>
                  onConfirm(
                    analysis.hasSettlements ? selectedStrategy : "lock_and_carry"
                  )
                }
              >
                {analysis.hasSettlements
                  ? "Apply Strategy & Exclude"
                  : "Confirm Exclusion"}
              </Button>
            </div>
          </SettleEaseModalFooter>
        </div>
      )}
    </SettleEaseDialog>
  );
}
