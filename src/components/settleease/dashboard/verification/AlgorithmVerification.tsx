"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Calculator, Database } from "lucide-react";
import {
  calculateNetBalances,
  calculateSimplifiedTransactions,
  calculatePairwiseTransactions,
} from "@/lib/settleease/settlementCalculations";
import type {
  TestResult,
  DebugReport,
  AlgorithmVerificationProps,
} from "./types";
import { generateDebugReportText } from "./testUtils";
import { runAllTests } from "./testRunner";
import SummaryStats from "./SummaryStats";
import DebugPanel from "./DebugPanel";
import TestResults from "./TestResults";

export default function AlgorithmVerification({
  people,
  expenses,
  settlementPayments,
  peopleMap,
  uiSimplifiedTransactions,
  uiPairwiseTransactions,
}: AlgorithmVerificationProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [debugReport, setDebugReport] = useState<DebugReport | null>(null);
  const [showDebugMode, setShowDebugMode] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const { results, debugReport } = await runAllTests(
        people,
        expenses,
        settlementPayments,
        peopleMap,
        uiSimplifiedTransactions,
        uiPairwiseTransactions
      );

      setTestResults(results);
      setDebugReport(debugReport);
      setLastRunTime(new Date());
    } catch (error) {
      console.error("Error running tests:", error);
    } finally {
      setIsRunning(false);
    }
  };

  // Copy debug report to clipboard
  const copyDebugReport = async () => {
    try {
      const reportText = generateDebugReportText(debugReport, peopleMap);
      await navigator.clipboard.writeText(reportText);
      console.log("Debug report copied to clipboard");
    } catch (err) {
      console.error("Failed to copy debug report:", err);
    }
  };

  // Download debug report as file
  const downloadDebugReport = () => {
    const reportText = generateDebugReportText(debugReport, peopleMap);
    const blob = new Blob([reportText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settleease-debug-report-${
      new Date().toISOString().split("T")[0]
    }.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export live data as JSON
  const exportLiveData = () => {
    const quickData = {
      timestamp: new Date().toISOString(),
      people: people,
      expenses: expenses,
      settlementPayments: settlementPayments,
      calculatedBalances: calculateNetBalances(
        people,
        expenses,
        settlementPayments
      ),
      simplifiedTransactions: calculateSimplifiedTransactions(
        people,
        expenses,
        settlementPayments
      ),
      pairwiseTransactions: calculatePairwiseTransactions(
        people,
        expenses,
        settlementPayments
      ),
    };

    const blob = new Blob([JSON.stringify(quickData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settleease-live-data-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calculator className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Algorithm Verification</h3>
            <p className="text-sm text-muted-foreground">
              Comprehensive testing of expense sharing algorithms using live
              data
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={runTests}
            disabled={isRunning}
            className="flex items-center space-x-2"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>{isRunning ? "Running..." : "Run Tests"}</span>
          </Button>

          {/* Quick data export for debugging */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportLiveData}
            className="flex items-center space-x-1"
            title="Export live data for debugging"
          >
            <Database className="h-4 w-4" />
            <span>Export Data</span>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <SummaryStats
        people={people}
        expenses={expenses}
        settlementPayments={settlementPayments}
        peopleMap={peopleMap}
        uiSimplifiedTransactions={uiSimplifiedTransactions}
        uiPairwiseTransactions={uiPairwiseTransactions}
        testResults={testResults}
      />

      {/* Debug Panel */}
      {lastRunTime && (
        <DebugPanel
          debugReport={debugReport}
          showDebugMode={showDebugMode}
          setShowDebugMode={setShowDebugMode}
          peopleMap={peopleMap}
          onCopyReport={copyDebugReport}
          onDownloadReport={downloadDebugReport}
          onExportData={exportLiveData}
        />
      )}

      {/* Test Results */}
      <TestResults testResults={testResults} showDebugMode={showDebugMode} />
    </div>
  );
}
