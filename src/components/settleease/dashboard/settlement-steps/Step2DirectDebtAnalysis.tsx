"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, FileText, Info } from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { 
  Expense, 
  SettlementPayment, 
  CalculatedTransaction,
  Person 
} from "@/lib/settleease/types";

interface PersonBalance {
  totalPaid: number;
  totalOwed: number;
  settledAsDebtor: number;
  settledAsCreditor: number;
  netBalance: number;
}

interface Step2DirectDebtAnalysisProps {
  pairwiseTransactions: CalculatedTransaction[];
  allExpenses: Expense[];
  settlementPayments: SettlementPayment[];
  personBalances: Record<string, PersonBalance>;
  peopleMap: Record<string, string>;
}

export default function Step2DirectDebtAnalysis({
  pairwiseTransactions,
  allExpenses,
  settlementPayments,
  personBalances,
  peopleMap,
}: Step2DirectDebtAnalysisProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <ArrowRight className="mr-2 h-5 w-5 text-orange-600" />
          Step 2: Direct Debt Analysis
        </CardTitle>
        <CardDescription className="text-sm">
          Understanding how expenses create debt relationships between people
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Show ALL pairwise transactions with clear explanations */}
          {pairwiseTransactions.map((txn, index) => {
            // Find expenses that contribute to this debt
            const contributingExpenses = allExpenses.filter(
              (expense) => {
                const paidByPerson =
                  Array.isArray(expense.paid_by) &&
                  expense.paid_by.some(
                    (p) => p.personId === txn.to
                  );
                const owedByPerson =
                  Array.isArray(expense.shares) &&
                  expense.shares.some(
                    (s) => s.personId === txn.from
                  );
                return paidByPerson && owedByPerson;
              }
            );

            // Check if this debt is still outstanding based on overall balances
            const debtorBalance = personBalances[txn.from]?.netBalance || 0;
            const creditorBalance = personBalances[txn.to]?.netBalance || 0;
            const isOutstanding = debtorBalance < -0.01 && creditorBalance > 0.01;
            
            // Check if this specific debt has been settled
            const settledAmount = settlementPayments
              .filter(
                (payment) =>
                  payment.debtor_id === txn.from && payment.creditor_id === txn.to
              )
              .reduce((sum, payment) => sum + Number(payment.amount_settled), 0);
            
            const isDirectlySettled = settledAmount >= Number(txn.amount) - 0.01;

            return (
              <div
                key={`debt-${index}`}
                className={`relative p-5 rounded-xl border-2 shadow-sm transition-all ${
                  isOutstanding && !isDirectlySettled
                    ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-300 dark:border-red-700"
                    : isDirectlySettled
                    ? "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-300 dark:border-blue-700"
                    : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 border-gray-300 dark:border-gray-700"
                }`}
              >
                {/* Status Badge */}
                <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                  isOutstanding && !isDirectlySettled
                    ? "bg-red-500 text-white"
                    : isDirectlySettled
                    ? "bg-blue-500 text-white"
                    : "bg-gray-500 text-white"
                }`}>
                  {isDirectlySettled 
                    ? "DIRECTLY SETTLED" 
                    : isOutstanding 
                    ? "OUTSTANDING" 
                    : "BALANCED OUT"}
                </div>

                {/* Main Transaction Display */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {/* From Person Avatar */}
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 border-2 rounded-full flex items-center justify-center shadow-sm ${
                        isOutstanding && !isDirectlySettled
                          ? "bg-red-200 dark:bg-red-800 border-red-400 dark:border-red-600"
                          : isDirectlySettled
                          ? "bg-blue-200 dark:bg-blue-800 border-blue-400 dark:border-blue-600"
                          : "bg-gray-200 dark:bg-gray-800 border-gray-400 dark:border-gray-600"
                      }`}>
                        <span className={`font-bold text-lg ${
                          isOutstanding && !isDirectlySettled
                            ? "text-red-800 dark:text-red-200"
                            : isDirectlySettled
                            ? "text-blue-800 dark:text-blue-200"
                            : "text-gray-800 dark:text-gray-200"
                        }`}>
                          {peopleMap[txn.from]?.charAt(0) || "?"}
                        </span>
                      </div>
                      <span className={`text-xs font-medium mt-1 ${
                        isOutstanding && !isDirectlySettled
                          ? "text-red-700 dark:text-red-300"
                          : isDirectlySettled
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300"
                      }`}>
                        Owes
                      </span>
                    </div>

                    {/* Arrow */}
                    <div className="flex flex-col items-center">
                      <ArrowRight className={`w-6 h-6 ${
                        isOutstanding && !isDirectlySettled
                          ? "text-red-500"
                          : isDirectlySettled
                          ? "text-blue-500"
                          : "text-gray-500"
                      }`} />
                      <span className={`text-xs mt-1 ${
                        isOutstanding && !isDirectlySettled
                          ? "text-red-600 dark:text-red-400"
                          : isDirectlySettled
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400"
                      }`}>
                        {formatCurrency(txn.amount)}
                      </span>
                    </div>

                    {/* To Person Avatar */}
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 border-2 rounded-full flex items-center justify-center shadow-sm ${
                        isOutstanding && !isDirectlySettled
                          ? "bg-red-200 dark:bg-red-800 border-red-400 dark:border-red-600"
                          : isDirectlySettled
                          ? "bg-blue-200 dark:bg-blue-800 border-blue-400 dark:border-blue-600"
                          : "bg-gray-200 dark:bg-gray-800 border-gray-400 dark:border-gray-600"
                      }`}>
                        <span className={`font-bold text-lg ${
                          isOutstanding && !isDirectlySettled
                            ? "text-red-800 dark:text-red-200"
                            : isDirectlySettled
                            ? "text-blue-800 dark:text-blue-200"
                            : "text-gray-800 dark:text-gray-200"
                        }`}>
                          {peopleMap[txn.to]?.charAt(0) || "?"}
                        </span>
                      </div>
                      <span className={`text-xs font-medium mt-1 ${
                        isOutstanding && !isDirectlySettled
                          ? "text-red-700 dark:text-red-300"
                          : isDirectlySettled
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300"
                      }`}>
                        Is Owed
                      </span>
                    </div>

                    {/* Transaction Details */}
                    <div className="ml-4">
                      <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                        {peopleMap[txn.from] || "Unknown"} →{" "}
                        {peopleMap[txn.to] || "Unknown"}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Based on {contributingExpenses.length} shared expense{contributingExpenses.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Amount Display */}
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${
                      isOutstanding && !isDirectlySettled
                        ? "text-red-700 dark:text-red-300"
                        : isDirectlySettled
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300"
                    }`}>
                      {formatCurrency(txn.amount)}
                    </div>
                    <div className={`text-sm font-medium ${
                      isOutstanding && !isDirectlySettled
                        ? "text-red-600 dark:text-red-400"
                        : isDirectlySettled
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {isDirectlySettled 
                        ? "Settled" 
                        : isOutstanding 
                        ? "Outstanding" 
                        : "Balanced"}
                    </div>
                  </div>
                </div>

                {/* Status Explanation */}
                <div className="mb-4 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Why is this debt {isDirectlySettled ? "settled" : isOutstanding ? "outstanding" : "balanced out"}?
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    {isDirectlySettled ? (
                      <>This specific debt has been directly settled with recorded payments totaling {formatCurrency(settledAmount)}.</>
                    ) : isOutstanding ? (
                      <>
                        <strong>{peopleMap[txn.from]}</strong> still owes money overall (balance: -{formatCurrency(Math.abs(debtorBalance))}) 
                        and <strong>{peopleMap[txn.to]}</strong> still needs to receive money (balance: +{formatCurrency(creditorBalance)}), 
                        so this debt remains outstanding.
                      </>
                    ) : (
                      <>
                        This debt is balanced out because either <strong>{peopleMap[txn.from]}</strong> has settled their overall balance 
                        through other payments, or <strong>{peopleMap[txn.to]}</strong> no longer needs to receive money overall. 
                        The simplified settlement plan handles this more efficiently.
                      </>
                    )}
                  </div>
                </div>

                {/* Contributing Expenses */}
                {contributingExpenses.length > 0 && (
                  <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-800">
                    <div className={`rounded-lg p-3 ${
                      isOutstanding && !isDirectlySettled
                        ? "bg-red-100 dark:bg-red-900/30"
                        : isDirectlySettled
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "bg-gray-100 dark:bg-gray-900/30"
                    }`}>
                      <div className={`font-semibold mb-3 flex items-center ${
                        isOutstanding && !isDirectlySettled
                          ? "text-red-800 dark:text-red-200"
                          : isDirectlySettled
                          ? "text-blue-800 dark:text-blue-200"
                          : "text-gray-800 dark:text-gray-200"
                      }`}>
                        <FileText className="w-4 h-4 mr-2" />
                        Contributing Expenses ({contributingExpenses.length})
                      </div>
                      <div className="space-y-2">
                        {contributingExpenses.map((expense, i) => {
                          // Calculate this person's share and what was paid
                          const personShare = Array.isArray(expense.shares) 
                            ? expense.shares.find(s => s.personId === txn.from)?.amount || 0
                            : 0;
                          const personPaid = Array.isArray(expense.paid_by)
                            ? expense.paid_by.find(p => p.personId === txn.from)?.amount || 0
                            : 0;
                          const creditorPaid = Array.isArray(expense.paid_by)
                            ? expense.paid_by.find(p => p.personId === txn.to)?.amount || 0
                            : 0;

                          return (
                            <div
                              key={i}
                              className="flex justify-between items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {expense.description}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {expense.created_at
                                    ? new Date(expense.created_at).toLocaleDateString()
                                    : "No date"} • Total: {formatCurrency(expense.total_amount)}
                                </div>
                                <div className="text-xs mt-2 space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {peopleMap[txn.from]}'s share:
                                    </span>
                                    <span className="font-medium text-red-600 dark:text-red-400">
                                      {formatCurrency(personShare)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {peopleMap[txn.from]} paid:
                                    </span>
                                    <span className="font-medium text-green-600 dark:text-green-400">
                                      {formatCurrency(personPaid)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {peopleMap[txn.to]} paid:
                                    </span>
                                    <span className="font-medium text-green-600 dark:text-green-400">
                                      {formatCurrency(creditorPaid)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                                      Debt created:
                                    </span>
                                    <span className="font-bold text-red-700 dark:text-red-300">
                                      {formatCurrency(Math.max(0, personShare - personPaid))}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Summary of what's shown */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Understanding This Analysis
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <p>
                    This shows <strong>all direct debt relationships</strong> created by expenses, regardless of whether they'll appear in the final settlement plan.
                  </p>
                  <p>
                    <strong>Outstanding debts</strong> (red) will need to be settled. <strong>Balanced debts</strong> (gray) are handled by the optimization algorithm - 
                    the person may pay someone else instead to achieve the same result more efficiently.
                  </p>
                  <p>
                    <strong>Directly settled debts</strong> (blue) have been paid specifically between these two people.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}