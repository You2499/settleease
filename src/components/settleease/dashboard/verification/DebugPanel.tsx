"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bug, Copy, Download, Database, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/settleease/utils";
import type { DebugReport } from "./types";
import { generateDebugReportText } from "./testUtils";

interface DebugPanelProps {
  debugReport: DebugReport | null;
  showDebugMode: boolean;
  setShowDebugMode: (show: boolean) => void;
  peopleMap: Record<string, string>;
  onCopyReport: () => void;
  onDownloadReport: () => void;
  onExportData: () => void;
}

export default function DebugPanel({
  debugReport,
  showDebugMode,
  setShowDebugMode,
  peopleMap,
  onCopyReport,
  onDownloadReport,
  onExportData,
}: DebugPanelProps) {
  if (!debugReport) return null;

  return (
    <div className="space-y-4">
      {/* Debug Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Last run: {new Date(debugReport.timestamp).toLocaleString()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebugMode(!showDebugMode)}
            className="flex items-center space-x-1"
          >
            <Bug className="h-4 w-4" />
            <span>{showDebugMode ? "Hide" : "Show"} Debug</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyReport}
            className="flex items-center space-x-1"
          >
            <Copy className="h-4 w-4" />
            <span>Copy Report</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadReport}
            className="flex items-center space-x-1"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportData}
                  className="flex items-center space-x-1"
                >
                  <Database className="h-4 w-4" />
                  <span>Export Data</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export live data for debugging</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Debug Mode Panel */}
      {showDebugMode && (
        <Card className="p-4 bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-4">
            <Bug className="h-5 w-5 text-orange-600" />
            <h4 className="font-semibold text-orange-900 dark:text-orange-100">
              Debug Information
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h5 className="font-medium mb-2">System Health</h5>
              <div className="space-y-1 text-sm">
                <div>
                  Data Integrity: {debugReport.systemInfo.dataIntegrityScore}%
                </div>
                <div>Total Tests: {debugReport.testResults.length}</div>
                <div>
                  Failed Tests:{" "}
                  {
                    debugReport.testResults.filter((r) => r.status === "fail")
                      .length
                  }
                </div>
                <div>
                  Warning Tests:{" "}
                  {
                    debugReport.testResults.filter(
                      (r) => r.status === "warning"
                    ).length
                  }
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium mb-2">Live Data Summary</h5>
              <div className="space-y-1 text-sm">
                <div>
                  Balance Sum:{" "}
                  {formatCurrency(
                    Object.values(
                      debugReport.liveData.calculatedBalances
                    ).reduce((sum, b) => sum + (b as number), 0)
                  )}
                </div>
                <div>
                  Simplified Txns:{" "}
                  {debugReport.liveData.simplifiedTransactions.length}
                </div>
                <div>
                  Pairwise Txns:{" "}
                  {debugReport.liveData.pairwiseTransactions.length}
                </div>
                <div>
                  Optimization:{" "}
                  {debugReport.liveData.pairwiseTransactions.length -
                    debugReport.liveData.simplifiedTransactions.length}{" "}
                  txns saved
                </div>
              </div>
            </div>
          </div>

          {debugReport.failureAnalysis && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
              <h5 className="font-medium text-red-900 dark:text-red-100 mb-2">
                Issues Detected
              </h5>
              <div className="space-y-2 text-sm">
                {debugReport.failureAnalysis.criticalFailures.length > 0 && (
                  <div>
                    <strong>Critical Failures:</strong>
                    <ul className="list-disc list-inside ml-2">
                      {debugReport.failureAnalysis.criticalFailures.map(
                        (failure, i) => (
                          <li
                            key={i}
                            className="text-red-800 dark:text-red-200"
                          >
                            {failure}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                <div>
                  <strong>Recommended Actions:</strong>
                  <ul className="list-disc list-inside ml-2">
                    {debugReport.failureAnalysis.recommendedActions.map(
                      (action, i) => (
                        <li
                          key={i}
                          className="text-red-800 dark:text-red-200"
                        >
                          {action}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground flex items-start gap-2">
            <Info className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>For Support:</strong> If tests are failing, copy or
              download this debug report and share it for technical assistance.
              The report contains all necessary data to diagnose and fix algorithm
              issues.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}