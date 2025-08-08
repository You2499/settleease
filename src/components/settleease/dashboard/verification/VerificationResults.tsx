"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  TestTube,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import TestDetailRenderer from "./TestDetailRenderer";
import type { TestResult } from "./types";

interface VerificationResultsProps {
  testResults: TestResult[];
  showDebugMode: boolean;
  lastRunTime: Date | null;
}

export default function VerificationResults({
  testResults,
  showDebugMode,
  lastRunTime,
}: VerificationResultsProps) {
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const toggleTestExpansion = (testId: string) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedTests(newExpanded);
  };

  const getStatusIcon = (status: "pass" | "fail" | "warning") => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: "pass" | "fail" | "warning") => {
    const variants = {
      pass: "bg-green-100 text-green-800 border-green-200",
      fail: "bg-red-100 text-red-800 border-red-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };

    return (
      <Badge className={`${variants[status]} border text-xs`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Group tests by category for better organization
  const testsByCategory = React.useMemo(() => {
    const categories: Record<string, TestResult[]> = {};
    
    testResults.forEach((test) => {
      // Extract category from test name or use a default
      let category = "General Tests";
      if (test.name.includes("Balance")) category = "Balance Verification";
      else if (test.name.includes("Transaction") || test.name.includes("Settlement")) category = "Transaction Verification";
      else if (test.name.includes("UI") || test.name.includes("Display")) category = "UI Consistency";
      else if (test.name.includes("Performance") || test.name.includes("Speed")) category = "Performance Tests";
      else if (test.name.includes("Algorithm") || test.name.includes("Calculation")) category = "Algorithm Integrity";
      
      if (!categories[category]) categories[category] = [];
      categories[category].push(test);
    });
    
    return categories;
  }, [testResults]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <TestTube className="mr-2 h-5 w-5 text-orange-600" />
          Step 2: Verification Results
        </CardTitle>
        <CardDescription className="text-sm">
          Detailed results from all algorithm tests
          {lastRunTime && (
            <span className="block mt-1 text-xs text-muted-foreground">
              Last run: {lastRunTime.toLocaleString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4 sm:space-y-6">
          {Object.entries(testsByCategory).map(([category, tests]) => {
            const categoryStats = {
              pass: tests.filter(t => t.status === "pass").length,
              fail: tests.filter(t => t.status === "fail").length,
              warning: tests.filter(t => t.status === "warning").length,
            };

            const categoryColor = categoryStats.fail > 0 ? "red" : 
                                categoryStats.warning > 0 ? "yellow" : "green";

            return (
              <div
                key={category}
                className={`relative p-4 rounded-xl border-2 shadow-sm transition-all ${
                  categoryColor === "green"
                    ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-300 dark:border-green-700"
                    : categoryColor === "yellow"
                    ? "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-300 dark:border-yellow-700"
                    : "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-300 dark:border-red-700"
                }`}
              >
                {/* Category Status Badge */}
                <div
                  className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                    categoryColor === "green"
                      ? "bg-green-500 text-white"
                      : categoryColor === "yellow"
                      ? "bg-yellow-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {categoryStats.fail > 0 ? "ISSUES" : 
                   categoryStats.warning > 0 ? "WARNINGS" : "PASSED"}
                </div>

                {/* Category Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                        categoryColor === "green"
                          ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                          : categoryColor === "yellow"
                          ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
                          : "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                      }`}
                    >
                      <TestTube className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">
                        {category}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {tests.length} test{tests.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="flex gap-1 text-xs items-center">
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          {categoryStats.pass}<CheckCircle2 className="h-3 w-3" />
                        </span>
                        {categoryStats.warning > 0 && (
                          <span className="text-yellow-600 font-medium flex items-center gap-1">
                            {categoryStats.warning}<AlertTriangle className="h-3 w-3" />
                          </span>
                        )}
                        {categoryStats.fail > 0 && (
                          <span className="text-red-600 font-medium flex items-center gap-1">
                            {categoryStats.fail}<XCircle className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tests List */}
                <div className="space-y-2">
                  {tests.map((result) => (
                    <div
                      key={result.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                      <div className="p-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                          <div className="flex items-start space-x-3 flex-1">
                            {getStatusIcon(result.status)}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm sm:text-base leading-tight">
                                {result.name}
                              </h4>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                {result.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {result.executionTime && (
                              <span className="text-xs text-muted-foreground flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{result.executionTime}ms</span>
                              </span>
                            )}
                            {getStatusBadge(result.status)}
                          </div>
                        </div>

                        {/* Expandable Details */}
                        {(result.details.length > 0 || (showDebugMode && result.debugInfo)) && (
                          <div className="mt-3">
                            <Button
                              variant="ghost"
                              onClick={() => toggleTestExpansion(result.id)}
                              className="w-full justify-start p-2 h-auto font-medium rounded-md transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {expandedTests.has(result.id) ? (
                                <ChevronDown className="w-4 h-4 mr-2" />
                              ) : (
                                <ChevronRight className="w-4 h-4 mr-2" />
                              )}
                              <Info className="w-4 h-4 mr-2" />
                              Test Details
                            </Button>

                            {expandedTests.has(result.id) && (
                              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700">
                                {result.details.length > 0 && (
                                  <div className="space-y-1 mb-3">
                                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                      TEST RESULTS:
                                    </div>
                                    {result.details.map((detail, index) => (
                                      <div key={index} className="mb-1">
                                        <TestDetailRenderer detail={detail} />
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Show debug info in debug mode */}
                                {showDebugMode && result.debugInfo && (
                                  <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
                                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                      DEBUG INFO:
                                    </div>
                                    {result.debugInfo.errorDetails && (
                                      <div className="text-xs text-red-600 dark:text-red-400 mb-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                                        <strong>Error:</strong> {result.debugInfo.errorDetails}
                                      </div>
                                    )}
                                    {result.debugInfo.inputData && (
                                      <details className="text-xs mb-2">
                                        <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium">
                                          Input Data
                                        </summary>
                                        <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto border border-gray-200 dark:border-gray-700">
                                          {JSON.stringify(result.debugInfo.inputData, null, 2)}
                                        </pre>
                                      </details>
                                    )}
                                    {result.debugInfo.calculationSteps && (
                                      <details className="text-xs">
                                        <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium">
                                          Calculation Steps
                                        </summary>
                                        <div className="mt-1 space-y-1 p-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                          {result.debugInfo.calculationSteps.map((step, i) => (
                                            <div key={i} className="text-xs font-mono break-words">
                                              {i + 1}. {JSON.stringify(step)}
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Summary explanation */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Understanding Test Results
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <p>
                    Tests are grouped by category to help you understand different aspects of the verification process.
                  </p>
                  <p>
                    <strong>Green categories</strong> indicate all tests passed, 
                    <strong> yellow categories</strong> have warnings that should be reviewed, and 
                    <strong> red categories</strong> have critical failures requiring attention.
                  </p>
                  <p>
                    Click "Test Details" to expand individual test results and see specific information about what was verified.
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