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
  Calculator,
  Users,
  Receipt,
  Handshake,
  DollarSign,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  Person,
  Expense,
  SettlementPayment,
} from "@/lib/settleease/types";
import type { TestResult } from "./types";

interface VerificationOverviewProps {
  people: Person[];
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  testResults: TestResult[];
}

export default function VerificationOverview({
  people,
  expenses,
  settlementPayments,
  testResults,
}: VerificationOverviewProps) {
  const totalValue = expenses.reduce((sum, e) => sum + e.total_amount, 0);

  const summaryStats = React.useMemo(() => {
    if (testResults.length === 0) return null;

    const passCount = testResults.filter((r) => r.status === "pass").length;
    const failCount = testResults.filter((r) => r.status === "fail").length;
    const warningCount = testResults.filter(
      (r) => r.status === "warning"
    ).length;

    return { passCount, failCount, warningCount };
  }, [testResults]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <Calculator className="mr-2 h-5 w-5 text-green-600" />
          Step 1: System Overview & Data Summary
        </CardTitle>
        <CardDescription className="text-sm">
          Current data in your system and verification status
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Data Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 sm:p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-sm transition-all">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {people.length}
                </p>
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                  People
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 p-3 sm:p-4 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-sm transition-all">
            <div className="flex items-center space-x-2">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold text-green-900 dark:text-green-100">
                  {expenses.length}
                </p>
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                  Expenses
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/20 p-3 sm:p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700 shadow-sm transition-all">
            <div className="flex items-center space-x-2">
              <Handshake className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {settlementPayments.length}
                </p>
                <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">
                  Settlements
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 sm:p-4 rounded-xl border-2 border-orange-300 dark:border-orange-700 shadow-sm transition-all">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              <div>
                <p className="text-sm sm:text-lg font-bold text-orange-900 dark:text-orange-100">
                  {formatCurrency(totalValue)}
                </p>
                <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">
                  Total Value
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Results Summary */}
        {summaryStats && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-950/20 p-3 sm:p-4 rounded-xl border-2 border-green-300 dark:border-green-700 text-center shadow-sm transition-all">
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {summaryStats.passCount}
              </p>
              <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                Passed
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 p-3 sm:p-4 rounded-xl border-2 border-red-300 dark:border-red-700 text-center shadow-sm transition-all">
              <p className="text-xl sm:text-2xl font-bold text-red-600">
                {summaryStats.failCount}
              </p>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">
                Failed
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 sm:p-4 rounded-xl border-2 border-yellow-300 dark:border-yellow-700 text-center shadow-sm transition-all">
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                {summaryStats.warningCount}
              </p>
              <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                Warnings
              </p>
            </div>
          </div>
        )}

        {/* Information Panel */}
        {testResults.length === 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-sm">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-semibold text-green-900 dark:text-green-100">
                  What This Verification Tests
                </h4>
                <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <p>
                    <strong>Live Data Analysis:</strong> Tests your actual
                    expenses, people, and settlements
                  </p>
                  <p>
                    <strong>Mathematical Accuracy:</strong> Verifies balance
                    conservation and calculation correctness
                  </p>
                  <p>
                    <strong>UI Consistency:</strong> Ensures what you see
                    matches what algorithms calculate
                  </p>
                  <p>
                    <strong>Algorithm Integrity:</strong> Validates settlement
                    algorithms work optimally
                  </p>
                  <p>
                    <strong>Performance:</strong> Measures calculation speed and
                    efficiency
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
