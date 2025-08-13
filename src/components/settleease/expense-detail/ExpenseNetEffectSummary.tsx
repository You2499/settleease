"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { Expense, CelebrationContribution } from "@/lib/settleease/types";

interface ExpenseNetEffectSummaryProps {
  expense: Expense;
  sortedInvolvedPersonIdsOverall: string[];
  celebrationContributionOpt: CelebrationContribution | null | undefined;
  amountEffectivelySplit: number;
  peopleMap: Record<string, string>;
}

export default function ExpenseNetEffectSummary({
  expense,
  sortedInvolvedPersonIdsOverall,
  celebrationContributionOpt,
  amountEffectivelySplit,
  peopleMap,
}: ExpenseNetEffectSummaryProps) {
  return (
    <Card>
      <CardHeader className="pt-3 sm:pt-4 pb-2">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          Individual Net Effect
        </CardTitle>
        <CardDescription className="text-xs">
          Each person's financial position for this expense, after considering their payments
          and share of the{" "}
          <strong className="text-accent">{formatCurrency(amountEffectivelySplit)}</strong> split
          amount.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-xs sm:text-sm pt-0">
        {sortedInvolvedPersonIdsOverall.length > 0 ? (
          (() => {
            // Compute net effect for each person and sort accordingly
            const peopleWithNetEffect = sortedInvolvedPersonIdsOverall.map((personId) => {
              const personName = peopleMap[personId] || "Unknown Person";
              const paymentRecord = Array.isArray(expense.paid_by)
                ? expense.paid_by.find((p) => p.personId === personId)
                : null;
              const amountPhysicallyPaidByThisPerson = paymentRecord
                ? Number(paymentRecord.amount)
                : 0;
              const shareRecord = Array.isArray(expense.shares)
                ? expense.shares.find((s) => s.personId === personId)
                : null;
              const shareOfSplitAmountForThisPerson = shareRecord
                ? Number(shareRecord.amount)
                : 0;
              const isCelebrationContributor =
                celebrationContributionOpt?.personId === personId;
              const celebrationAmountByThisPerson = isCelebrationContributor
                ? celebrationContributionOpt?.amount || 0
                : 0;
              const totalObligationForThisPerson =
                shareOfSplitAmountForThisPerson + celebrationAmountByThisPerson;
              const netEffectForThisPerson =
                amountPhysicallyPaidByThisPerson - totalObligationForThisPerson;
              return {
                personId,
                personName,
                amountPhysicallyPaidByThisPerson,
                shareOfSplitAmountForThisPerson,
                isCelebrationContributor,
                celebrationAmountByThisPerson,
                netEffectForThisPerson,
              };
            });

            // Sort: Is Owed (net > 0.001) first, then Settled (≈0), then Owes (net < -0.001)
            peopleWithNetEffect.sort((a, b) => {
              const getRank = (net: number) => (net > 0.001 ? 0 : net < -0.001 ? 2 : 1);
              const rankA = getRank(a.netEffectForThisPerson);
              const rankB = getRank(b.netEffectForThisPerson);
              if (rankA !== rankB) return rankA - rankB;
              return 0;
            });

            return (
              <ul className="space-y-2 sm:space-y-2.5">
                {peopleWithNetEffect.map(
                  ({
                    personId,
                    personName,
                    amountPhysicallyPaidByThisPerson,
                    shareOfSplitAmountForThisPerson,
                    isCelebrationContributor,
                    celebrationAmountByThisPerson,
                    netEffectForThisPerson,
                  }) => (
                    <li
                      key={personId}
                      className="p-2 sm:p-3 bg-secondary/30 rounded-md space-y-1"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <span className="font-semibold text-sm">{personName}</span>
                        <span
                          className={`font-bold text-xs px-2 py-0.5 rounded-full mt-0.5 sm:mt-0 self-start sm:self-auto
                              ${
                                netEffectForThisPerson < -0.001
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                  : netEffectForThisPerson > 0.001
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300"
                              }`}
                        >
                          {netEffectForThisPerson < -0.001
                            ? `Owes ${formatCurrency(Math.abs(netEffectForThisPerson))}`
                            : netEffectForThisPerson > 0.001
                            ? `Is Owed ${formatCurrency(netEffectForThisPerson)}`
                            : `Settled`}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Paid By:</span>
                        <span>{formatCurrency(amountPhysicallyPaidByThisPerson)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Share of Split Amount:</span>
                        <span>{formatCurrency(shareOfSplitAmountForThisPerson)}</span>
                      </div>
                      {isCelebrationContributor && celebrationAmountByThisPerson > 0 && (
                        <p className="text-xs text-yellow-700 dark:text-yellow-500 italic pl-1">
                          *You contributed {formatCurrency(celebrationAmountByThisPerson)} as a
                          treat.*
                        </p>
                      )}
                    </li>
                  )
                )}
              </ul>
            );
          })()
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground italic">
            No individuals involved in payments or shares for this expense.
          </p>
        )}
      </CardContent>
    </Card>
  );
}