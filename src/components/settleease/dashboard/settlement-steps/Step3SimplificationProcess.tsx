"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Users, Calculator, Zap, Info } from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { CalculatedTransaction } from "@/lib/settleease/types";

interface PersonBalance {
  totalPaid: number;
  totalOwed: number;
  settledAsDebtor: number;
  settledAsCreditor: number;
  netBalance: number;
}

interface Step3SimplificationProcessProps {
  pairwiseTransactions: CalculatedTransaction[];
  unpaidSimplifiedTransactions: CalculatedTransaction[];
  personBalances: Record<string, PersonBalance>;
  people: any[];
  peopleMap: Record<string, string>;
}

export default function Step3SimplificationProcess({
  pairwiseTransactions,
  unpaidSimplifiedTransactions,
  personBalances,
  people,
  peopleMap,
}: Step3SimplificationProcessProps) {
  // Filter out transactions where people are already balanced
  const activeDirectDebts = pairwiseTransactions.filter((txn) => {
    const debtorBalance = personBalances[txn.from]?.netBalance || 0;
    const creditorBalance = personBalances[txn.to]?.netBalance || 0;
    return debtorBalance < -0.01 && creditorBalance > 0.01;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <Zap className="mr-2 h-5 w-5 text-purple-600" />
          Step 3: How Simplification Works
        </CardTitle>
        <CardDescription className="text-sm">
          See how we transform {activeDirectDebts.length} direct debts into{" "}
          {unpaidSimplifiedTransactions.length} optimized payments
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-6">
          {/* Before: Direct Debts */}
          <div className="relative p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 rounded-xl border-2 border-red-300 dark:border-red-700">
            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm">
              BEFORE
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-red-800 dark:text-red-200" />
                </div>
                <div>
                  <h4 className="font-bold text-red-900 dark:text-red-100">
                    Direct Debt Relationships
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Based on who paid for what
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {activeDirectDebts.length}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">
                  transactions
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activeDirectDebts.map((txn, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm"
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
                      <span className="font-medium">{peopleMap[txn.from]}</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {" "}
                        owes{" "}
                      </span>
                      <span className="font-medium">{peopleMap[txn.to]}</span>
                    </div>
                  </div>
                  <div className="font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(txn.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transformation Arrow */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <Calculator className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <div className="text-center">
                <div className="font-bold text-purple-900 dark:text-purple-100">
                  Algorithm Optimization
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  Minimizing transactions while preserving balances
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          {/* After: Optimized Payments */}
          <div className="relative p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-xl border-2 border-green-300 dark:border-green-700">
            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
              AFTER
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-800 dark:text-green-200" />
                </div>
                <div>
                  <h4 className="font-bold text-green-900 dark:text-green-100">
                    Optimized Payments
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Minimum transactions needed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {unpaidSimplifiedTransactions.length}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  transactions
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {unpaidSimplifiedTransactions.map((txn, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm"
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
                      <span className="font-medium">{peopleMap[txn.from]}</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {" "}
                        pays{" "}
                      </span>
                      <span className="font-medium">{peopleMap[txn.to]}</span>
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
          {activeDirectDebts.length > unpaidSimplifiedTransactions.length && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                  {activeDirectDebts.length -
                    unpaidSimplifiedTransactions.length}{" "}
                  fewer transactions!
                </div>
                <div className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-3">
                  {Math.round(
                    (1 -
                      unpaidSimplifiedTransactions.length /
                        activeDirectDebts.length) *
                      100
                  )}
                  % reduction in complexity
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Same final result for everyone, but with much simpler
                  execution
                </div>
              </div>
            </div>
          )}

          {/* Key Insight */}
          <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-xl border-2 border-yellow-300 dark:border-yellow-700">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                  Why This Works
                </div>
                <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
                  <p>
                    <strong>The magic:</strong> Instead of everyone paying their
                    direct creditors, we rearrange payments so people with
                    negative balances pay people with positive balances.
                  </p>
                  <p>
                    <strong>Example:</strong> If Alice owes Bob $10 and Bob owes
                    Carol $10, we skip the middle step - Alice pays Carol $10
                    directly.
                  </p>
                  <p>
                    <strong>Result:</strong> Everyone ends up with exactly the
                    same final balance, but with fewer actual payments to make.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Verification */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-700">
            <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <Calculator className="w-4 h-4 mr-2" />
              Balance Verification
            </h5>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="mb-2">
                <strong>Guarantee:</strong> Both methods result in identical
                final balances for everyone.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                {Object.entries(personBalances)
                  .filter(([, balance]) => Math.abs(balance.netBalance) > 0.01)
                  .map(([personId, balance]) => {
                    const person = people.find((p) => p.id === personId);
                    if (!person) return null;

                    const isCreditor = balance.netBalance > 0.01;

                    return (
                      <div
                        key={personId}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
                      >
                        <span className="font-medium">{person.name}</span>
                        <span
                          className={`font-bold ${
                            isCreditor
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {isCreditor ? "+" : "-"}
                          {formatCurrency(Math.abs(balance.netBalance))}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
