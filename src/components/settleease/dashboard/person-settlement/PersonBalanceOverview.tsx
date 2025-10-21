"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  CheckCircle2,
  ExternalLink,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { Person, Expense } from "@/lib/settleease/types";
import type { PersonSummary } from "./types";

interface PersonBalanceOverviewProps {
  selectedPerson: Person;
  personSummary: PersonSummary;
  personExpenses: Expense[];
  onViewAllExpenses: () => void;
}

export default function PersonBalanceOverview({
  selectedPerson,
  personSummary,
  personExpenses,
  onViewAllExpenses,
}: PersonBalanceOverviewProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <User className="mr-2 h-5 w-5 text-green-600" />
          Step 1: {selectedPerson.name}'s Net Balance
        </CardTitle>
        <CardDescription className="text-sm">
          Based on all expenses and what {selectedPerson.name} paid vs. their
          share
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 overflow-x-hidden w-full min-w-0">
        <div className="p-2 overflow-x-hidden w-full min-w-0">
          {/* Single person card with same design as Step1BalanceOverview */}
          <div
            className={`relative p-4 rounded-xl border-2 shadow-sm transition-all h-64 flex flex-col ${
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

            {/* Person Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                    personSummary.netBalance > 0.01
                      ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                      : personSummary.netBalance < -0.01
                      ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                      : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                >
                  {selectedPerson.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">
                    {selectedPerson.name}
                  </h3>
                  <p
                    className={`text-sm font-medium ${
                      personSummary.netBalance > 0.01
                        ? "text-green-700 dark:text-green-300"
                        : personSummary.netBalance < -0.01
                        ? "text-red-700 dark:text-red-300"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {personSummary.netBalance > 0.01
                      ? "should receive"
                      : personSummary.netBalance < -0.01
                      ? "should pay"
                      : "all balanced"}
                  </p>
                </div>
              </div>
              <div className="text-right">
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

            {/* Calculation Breakdown */}
            <div
              className={`flex-1 p-3 rounded-lg border-2 flex flex-col justify-between ${
                personSummary.netBalance > 0.01
                  ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                  : personSummary.netBalance < -0.01
                  ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
                  : "bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700"
              }`}
            >
              <div className="space-y-1 text-xs flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total paid:
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    +{formatCurrency(personSummary.totalPaid)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total owed:
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatCurrency(personSummary.totalOwed)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Net settlements:
                  </span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
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
              </div>

              {/* Final Balance - Always at bottom */}
              <div className="pt-2 border-t-2 border-gray-300 dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                    Net Balance:
                  </span>
                  <span
                    className={`font-bold text-lg ${
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

                {/* Status indicator */}
                <div className="mt-1 flex items-center justify-center">
                  <div
                    className={`flex items-center gap-2 text-sm font-medium ${
                      personSummary.isBalanced
                        ? "text-gray-600 dark:text-gray-400"
                        : personSummary.netBalance > 0.01
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {personSummary.isBalanced ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        All Balanced
                      </>
                    ) : (
                      <span>
                        {personSummary.netBalance > 0.01
                          ? "Should receive"
                          : "Should pay"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Summary */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Involved in {personExpenses.length} expenses
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onViewAllExpenses}
                className="text-xs"
              >
                <ExternalLink className="mr-1 h-4 w-4" />
                View All
              </Button>
            </div>
          </div>

          {/* Summary explanation */}
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  Understanding Net Balances
                </div>
                <div className="text-sm text-green-800 dark:text-green-200 space-y-2">
                  <p>
                    {selectedPerson.name}'s net balance is calculated as:{" "}
                    <strong>Total Paid - Total Owed</strong>
                  </p>
                  <p>
                    <strong>Green (Receives)</strong> means they paid more
                    than their share,
                    <strong> Red (Pays)</strong> means they owe money, and
                    <strong> Gray (Balanced)</strong> means they're even.
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