"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/settleease";

interface ExclusionResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
  expenseDescription: string;
  expenseAmount: number;
  onConfirm: (strategy: string) => void;
  onCancel: () => void;
}

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

  // Fetch the dynamic ledger impact analysis
  const analysis = useQuery(api.app.analyzeExpenseExclusionImpact, {
    id: expenseId,
  });

  const isLoading = analysis === undefined;

  return (
    <SettleEaseDialog open={open} onOpenChange={onOpenChange} className="sm:max-w-2xl">
      {isLoading ? (
        <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col">
          <SettleEaseModalHeader
            icon={Scale}
            tone="default"
            title="Exclude from Settlements"
            description="Analyzing dynamic ledger entanglement..."
          />
          <SettleEaseModalBody className="space-y-4">
            {/* Warning Banner Skeleton */}
            <Skeleton className="h-16 w-full rounded-xl" />

            {/* Calculations Columns Skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4 w-4 shrink-0 rounded" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center py-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4 w-4 shrink-0 rounded" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-2 border border-border/60 rounded-xl space-y-1.5">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-3 w-40" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Strategies Skeletons */}
            <div className="space-y-3 pt-4">
              <Skeleton className="h-4 w-44" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3.5 border border-border/60 rounded-xl">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
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
              <span>
                Configure exclusion rules for{" "}
                <span className="font-semibold text-foreground">
                  &ldquo;{expenseDescription}&rdquo;
                </span>{" "}
                ({formatCurrency(expenseAmount)}).
              </span>
            }
          />

          <SettleEaseModalBody className="space-y-5">
            {/* Dynamic Alert Banner */}
            {analysis.hasSettlements ? (
              <SettleEaseModalNotice tone="warning" className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold tracking-tight text-amber-900 dark:text-amber-200 leading-tight">
                      {analysis.warningBoxText}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                      {analysis.explanationText}
                    </p>
                  </div>
                </div>

                {/* Overlapping Settlements & Balance Shifts List */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/40">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                      Projected Balance Shifts
                    </span>
                    <ul className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {analysis.balanceShifts.map((shift, idx) => (
                        <li
                          key={idx}
                          className="text-xs flex items-center justify-between py-1 border-b border-border/40 last:border-0"
                        >
                          <span className="font-medium text-foreground">
                            {shift.personName}
                          </span>
                          <span
                            className={cn(
                              "font-mono font-medium px-2 py-0.5 rounded-full text-[10px]",
                              shift.shiftAmount > 0
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-100/50"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-100/50"
                            )}
                          >
                            {shift.shiftAmount > 0 ? "+" : ""}
                            {shift.shiftAmount.toFixed(2)} INR
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      Entangled Past Payments
                    </span>
                    <ul className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                      {analysis.entangledSettlements.map((settlement, idx) => (
                        <li
                          key={idx}
                          className="text-xs flex flex-col bg-muted/40 border border-border/60 rounded-xl p-2.5"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground">
                              {settlement.debtorName} &rarr; {settlement.creditorName}
                            </span>
                            <span className="font-mono font-bold text-foreground">
                              {settlement.amountSettled.toFixed(2)} INR
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            Entangled share: {settlement.entangledAmount.toFixed(2)} INR ({settlement.associationType === "explicit_link" ? "Explicit" : "Legacy General"})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </SettleEaseModalNotice>
            ) : (
              <SettleEaseModalNotice tone="success" className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold tracking-tight text-emerald-900 dark:text-emerald-200 leading-tight">
                    Clean Ledger Exclusion Safe
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {analysis.explanationText}
                  </p>
                </div>
              </SettleEaseModalNotice>
            )}

            {/* Resolution Strategy Chooser */}
            {analysis.hasSettlements && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Settlement Exclusion Strategy
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {/* Lock & Carry Forward (Recommended) */}
                  <label
                    className={cn(
                      "flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer select-none",
                      selectedStrategy === "lock_and_carry"
                        ? "border-primary bg-accent/20 ring-1 ring-primary/20 shadow-sm"
                        : "border-border bg-card/60 hover:bg-accent/30"
                    )}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      value="lock_and_carry"
                      checked={selectedStrategy === "lock_and_carry"}
                      onChange={() => setSelectedStrategy("lock_and_carry")}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background transition-colors",
                        selectedStrategy === "lock_and_carry"
                          ? "bg-foreground text-background border-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Lock className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground leading-none">
                          Lock & Carry Forward
                        </span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 leading-none">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                        Keeps payments intact. Balances offset dynamically, re-routing Bob's dinner debt to Alice and directly resolving it. Excellent for simplified debt structures.
                      </p>
                    </div>
                  </label>

                  {/* Pro-Rata Adjustment */}
                  <label
                    className={cn(
                      "flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer select-none",
                      selectedStrategy === "pro_rata_adjust"
                        ? "border-primary bg-accent/20 ring-1 ring-primary/20 shadow-sm"
                        : "border-border bg-card/60 hover:bg-accent/30"
                    )}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      value="pro_rata_adjust"
                      checked={selectedStrategy === "pro_rata_adjust"}
                      onChange={() => setSelectedStrategy("pro_rata_adjust")}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background transition-colors",
                        selectedStrategy === "pro_rata_adjust"
                          ? "bg-foreground text-background border-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Scale className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-bold text-foreground leading-none">
                        Pro-Rata Adjustment
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                        Scale down overlapping payments in proportion to this excluded expense. If a payment's remaining balance drops to zero, it is archived cleanly.
                      </p>
                    </div>
                  </label>

                  {/* Unlink & Archive */}
                  <label
                    className={cn(
                      "flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer select-none",
                      selectedStrategy === "unlink_and_archive"
                        ? "border-primary bg-accent/20 ring-1 ring-primary/20 shadow-sm"
                        : "border-border bg-card/60 hover:bg-accent/30"
                    )}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      value="unlink_and_archive"
                      checked={selectedStrategy === "unlink_and_archive"}
                      onChange={() => setSelectedStrategy("unlink_and_archive")}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background transition-colors",
                        selectedStrategy === "unlink_and_archive"
                          ? "bg-foreground text-background border-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Archive className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-bold text-foreground leading-none">
                        Unlink & Archive
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                        Completely void and archive overlapping payments from future settlement calculations, resetting the ledger to its pre-settlement state.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </SettleEaseModalBody>

          <SettleEaseModalFooter className="sm:justify-end">
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                className="h-10 rounded-full"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                className="h-10 rounded-full bg-foreground text-background hover:bg-foreground/90"
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
