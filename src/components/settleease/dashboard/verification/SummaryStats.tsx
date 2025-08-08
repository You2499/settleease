"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Receipt,
  Handshake,
  DollarSign,
  Info,
  Target,
  Shuffle,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { TestResult, AlgorithmVerificationProps } from "./types";

interface SummaryStatsProps extends AlgorithmVerificationProps {
  testResults: TestResult[];
}

export default function SummaryStats({
  people,
  expenses,
  settlementPayments,
  testResults,
}: SummaryStatsProps) {
  const summaryStats = React.useMemo(() => {
    if (testResults.length === 0) return null;

    const passCount = testResults.filter((r) => r.status === "pass").length;
    const failCount = testResults.filter((r) => r.status === "fail").length;
    const warningCount = testResults.filter(
      (r) => r.status === "warning"
    ).length;
    const totalTime = testResults.reduce(
      (sum, r) => sum + (r.executionTime || 0),
      0
    );

    return { passCount, failCount, warningCount, totalTime };
  }, [testResults]);

  return (
    <div className="space-y-6">
      {/* Test Overview */}
      {testResults.length === 0 && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                What This Verification Tests
              </h4>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <p>
                  <strong>Live Data Analysis:</strong> Tests your actual
                  expenses, people, and settlements
                </p>
                <p>
                  <strong>Mathematical Accuracy:</strong> Verifies balance
                  conservation and calculation correctness
                </p>
                <p>
                  <strong>Algorithm Integrity:</strong> Ensures settlement
                  algorithms work optimally
                </p>
                <p>
                  <strong>Edge Cases:</strong> Tests handling of complex
                  scenarios and data integrity
                </p>
                <p>
                  <strong>Performance:</strong> Measures calculation speed and
                  efficiency
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Current Data Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{people.length}</p>
              <p className="text-sm text-muted-foreground">People</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Receipt className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{expenses.length}</p>
              <p className="text-sm text-muted-foreground">Expenses</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Handshake className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{settlementPayments.length}</p>
              <p className="text-sm text-muted-foreground">Settlements</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  expenses.reduce((sum, e) => sum + e.total_amount, 0)
                )}
              </p>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {summaryStats.passCount}
                </p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {summaryStats.failCount}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {summaryStats.warningCount}
                </p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {summaryStats.totalTime}
                </p>
                <p className="text-sm text-muted-foreground">ms</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Instructions */}
      {testResults.length === 0 && (
        <Card className="p-6 text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Ready to Verify</h3>
          <p className="text-muted-foreground mb-4">
            Click "Run Tests" to verify the accuracy of all expense sharing
            algorithms using your live data and comprehensive synthetic test
            cases.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Balance calculations</span>
            </div>
            <div className="flex items-center space-x-2">
              <Receipt className="h-4 w-4 text-green-600" />
              <span>Expense integrity</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shuffle className="h-4 w-4 text-purple-600" />
              <span>Settlement algorithms</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}