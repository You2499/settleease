"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  Users, 
  Calculator,
  Info 
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { CalculatedTransaction } from "@/lib/settleease/types";

interface Step4SettlementOptionsProps {
  pairwiseTransactions: CalculatedTransaction[];
  unpaidSimplifiedTransactions: CalculatedTransaction[];
  peopleMap: Record<string, string>;
}

export default function Step4SettlementOptions({
  pairwiseTransactions,
  unpaidSimplifiedTransactions,
  peopleMap,
}: Step4SettlementOptionsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <ArrowRight className="mr-2 h-5 w-5 text-blue-600" />
          Step 4: Choose Your Settlement Method
        </CardTitle>
        <CardDescription className="text-sm">
          Two approaches to settle all debts - same final result, different paths
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-6">
          {/* Direct Payments - Enhanced */}
          <div className="relative p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-sm">
            {/* Method Badge */}
            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white shadow-sm">
              DIRECT METHOD
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-200 dark:bg-blue-800 border-2 border-blue-400 dark:border-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <FileText className="w-6 h-6 text-blue-800 dark:text-blue-200" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    Direct Payments
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Pay exactly who you owe based on specific expenses
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {pairwiseTransactions.length}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  transactions
                </div>
              </div>
            </div>

            {/* Transaction List */}
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4">
              <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                All Required Payments
              </h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pairwiseTransactions.map((txn, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-blue-200 dark:border-blue-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-red-800 dark:text-red-200">
                          {peopleMap[txn.from]?.charAt(0) || "?"}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="w-8 h-8 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-green-800 dark:text-green-200">
                          {peopleMap[txn.to]?.charAt(0) || "?"}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {peopleMap[txn.from]}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400"> pays </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {peopleMap[txn.to]}
                        </span>
                      </div>
                    </div>
                    <div className="font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(txn.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Info */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-800 dark:text-blue-200 text-center">
                <strong>Direct approach:</strong> Pay exactly who you owe based on specific expenses
              </div>
            </div>
          </div>

          {/* Optimized Payments - Enhanced */}
          <div className="relative p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-sm">
            {/* Method Badge */}
            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
              OPTIMIZED METHOD
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-200 dark:bg-green-800 border-2 border-green-400 dark:border-green-600 rounded-full flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-6 h-6 text-green-800 dark:text-green-200" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-green-900 dark:text-green-100">
                    Optimized Payments
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Minimum transactions for maximum efficiency
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                  {unpaidSimplifiedTransactions.length}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  transactions
                </div>
              </div>
            </div>

            {/* Transaction List */}
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4">
              <h5 className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center">
                <Calculator className="w-4 h-4 mr-2" />
                Optimized Payment Plan
              </h5>
              <div className="space-y-2">
                {unpaidSimplifiedTransactions.map((txn, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-green-200 dark:border-green-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-red-800 dark:text-red-200">
                          {peopleMap[txn.from]?.charAt(0) || "?"}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="w-8 h-8 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-green-800 dark:text-green-200">
                          {peopleMap[txn.to]?.charAt(0) || "?"}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {peopleMap[txn.from]}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400"> pays </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {peopleMap[txn.to]}
                        </span>
                      </div>
                    </div>
                    <div className="font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(txn.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Efficiency Gain */}
            {pairwiseTransactions.length > unpaidSimplifiedTransactions.length && (
              <div className="mt-4 p-4 bg-green-200 dark:bg-green-800/30 rounded-lg border border-green-300 dark:border-green-600">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-800 dark:text-green-200 mb-1">
                    {pairwiseTransactions.length - unpaidSimplifiedTransactions.length} fewer transactions!
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    {Math.round((1 - unpaidSimplifiedTransactions.length / pairwiseTransactions.length) * 100)}% reduction in payment complexity
                  </div>
                </div>
              </div>
            )}

            {/* Key Info */}
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-sm text-green-800 dark:text-green-200 text-center">
                <strong>Optimized approach:</strong> Minimum transactions with same final result for everyone
              </div>
            </div>
          </div>

          {/* Key Insight */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 rounded-xl border-2 border-purple-200 dark:border-purple-700">
            <div className="text-center">
              <div className="font-bold text-purple-900 dark:text-purple-100 mb-2 flex items-center justify-center">
                <Info className="w-5 h-5 mr-2" />
                Same Result, Different Path
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-200">
                Both methods achieve identical final balances - choose based on your preference for <strong>simplicity</strong> (optimized) vs <strong>transparency</strong> (direct).
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}