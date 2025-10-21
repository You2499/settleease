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
  FileText,
  Info,
  DollarSign,
  CreditCard,
  Receipt,
  PartyPopper,
  ExternalLink,
  User,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { Person, Expense } from "@/lib/settleease/types";
import type { PersonSummary } from "./types";

interface PersonExpenseBreakdownProps {
  selectedPerson: Person;
  personSummary: PersonSummary;
  personExpenses: Expense[];
  peopleMap: Record<string, string>;
  onViewExpenseDetails: (expense: Expense) => void;
}

export default function PersonExpenseBreakdown({
  selectedPerson,
  personSummary,
  personExpenses,
  peopleMap,
  onViewExpenseDetails,
}: PersonExpenseBreakdownProps) {
  return (
    <Card className="overflow-hidden prevent-horizontal-scroll">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <FileText className="mr-2 h-5 w-5 text-orange-600" />
          Step 2: How {selectedPerson.name}'s Balance Was Calculated
        </CardTitle>
        <CardDescription className="text-sm">
          See exactly which expenses contributed to {selectedPerson.name}'s
          balance
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 overflow-x-hidden w-full min-w-0">
        <div className="space-y-4 p-2 overflow-x-hidden w-full min-w-0">
          {/* Single person breakdown with same design as Step2DirectDebtAnalysis */}
          <div
            className={`relative p-4 rounded-xl border-2 shadow-sm transition-all overflow-hidden w-full max-w-full ${
              personSummary.netBalance > 0.01
                ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-300 dark:border-green-700"
                : personSummary.netBalance < -0.01
                ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-300 dark:border-red-700"
                : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 border-gray-300 dark:border-gray-700"
            }`}
          >
            {/* Status Badge */}
            <div
              className={`absolute -top-1 -right-1 px-3 py-1 rounded-full text-xs font-bold shadow-sm z-10 ${
                personSummary.netBalance > 0.01
                  ? "bg-green-500 text-white"
                  : personSummary.netBalance < -0.01
                  ? "bg-red-500 text-white"
                  : "bg-gray-500 text-white"
              }`}
            >
              {personSummary.netBalance > 0.01
                ? "RECEIVES"
                : personSummary.netBalance < -0.01
                ? "PAYS"
                : "BALANCED"}
            </div>

            {/* Person Header - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg flex-shrink-0 ${
                    personSummary.netBalance > 0.01
                      ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                      : personSummary.netBalance < -0.01
                      ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                      : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                >
                  {selectedPerson.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                    {selectedPerson.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {personSummary.netBalance > 0.01
                      ? "should receive"
                      : personSummary.netBalance < -0.01
                      ? "should pay"
                      : "all balanced"}
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right flex-shrink-0">
                <div
                  className={`text-2xl font-bold ${
                    personSummary.netBalance > 0.01
                      ? "text-green-700 dark:text-green-300"
                      : personSummary.netBalance < -0.01
                      ? "text-red-700 dark:text-red-300"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {personSummary.netBalance > 0.01
                    ? "+"
                    : personSummary.netBalance < -0.01
                    ? "-"
                    : ""}
                  {formatCurrency(Math.abs(personSummary.netBalance))}
                </div>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="space-y-3">
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium px-2">
                {personExpenses.length} expense
                {personExpenses.length !== 1 ? "s" : ""} found
              </div>
              <div className="space-y-2 w-full max-w-full">
                {personExpenses.map((expense) => {
                  // Calculate this person's involvement in this expense
                  const amountPaid = Array.isArray(expense.paid_by)
                    ? expense.paid_by.find(
                        (p) => p.personId === selectedPerson.id
                      )?.amount || 0
                    : 0;

                  const shareAmount = Array.isArray(expense.shares)
                    ? expense.shares.find(
                        (s) => s.personId === selectedPerson.id
                      )?.amount || 0
                    : 0;

                  const celebrationAmount =
                    expense.celebration_contribution?.personId ===
                    selectedPerson.id
                      ? expense.celebration_contribution.amount || 0
                      : 0;

                  const totalOwed = shareAmount + celebrationAmount;
                  const netForThisExpense = amountPaid - totalOwed;

                  // Skip if person had no involvement
                  if (amountPaid === 0 && totalOwed === 0) return null;

                  // Find who paid for this expense
                  const payers = Array.isArray(expense.paid_by)
                    ? expense.paid_by
                        .map((p) => peopleMap[p.personId])
                        .filter(Boolean)
                    : [];

                  return (
                    <div
                      key={expense.id}
                      className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors overflow-hidden"
                      onClick={() => onViewExpenseDetails(expense)}
                    >
                      <div className="flex flex-col gap-2 mb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm hover:text-blue-600 dark:hover:text-blue-400">
                              {expense.description}
                              <ExternalLink className="inline ml-1 h-3 w-3 text-blue-500 dark:text-blue-400" />
                            </h5>
                          </div>
                          <div
                            className={`px-2 py-1 rounded text-xs font-bold flex-shrink-0 ${
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
                            {formatCurrency(Math.abs(netForThisExpense))}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          <div className="truncate">
                            {expense.created_at
                              ? new Date(
                                  expense.created_at
                                ).toLocaleDateString()
                              : "No date"}{" "}
                            • Total: {formatCurrency(expense.total_amount)}
                          </div>
                          {payers.length > 0 && (
                            <div className="flex items-center gap-1 min-w-0">
                              <User className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                Paid by: {payers.join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 text-xs overflow-hidden">
                        {amountPaid > 0 && (
                          <div className="flex justify-between items-center gap-2 min-w-0">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1 min-w-0 flex-1">
                              <CreditCard className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">Amount paid:</span>
                            </span>
                            <span className="font-medium text-green-600 dark:text-green-400 flex-shrink-0 whitespace-nowrap">
                              +{formatCurrency(amountPaid)}
                            </span>
                          </div>
                        )}

                        {shareAmount > 0 && (
                          <div className="flex justify-between items-center gap-2 min-w-0">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1 min-w-0 flex-1">
                              <Receipt className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">Share owed:</span>
                            </span>
                            <span className="font-medium text-red-600 dark:text-red-400 flex-shrink-0 whitespace-nowrap">
                              -{formatCurrency(shareAmount)}
                            </span>
                          </div>
                        )}

                        {celebrationAmount > 0 && (
                          <div className="flex justify-between items-center gap-2 min-w-0">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1 min-w-0 flex-1">
                              <PartyPopper className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">Celebration:</span>
                            </span>
                            <span className="font-medium text-red-600 dark:text-red-400 flex-shrink-0 whitespace-nowrap">
                              -{formatCurrency(celebrationAmount)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700 gap-2 min-w-0">
                          <span className="font-medium text-gray-800 dark:text-gray-200 min-w-0 flex-1 truncate">
                            Net for this expense:
                          </span>
                          <span
                            className={`font-bold flex-shrink-0 whitespace-nowrap ${
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
                            {formatCurrency(Math.abs(netForThisExpense))}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Final Calculation Summary - Compact */}
              <div
                className={`mt-4 p-3 rounded-lg border-2 overflow-hidden ${
                  personSummary.netBalance > 0.01
                    ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                    : personSummary.netBalance < -0.01
                    ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
                    : "bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700"
                }`}
              >
                <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center text-sm">
                  <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Final Calculation</span>
                </h5>
                <div className="space-y-1 text-xs overflow-hidden">
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="min-w-0 flex-1 truncate">Total paid:</span>
                    <span className="font-medium text-green-600 dark:text-green-400 flex-shrink-0 whitespace-nowrap">
                      +{formatCurrency(personSummary.totalPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="min-w-0 flex-1 truncate">Total owed:</span>
                    <span className="font-medium text-red-600 dark:text-red-400 flex-shrink-0 whitespace-nowrap">
                      -{formatCurrency(personSummary.totalOwed)}
                    </span>
                  </div>
                  {(personSummary.totalSettledAsDebtor > 0 ||
                    personSummary.totalSettledAsCreditor > 0) && (
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <span className="min-w-0 flex-1 truncate">Net settlements:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400 flex-shrink-0 whitespace-nowrap">
                        {personSummary.totalSettledAsDebtor -
                          personSummary.totalSettledAsCreditor >=
                        0
                          ? "+"
                          : ""}
                        {formatCurrency(
                          personSummary.totalSettledAsDebtor -
                            personSummary.totalSettledAsCreditor
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300 dark:border-gray-600 gap-2 min-w-0">
                    <span className="font-bold truncate">Final Balance:</span>
                    <span
                      className={`font-bold text-lg flex-shrink-0 whitespace-nowrap ${
                        personSummary.netBalance > 0.01
                          ? "text-green-700 dark:text-green-300"
                          : personSummary.netBalance < -0.01
                          ? "text-red-700 dark:text-red-300"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {personSummary.netBalance > 0.01
                        ? "+"
                        : personSummary.netBalance < -0.01
                        ? "-"
                        : ""}
                      {formatCurrency(Math.abs(personSummary.netBalance))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                    This shows exactly how {selectedPerson.name}'s balance was
                    calculated from individual expenses.
                  </p>
                  <p>
                    <strong>Green amounts</strong> show money paid,{" "}
                    <strong>red amounts</strong> show money owed, and{" "}
                    <strong>blue amounts</strong> show settlement payments
                    already made.
                  </p>
                  <p>
                    The final balance determines whether {selectedPerson.name}{" "}
                    should <strong>pay</strong> (red),
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