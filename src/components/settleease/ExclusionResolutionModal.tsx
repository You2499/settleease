"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto rounded-2xl border-stone-200/50 bg-[#faf9f6]/95 backdrop-blur-md p-6 shadow-[rgba(0,0,0,0.03)_0px_0px_0px_1px,rgba(78,50,23,0.04)_0px_16px_44px_-24px] focus:outline-none">
        <style>{`
          @keyframes soundwave {
            0%, 100% { transform: scaleY(0.25); }
            50% { transform: scaleY(1); }
          }
          .soundwave-bar {
            animation: soundwave 1.2s ease-in-out infinite;
            transform-origin: center;
          }
        `}</style>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <DialogHeader className="text-center flex flex-col items-center">
              <DialogTitle className="text-2xl font-light tracking-tight text-stone-800 font-serif leading-none">
                Exclude from Settlements
              </DialogTitle>
              <DialogDescription className="text-sm font-light text-stone-500 tracking-wide mt-2">
                Analyzing dynamic ledger entanglement...
              </DialogDescription>
            </DialogHeader>

            {/* Ethereal Soundwave Loading State */}
            <div className="flex items-end gap-1.5 justify-center h-16 py-2">
              <div
                className="w-1.5 h-10 bg-stone-400 dark:bg-stone-500 rounded-full soundwave-bar"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-1.5 h-10 bg-stone-500 dark:bg-stone-400 rounded-full soundwave-bar"
                style={{ animationDelay: "0.3s" }}
              />
              <div
                className="w-1.5 h-10 bg-stone-600 dark:bg-stone-300 rounded-full soundwave-bar"
                style={{ animationDelay: "0.5s" }}
              />
              <div
                className="w-1.5 h-10 bg-stone-500 dark:bg-stone-400 rounded-full soundwave-bar"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="w-1.5 h-10 bg-stone-400 dark:bg-stone-500 rounded-full soundwave-bar"
                style={{ animationDelay: "0.4s" }}
              />
            </div>

            <p className="text-xs text-stone-400/80 font-light tracking-wider uppercase">
              Calculating Pro-Rata Re-routing
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <DialogHeader className="text-left border-b border-stone-200/40 pb-4">
              <DialogTitle className="text-2xl font-[300] tracking-[-0.04em] text-stone-800 font-serif">
                Exclude from Settlements
              </DialogTitle>
              <DialogDescription className="text-sm font-light text-stone-500 mt-1">
                Configure exclusion ledger rules for{" "}
                <span className="font-semibold text-stone-700">
                  {expenseDescription}
                </span>{" "}
                ({formatCurrency(expenseAmount)}).
              </DialogDescription>
            </DialogHeader>

            {/* Dynamic Alert Banner */}
            {analysis.hasSettlements ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-stone-800 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold tracking-tight text-amber-900 leading-tight">
                      {analysis.warningBoxText}
                    </h4>
                    <p className="text-xs font-light text-stone-600 leading-relaxed mt-1">
                      {analysis.explanationText}
                    </p>
                  </div>
                </div>

                {/* Overlapping Settlements & Balance Shifts List */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-stone-200/50">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                      <TrendingDown className="h-3.5 w-3.5 text-stone-400" />
                      Balance Shifts
                    </span>
                    <ul className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                      {analysis.balanceShifts.map((shift, idx) => (
                        <li
                          key={idx}
                          className="text-xs font-light flex items-center justify-between text-stone-600 py-0.5"
                        >
                          <span className="font-medium text-stone-700">
                            {shift.personName}
                          </span>
                          <span
                            className={cn(
                              "font-mono font-medium px-1.5 py-0.5 rounded-full text-[11px]",
                              shift.shiftAmount > 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                            )}
                          >
                            {shift.shiftAmount > 0 ? "+" : ""}
                            {shift.shiftAmount.toFixed(2)} INR
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                      <Info className="h-3.5 w-3.5 text-stone-400" />
                      Entangled Payments
                    </span>
                    <ul className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                      {analysis.entangledSettlements.map((settlement, idx) => (
                        <li
                          key={idx}
                          className="text-xs font-light flex flex-col text-stone-600 bg-stone-100/50 rounded-lg p-1.5 border border-stone-200/30"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-stone-700">
                              {settlement.debtorName} &rarr; {settlement.creditorName}
                            </span>
                            <span className="font-mono font-medium text-stone-600">
                              {settlement.amountSettled.toFixed(2)} INR
                            </span>
                          </div>
                          <span className="text-[9px] text-stone-400 mt-0.5 italic">
                            Entangled: {settlement.entangledAmount.toFixed(2)} INR ({settlement.associationType === "explicit_link" ? "Explicit" : "Legacy"})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex gap-3 text-stone-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold tracking-tight text-emerald-900 leading-tight">
                    Clean Ledger Exclusion Safe
                  </h4>
                  <p className="text-xs font-light text-stone-600 leading-relaxed mt-1">
                    {analysis.explanationText}
                  </p>
                </div>
              </div>
            )}

            {/* Resolution Strategy Chooser */}
            {analysis.hasSettlements && (
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Select Settlement Exclusion Strategy
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {/* Lock & Carry Forward (Recommended) */}
                  <label
                    className={cn(
                      "flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer select-none",
                      selectedStrategy === "lock_and_carry"
                        ? "border-stone-400 bg-white shadow-[0_4px_12px_rgba(78,50,23,0.03)]"
                        : "border-stone-200 bg-white/50 hover:bg-white hover:border-stone-300"
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
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-stone-200",
                        selectedStrategy === "lock_and_carry"
                          ? "bg-stone-900 text-white border-stone-950"
                          : "bg-stone-50 text-stone-500"
                      )}
                    >
                      <Lock className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-stone-800 leading-none">
                          Lock & Carry Forward
                        </span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200/50 leading-none">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs font-light text-stone-500 leading-relaxed mt-1">
                        Keeps payments intact. Balances offset dynamically, re-routing Bob's dinner debt to Alice and directly resolving it. Excellent for simplified debt structures.
                      </p>
                    </div>
                  </label>

                  {/* Pro-Rata Adjustment */}
                  <label
                    className={cn(
                      "flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer select-none",
                      selectedStrategy === "pro_rata_adjust"
                        ? "border-stone-400 bg-white shadow-[0_4px_12px_rgba(78,50,23,0.03)]"
                        : "border-stone-200 bg-white/50 hover:bg-white hover:border-stone-300"
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
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-stone-200",
                        selectedStrategy === "pro_rata_adjust"
                          ? "bg-stone-900 text-white border-stone-950"
                          : "bg-stone-50 text-stone-500"
                      )}
                    >
                      <Scale className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-stone-800 leading-none">
                        Pro-Rata Adjustment
                      </span>
                      <p className="text-xs font-light text-stone-500 leading-relaxed mt-1">
                        Scale down overlapping payments in proportion to this excluded expense. If a payment's remaining balance drops to zero, it is archived cleanly.
                      </p>
                    </div>
                  </label>

                  {/* Unlink & Archive */}
                  <label
                    className={cn(
                      "flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer select-none",
                      selectedStrategy === "unlink_and_archive"
                        ? "border-stone-400 bg-white shadow-[0_4px_12px_rgba(78,50,23,0.03)]"
                        : "border-stone-200 bg-white/50 hover:bg-white hover:border-stone-300"
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
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-stone-200",
                        selectedStrategy === "unlink_and_archive"
                          ? "bg-stone-900 text-white border-stone-950"
                          : "bg-stone-50 text-stone-500"
                      )}
                    >
                      <Archive className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-stone-800 leading-none">
                        Unlink & Archive
                      </span>
                      <p className="text-xs font-light text-stone-500 leading-relaxed mt-1">
                        Completely void and archive overlapping payments from future settlement calculations, resetting the ledger to its pre-settlement state.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Modal Footer / Actions */}
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-stone-200/40 pt-4 mt-6">
              <Button
                variant="outline"
                className="h-10 rounded-full border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-800"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                className="h-10 rounded-full bg-stone-900 text-white hover:bg-stone-800"
                onClick={() => onConfirm(analysis.hasSettlements ? selectedStrategy : "lock_and_carry")}
              >
                {analysis.hasSettlements ? "Apply Strategy & Exclude" : "Confirm Exclusion"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
