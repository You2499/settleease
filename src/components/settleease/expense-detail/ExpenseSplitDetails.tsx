"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Scale,
  SlidersHorizontal,
  ClipboardList,
  ReceiptText,
  ChevronDown,
  ChevronRight,
  ListTree,
  Users,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { ExpenseDetailProps, ExpenseCalculations } from "./types";

interface ExpenseSplitDetailsProps extends ExpenseDetailProps {
  calculations: ExpenseCalculations;
}

export default function ExpenseSplitDetails({
  expense,
  peopleMap,
  expandedSections,
  toggleSectionExpansion,
  calculations,
}: ExpenseSplitDetailsProps) {
  const SplitIcon = useMemo(() => {
    if (expense.split_method === "equal") return Scale;
    if (expense.split_method === "unequal") return SlidersHorizontal;
    if (expense.split_method === "itemwise") return ClipboardList;
    return ReceiptText;
  }, [expense.split_method]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <SplitIcon className="mr-2 h-5 w-5 text-purple-600" />
          Step 3: Split Method & Individual Shares
        </CardTitle>
        <CardDescription className="text-sm">
          How the {formatCurrency(calculations.amountEffectivelySplit)} is divided using {expense.split_method} method
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Split Method Explanation */}
        <div className="relative p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/20 rounded-xl border-2 border-indigo-300 dark:border-indigo-700 shadow-sm transition-all mb-6">
          <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500 text-white shadow-sm">
            {expense.split_method.toUpperCase()}
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-200 dark:bg-indigo-800 rounded-full flex items-center justify-center shadow-sm">
                <SplitIcon className="w-5 h-5 text-indigo-800 dark:text-indigo-200" />
              </div>
              <div>
                <h3 className="font-bold text-indigo-900 dark:text-indigo-100 capitalize">
                  {expense.split_method} Split
                </h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  {expense.split_method === "equal" && "Everyone pays the same amount"}
                  {expense.split_method === "unequal" && "Custom amounts for each person"}
                  {expense.split_method === "itemwise" && "Based on specific items consumed"}
                </p>
              </div>
            </div>
          </div>

          {/* Expandable Split Details */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              onClick={() => toggleSectionExpansion("split-details")}
              className="w-full justify-start p-2 h-auto font-semibold rounded-md transition-colors text-indigo-800 dark:text-indigo-200 hover:bg-indigo-200/50 hover:text-indigo-800 dark:hover:bg-indigo-800/30 dark:hover:text-indigo-200"
            >
              {expandedSections.has("split-details") ? (
                <ChevronDown className="w-4 h-4 mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              <ListTree className="w-4 h-4 mr-2" />
              View Detailed Split Breakdown
            </Button>

            {expandedSections.has("split-details") && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-indigo-200 dark:border-indigo-700 shadow-sm">
                {/* Equal Split */}
                {expense.split_method === "equal" && Array.isArray(expense.shares) && expense.shares.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Split equally among {expense.shares.length} {expense.shares.length === 1 ? "person" : "people"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {calculations.sortedShares.map((share) => (
                        <div key={share.personId} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                          <span className="text-sm">{peopleMap[share.personId] || "Unknown"}</span>
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(Number(share.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unequal Split */}
                {expense.split_method === "unequal" && Array.isArray(expense.shares) && expense.shares.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Custom amounts assigned to each person
                    </p>
                    <div className="space-y-2">
                      {calculations.sortedShares.map((share) => (
                        <div key={share.personId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <span className="font-medium">{peopleMap[share.personId] || "Unknown"}</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(Number(share.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Itemwise Split */}
                {expense.split_method === "itemwise" && Array.isArray(expense.items) && expense.items.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Based on individual items consumed by each person
                    </p>
                    
                    {/* Original Items */}
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-800 dark:text-gray-200">Original Items:</h5>
                      {expense.items.map((item) => (
                        <div key={item.id} className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(Number(item.price))}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Shared by: {calculations.sortPersonIdsByName(item.sharedBy).map(pid => peopleMap[pid] || "Unknown").join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Individual Shares */}
                    {calculations.itemwiseBreakdownForDisplay && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-800 dark:text-gray-200">Individual Shares:</h5>
                        {calculations.sortedItemwiseBreakdownEntries
                          .filter(([_, details]) => details.totalShareOfAdjustedItems > 0.001)
                          .map(([personId, details]) => (
                            <div key={personId} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{peopleMap[personId] || "Unknown"}</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                  {formatCurrency(details.totalShareOfAdjustedItems)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {details.items.filter((item: any) => item.shareForPerson > 0.001).length} items
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Individual Net Effect */}
        <div className="relative p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 rounded-xl border-2 border-gray-300 dark:border-gray-700 shadow-sm transition-all">
          <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-gray-500 text-white shadow-sm">
            NET EFFECT
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">
                  Individual Net Effect
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Final financial position for each person
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {calculations.sortedInvolvedPersonIdsOverall.length > 0 ? (
              (() => {
                const peopleWithNetEffect = calculations.sortedInvolvedPersonIdsOverall.map((personId) => {
                  const personName = peopleMap[personId] || "Unknown Person";
                  const paymentRecord = Array.isArray(expense.paid_by)
                    ? expense.paid_by.find((p) => p.personId === personId)
                    : null;
                  const amountPhysicallyPaidByThisPerson = paymentRecord ? Number(paymentRecord.amount) : 0;
                  const shareRecord = Array.isArray(expense.shares)
                    ? expense.shares.find((s) => s.personId === personId)
                    : null;
                  const shareOfSplitAmountForThisPerson = shareRecord ? Number(shareRecord.amount) : 0;
                  const isCelebrationContributor = calculations.celebrationContributionOpt?.personId === personId;
                  const celebrationAmountByThisPerson = isCelebrationContributor ? calculations.celebrationContributionOpt?.amount || 0 : 0;
                  const totalObligationForThisPerson = shareOfSplitAmountForThisPerson + celebrationAmountByThisPerson;
                  const netEffectForThisPerson = amountPhysicallyPaidByThisPerson - totalObligationForThisPerson;
                  
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
                  const getRank = (net: number) => net > 0.001 ? 0 : net < -0.001 ? 2 : 1;
                  const rankA = getRank(a.netEffectForThisPerson);
                  const rankB = getRank(b.netEffectForThisPerson);
                  if (rankA !== rankB) return rankA - rankB;
                  return 0;
                });

                return peopleWithNetEffect.map(({
                  personId,
                  personName,
                  amountPhysicallyPaidByThisPerson,
                  shareOfSplitAmountForThisPerson,
                  isCelebrationContributor,
                  celebrationAmountByThisPerson,
                  netEffectForThisPerson,
                }) => (
                  <div key={personId} className={`p-3 rounded-lg border-2 shadow-sm transition-all ${
                    netEffectForThisPerson < -0.001
                      ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700"
                      : netEffectForThisPerson > 0.001
                      ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700"
                      : "bg-gray-50 dark:bg-gray-950/30 border-gray-300 dark:border-gray-700"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          netEffectForThisPerson < -0.001
                            ? "bg-red-200 dark:bg-red-800"
                            : netEffectForThisPerson > 0.001
                            ? "bg-green-200 dark:bg-green-800"
                            : "bg-gray-200 dark:bg-gray-800"
                        }`}>
                          <span className={`text-xs font-bold ${
                            netEffectForThisPerson < -0.001
                              ? "text-red-800 dark:text-red-200"
                              : netEffectForThisPerson > 0.001
                              ? "text-green-800 dark:text-green-200"
                              : "text-gray-800 dark:text-gray-200"
                          }`}>
                            {personName.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium">{personName}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        netEffectForThisPerson < -0.001
                          ? "bg-red-500 text-white"
                          : netEffectForThisPerson > 0.001
                          ? "bg-green-500 text-white"
                          : "bg-gray-500 text-white"
                      }`}>
                        {netEffectForThisPerson < -0.001
                          ? `OWES ${formatCurrency(Math.abs(netEffectForThisPerson))}`
                          : netEffectForThisPerson > 0.001
                          ? `OWED ${formatCurrency(netEffectForThisPerson)}`
                          : `SETTLED`}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Paid:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          +{formatCurrency(amountPhysicallyPaidByThisPerson)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Share:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          -{formatCurrency(shareOfSplitAmountForThisPerson)}
                        </span>
                      </div>
                    </div>
                    {isCelebrationContributor && celebrationAmountByThisPerson > 0 && (
                      <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 italic">
                        *Contributed {formatCurrency(celebrationAmountByThisPerson)} as a treat*
                      </div>
                    )}
                  </div>
                ));
              })()
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 italic p-3 bg-white dark:bg-gray-800 rounded-lg">
                No individuals involved in payments or shares for this expense.
              </p>
            )}
          </div>
        </div>

        {/* Summary explanation */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Understanding Net Effects
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                <p>
                  The net effect shows each person's final position: what they paid minus what they owe.
                </p>
                <p>
                  <strong>Green (Owed)</strong> means they paid more than their share, 
                  <strong> Red (Owes)</strong> means they need to pay more, and 
                  <strong> Gray (Settled)</strong> means they're even.
                </p>
                <p>
                  This helps determine who owes money to whom in your settlement calculations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}