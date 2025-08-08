"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  CreditCard,
  PartyPopper,
  Calculator,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { ExpenseDetailProps, ExpenseCalculations } from "./types";
import type { PayerShare } from "@/lib/settleease/types";

interface ExpensePaymentAnalysisProps extends ExpenseDetailProps {
  calculations: ExpenseCalculations;
}

export default function ExpensePaymentAnalysis({
  expense,
  peopleMap,
  calculations,
}: ExpensePaymentAnalysisProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <CreditCard className="mr-2 h-5 w-5 text-orange-600" />
          Step 2: Payment & Split Analysis
        </CardTitle>
        <CardDescription className="text-sm">
          Who paid what and how costs are divided
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Payment Section */}
        <div className="relative p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-sm transition-all mb-6">
          <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white shadow-sm">
            PAYMENTS
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center shadow-sm">
                <CreditCard className="w-5 h-5 text-blue-800 dark:text-blue-200" />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 dark:text-blue-100">
                  Who Paid
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Actual payments made
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {calculations.sortedPaidBy.length > 0 ? (
              calculations.sortedPaidBy.map((p: PayerShare) => (
                <div key={p.personId} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-800 dark:text-blue-200">
                          {(peopleMap[p.personId] || "?").charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium">{peopleMap[p.personId] || "Unknown"}</span>
                    </div>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(Number(p.amount))}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 italic p-3 bg-white dark:bg-gray-800 rounded-lg">
                No payers listed.
              </p>
            )}
          </div>
        </div>

        {/* Celebration Contribution */}
        {calculations.celebrationContributionOpt && (
          <div className="relative p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 rounded-xl border-2 border-yellow-300 dark:border-yellow-700 shadow-sm transition-all mb-6">
            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-white shadow-sm">
              TREAT
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-200 dark:bg-yellow-800 rounded-full flex items-center justify-center shadow-sm">
                  <PartyPopper className="w-5 h-5 text-yellow-800 dark:text-yellow-200" />
                </div>
                <div>
                  <h3 className="font-bold text-yellow-900 dark:text-yellow-100">
                    Celebration Contribution
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Someone's treating the group
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {formatCurrency(calculations.celebrationContributionOpt.amount)}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-200 dark:bg-yellow-800 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-yellow-800 dark:text-yellow-200">
                      {(peopleMap[calculations.celebrationContributionOpt.personId] || "?").charAt(0)}
                    </span>
                  </div>
                  <span className="font-medium">{peopleMap[calculations.celebrationContributionOpt.personId] || "Unknown"}</span>
                </div>
                <span className="font-bold text-yellow-600 dark:text-yellow-400">
                  Treating everyone!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Split Amount Summary */}
        <div className="relative p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-sm transition-all">
          <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
            TO SPLIT
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center shadow-sm">
                <Calculator className="w-5 h-5 text-green-800 dark:text-green-200" />
              </div>
              <div>
                <h3 className="font-bold text-green-900 dark:text-green-100">
                  Net Amount For Splitting
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  After celebration contribution
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(calculations.amountEffectivelySplit)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}