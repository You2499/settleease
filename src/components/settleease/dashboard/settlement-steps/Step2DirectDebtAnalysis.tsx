"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Info,
  Calculator,
  DollarSign,
  CreditCard,
  Utensils,
  PartyPopper,
  User,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/settleease/utils";
import type { Expense, Person } from "@/lib/settleease/types";

interface PersonBalance {
  totalPaid: number;
  totalOwed: number;
  settledAsDebtor: number;
  settledAsCreditor: number;
  netBalance: number;
}

interface Step2DirectDebtAnalysisProps {
  allExpenses: Expense[];
  personBalances: Record<string, PersonBalance>;
  people: Person[];
  peopleMap: Record<string, string>;
}

export default function Step2DirectDebtAnalysis({
  allExpenses,
  personBalances,
  people,
  peopleMap,
}: Step2DirectDebtAnalysisProps) {
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(
    new Set()
  );

  const togglePersonExpansion = (personId: string) => {
    const newExpanded = new Set(expandedPersons);
    if (newExpanded.has(personId)) {
      newExpanded.delete(personId);
    } else {
      newExpanded.add(personId);
    }
    setExpandedPersons(newExpanded);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <FileText className="mr-2 h-5 w-5 text-orange-600" />
          Step 2: How Each Balance Was Calculated
        </CardTitle>
        <CardDescription className="text-sm">
          See exactly which expenses contributed to each person's balance
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Show each person's expense breakdown in compact format */}
          {Object.entries(personBalances)
            .sort(
              ([, a], [, b]) => Math.abs(b.netBalance) - Math.abs(a.netBalance)
            )
            .map(([personId, balance]) => {
              const person = people.find((p) => p.id === personId);
              if (!person) return null;

              const isCreditor = balance.netBalance > 0.01;
              const isDebtor = balance.netBalance < -0.01;

              // Get expenses where this person was involved
              const relevantExpenses = allExpenses.filter((expense) => {
                const wasPayer =
                  Array.isArray(expense.paid_by) &&
                  expense.paid_by.some((p) => p.personId === personId);
                const hadShare =
                  Array.isArray(expense.shares) &&
                  expense.shares.some((s) => s.personId === personId);
                const hadCelebration =
                  expense.celebration_contribution?.personId === personId;
                return wasPayer || hadShare || hadCelebration;
              });

              return (
                <div
                  key={personId}
                  className={`relative p-4 rounded-xl border-2 shadow-sm transition-all ${
                    isCreditor
                      ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-300 dark:border-green-700"
                      : isDebtor
                      ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-300 dark:border-red-700"
                      : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 border-gray-300 dark:border-gray-700"
                  }`}
                >
                  {/* Status Badge */}
                  <div
                    className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                      isCreditor
                        ? "bg-green-500 text-white"
                        : isDebtor
                        ? "bg-red-500 text-white"
                        : "bg-gray-500 text-white"
                    }`}
                  >
                    {isCreditor ? "RECEIVES" : isDebtor ? "PAYS" : "BALANCED"}
                  </div>

                  {/* Person Header - Compact */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg ${
                          isCreditor
                            ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                            : isDebtor
                            ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                            : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {person.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {isCreditor
                            ? "should receive"
                            : isDebtor
                            ? "should pay"
                            : "all balanced"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-2xl font-bold ${
                          isCreditor
                            ? "text-green-700 dark:text-green-300"
                            : isDebtor
                            ? "text-red-700 dark:text-red-300"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {isCreditor ? "+" : isDebtor ? "-" : ""}
                        {formatCurrency(Math.abs(balance.netBalance))}
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Expense Breakdown */}
                  <div className="space-y-3">
                    <Button
                      variant="ghost"
                      onClick={() => togglePersonExpansion(personId)}
                      className={`w-full justify-start p-2 h-auto font-semibold rounded-md transition-colors ${
                        isCreditor
                          ? "text-green-800 dark:text-green-200 hover:bg-green-200/50 dark:hover:bg-green-800/30"
                          : isDebtor
                          ? "text-red-800 dark:text-red-200 hover:bg-red-200/50 dark:hover:bg-red-800/30"
                          : "text-gray-800 dark:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/30"
                      }`}
                    >
                      {expandedPersons.has(personId) ? (
                        <ChevronDown className="w-4 h-4 mr-2" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mr-2" />
                      )}
                      <Calculator className="w-4 h-4 mr-2" />
                      Expense Breakdown
                    </Button>

                    {expandedPersons.has(personId) && (
                      <div className="space-y-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium px-2">
                          {relevantExpenses.length} expense
                          {relevantExpenses.length !== 1 ? "s" : ""} found
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {relevantExpenses.map((expense) => {
                            // Calculate this person's involvement in this expense
                            const amountPaid = Array.isArray(expense.paid_by)
                              ? expense.paid_by.find(
                                  (p) => p.personId === personId
                                )?.amount || 0
                              : 0;

                            const shareAmount = Array.isArray(expense.shares)
                              ? expense.shares.find(
                                  (s) => s.personId === personId
                                )?.amount || 0
                              : 0;

                            const celebrationAmount =
                              expense.celebration_contribution?.personId ===
                              personId
                                ? expense.celebration_contribution.amount || 0
                                : 0;

                            const totalOwed = shareAmount + celebrationAmount;
                            const netForThisExpense = amountPaid - totalOwed;

                            // Skip if person had no involvement
                            if (amountPaid === 0 && totalOwed === 0)
                              return null;

                            // Find who paid for this expense
                            const payers = Array.isArray(expense.paid_by)
                              ? expense.paid_by
                                  .map((p) => peopleMap[p.personId])
                                  .filter(Boolean)
                              : [];

                            return (
                              <div
                                key={expense.id}
                                className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                                      {expense.description}
                                    </h5>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                      <div>
                                        {expense.created_at
                                          ? new Date(
                                              expense.created_at
                                            ).toLocaleDateString()
                                          : "No date"}{" "}
                                        • Total:{" "}
                                        {formatCurrency(expense.total_amount)}
                                      </div>
                                      {payers.length > 0 && (
                                        <div className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          <span>
                                            Paid by: {payers.join(", ")}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    className={`text-right ml-3 px-2 py-1 rounded text-xs font-bold ${
                                      netForThisExpense > 0.01
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                                        : netForThisExpense < -0.01
                                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                                        : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200"
                                    }`}
                                  >
                                    {netForThisExpense > 0.01
                                      ? "+"
                                      : netForThisExpense < -0.01
                                      ? "-"
                                      : ""}
                                    {formatCurrency(
                                      Math.abs(netForThisExpense)
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1 text-xs">
                                  {amountPaid > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                        <CreditCard className="w-3 h-3" />
                                        Amount paid:
                                      </span>
                                      <span className="font-medium text-green-600 dark:text-green-400">
                                        +{formatCurrency(amountPaid)}
                                      </span>
                                    </div>
                                  )}

                                  {shareAmount > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                        <Utensils className="w-3 h-3" />
                                        Share owed:
                                      </span>
                                      <span className="font-medium text-red-600 dark:text-red-400">
                                        -{formatCurrency(shareAmount)}
                                      </span>
                                    </div>
                                  )}

                                  {celebrationAmount > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                        <PartyPopper className="w-3 h-3" />
                                        Celebration:
                                      </span>
                                      <span className="font-medium text-red-600 dark:text-red-400">
                                        -{formatCurrency(celebrationAmount)}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">
                                      Net for this expense:
                                    </span>
                                    <span
                                      className={`font-bold ${
                                        netForThisExpense > 0.01
                                          ? "text-green-700 dark:text-green-300"
                                          : netForThisExpense < -0.01
                                          ? "text-red-700 dark:text-red-300"
                                          : "text-gray-700 dark:text-gray-300"
                                      }`}
                                    >
                                      {netForThisExpense > 0.01
                                        ? "+"
                                        : netForThisExpense < -0.01
                                        ? "-"
                                        : ""}
                                      {formatCurrency(
                                        Math.abs(netForThisExpense)
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Final Calculation Summary - Compact */}
                    <div
                      className={`mt-4 p-3 rounded-lg border-2 ${
                        isCreditor
                          ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                          : isDebtor
                          ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
                          : "bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700"
                      }`}
                    >
                      <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center text-sm">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Final Calculation
                      </h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span>Total paid:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            +{formatCurrency(balance.totalPaid)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Total owed:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            -{formatCurrency(balance.totalOwed)}
                          </span>
                        </div>
                        {(balance.settledAsDebtor > 0 ||
                          balance.settledAsCreditor > 0) && (
                          <div className="flex justify-between items-center">
                            <span>Net settlements:</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {balance.settledAsDebtor -
                                balance.settledAsCreditor >=
                              0
                                ? "+"
                                : ""}
                              {formatCurrency(
                                balance.settledAsDebtor -
                                  balance.settledAsCreditor
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300 dark:border-gray-600">
                          <span className="font-bold">Final Balance:</span>
                          <span
                            className={`font-bold text-lg ${
                              isCreditor
                                ? "text-green-700 dark:text-green-300"
                                : isDebtor
                                ? "text-red-700 dark:text-red-300"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {isCreditor ? "+" : isDebtor ? "-" : ""}
                            {formatCurrency(Math.abs(balance.netBalance))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Summary explanation */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Understanding This Breakdown
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <p>
                    This shows exactly how each person's balance was calculated
                    from individual expenses.
                  </p>
                  <p>
                    <strong>Green amounts</strong> show money paid,{" "}
                    <strong>red amounts</strong> show money owed, and{" "}
                    <strong>blue amounts</strong> show settlement payments
                    already made.
                  </p>
                  <p>
                    The final balance determines whether someone should{" "}
                    <strong>pay</strong> (red),
                    <strong>receive</strong> (green), or is{" "}
                    <strong>balanced</strong> (gray).
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
