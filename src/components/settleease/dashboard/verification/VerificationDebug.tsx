"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bug, 
  Copy, 
  Download, 
  Database, 
  AlertTriangle, 
  Info,
  ChevronDown,
  ChevronRight,
  Activity,
  BarChart3,
  Settings
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { DebugReport } from "./types";

interface VerificationDebugProps {
  debugReport: DebugReport;
  peopleMap: Record<string, string>;
  onCopyReport: () => void;
  onDownloadReport: () => void;
  onExportData: () => void;
}

export default function VerificationDebug({
  debugReport,
  peopleMap,
  onCopyReport,
  onDownloadReport,
  onExportData,
}: VerificationDebugProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSectionExpansion = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const hasFailures = debugReport.failureAnalysis && 
    debugReport.failureAnalysis.criticalFailures.length > 0;

  const failedTests = debugReport.testResults.filter((r) => r.status === "fail").length;
  const warningTests = debugReport.testResults.filter((r) => r.status === "warning").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <Bug className="mr-2 h-5 w-5 text-purple-600" />
          Step 3: Debug Information & System Analysis
        </CardTitle>
        <CardDescription className="text-sm">
          Detailed technical information for troubleshooting and support
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyReport}
            className="flex items-center space-x-2 flex-1 sm:flex-none"
          >
            <Copy className="h-4 w-4" />
            <span>Copy Report</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadReport}
            className="flex items-center space-x-2 flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportData}
            className="flex items-center space-x-2 flex-1 sm:flex-none"
          >
            <Database className="h-4 w-4" />
            <span>Export Data</span>
          </Button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* System Health Overview */}
          <div className={`relative p-4 rounded-xl border-2 shadow-sm transition-all ${
            hasFailures || failedTests > 0
              ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-300 dark:border-red-700"
              : warningTests > 0
              ? "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-300 dark:border-yellow-700"
              : "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-300 dark:border-green-700"
          }`}>
            {/* Status Badge */}
            <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
              hasFailures || failedTests > 0
                ? "bg-red-500 text-white"
                : warningTests > 0
                ? "bg-yellow-500 text-white"
                : "bg-green-500 text-white"
            }`}>
              {hasFailures || failedTests > 0 ? "ISSUES" : warningTests > 0 ? "WARNINGS" : "HEALTHY"}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                  hasFailures || failedTests > 0
                    ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                    : warningTests > 0
                    ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
                    : "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                }`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">
                    System Health Overview
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Overall system status and metrics
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  hasFailures || failedTests > 0
                    ? "text-red-700 dark:text-red-300"
                    : warningTests > 0
                    ? "text-yellow-700 dark:text-yellow-300"
                    : "text-green-700 dark:text-green-300"
                }`}>
                  {debugReport.systemInfo.dataIntegrityScore}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Data Integrity
                </div>
              </div>
            </div>

            {/* System Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {debugReport.testResults.length}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Total Tests
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {failedTests}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Failed
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">
                    {warningTests}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Warnings
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {debugReport.testResults.length - failedTests - warningTests}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Passed
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Data Analysis */}
          <div className="relative p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-sm transition-all">
            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white shadow-sm">
              ANALYSIS
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center shadow-sm">
                  <BarChart3 className="w-5 h-5 text-blue-800 dark:text-blue-200" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-100">
                    Live Data Analysis
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Current system data and optimization metrics
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(
                      Object.values(debugReport.liveData.calculatedBalances).reduce(
                        (sum, b) => sum + Math.abs(b as number),
                        0
                      )
                    )}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Balance Sum
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <div className="text-sm font-bold text-purple-600">
                    {debugReport.liveData.pairwiseTransactions.length}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Direct Debts
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <div className="text-sm font-bold text-green-600">
                    {debugReport.liveData.simplifiedTransactions.length}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Optimized
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <div className="text-sm font-bold text-blue-600">
                    {debugReport.liveData.pairwiseTransactions.length -
                      debugReport.liveData.simplifiedTransactions.length}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Saved Txns
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Failure Analysis */}
          {debugReport.failureAnalysis && (
            <div className="relative p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 rounded-xl border-2 border-red-300 dark:border-red-700 shadow-sm transition-all">
              <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm">
                CRITICAL
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-red-800 dark:text-red-200" />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-900 dark:text-red-100">
                      Issues Detected
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Critical failures requiring immediate attention
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {debugReport.failureAnalysis.criticalFailures.length}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Critical Issues
                  </div>
                </div>
              </div>

              {/* Expandable Failure Details */}
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  onClick={() => toggleSectionExpansion("failures")}
                  className="w-full justify-start p-2 h-auto font-semibold rounded-md transition-colors text-red-800 dark:text-red-200 hover:bg-red-200/50 hover:text-red-800 dark:hover:bg-red-800/30 dark:hover:text-red-200"
                >
                  {expandedSections.has("failures") ? (
                    <ChevronDown className="w-4 h-4 mr-2" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-2" />
                  )}
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View Critical Failures & Recommendations
                </Button>

                {expandedSections.has("failures") && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-700 shadow-sm">
                    {debugReport.failureAnalysis.criticalFailures.length > 0 && (
                      <div className="mb-4">
                        <strong className="text-red-800 dark:text-red-200 text-sm">
                          Critical Failures:
                        </strong>
                        <ul className="list-disc list-inside ml-2 mt-2 space-y-1">
                          {debugReport.failureAnalysis.criticalFailures.map((failure, i) => (
                            <li key={i} className="text-red-800 dark:text-red-200 break-words text-sm">
                              {failure}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <strong className="text-red-800 dark:text-red-200 text-sm">
                        Recommended Actions:
                      </strong>
                      <ul className="list-disc list-inside ml-2 mt-2 space-y-1">
                        {debugReport.failureAnalysis.recommendedActions.map((action, i) => (
                          <li key={i} className="text-red-800 dark:text-red-200 break-words text-sm">
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Technical Support Information */}
          <div className="relative p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 rounded-xl border-2 border-gray-300 dark:border-gray-700 shadow-sm transition-all">
            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-gray-500 text-white shadow-sm">
              SUPPORT
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                  <Settings className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">
                    Technical Support
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Debug information and troubleshooting resources
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    💡 For Technical Support
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    <p>
                      If tests are failing, use the buttons above to copy or download this debug report 
                      and share it for technical assistance.
                    </p>
                    <p>
                      The report contains all necessary data to diagnose and fix algorithm issues, 
                      including system metrics, test results, and failure analysis.
                    </p>
                    <p>
                      <strong>Export Data</strong> provides raw data for deeper analysis if needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}