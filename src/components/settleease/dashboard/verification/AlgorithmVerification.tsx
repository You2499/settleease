"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Calculator } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { Bug, EyeOff, Eye, Sparkles } from "lucide-react";
import VerificationOverview from "./VerificationOverview";
import VerificationResults from "./VerificationResults";
import VerificationDebug from "./VerificationDebug";
import PromptEditor from "./PromptEditor";
import type { SupabaseClient } from '@supabase/supabase-js';

export default function AlgorithmVerification({
  people,
  expenses,
  settlementPayments,
  peopleMap,
  uiSimplifiedTransactions,
  uiPairwiseTransactions,
  db,
  currentUserId,
}: AlgorithmVerificationProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [debugReport, setDebugReport] = useState<DebugReport | null>(null);
  const [showDebugMode, setShowDebugMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'debug' | 'prompt'>('overview');

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
    <div>
      {/* Control Panel - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border mb-4 gap-3 sm:gap-4">
        <div className="flex items-center space-x-3">
          <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <div>
            <Label className="text-sm font-medium">Algorithm Verification</Label>
            <p className="text-xs text-muted-foreground">
              Test all calculations with live data
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Debug Mode Toggle */}
          {lastRunTime && (
            <div className="flex items-center space-x-2">
              {showDebugMode ? (
                <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
              <Label
                htmlFor="debug-mode"
                className="text-sm font-medium cursor-pointer"
              >
                Debug mode
              </Label>
              <Switch
                id="debug-mode"
                checked={showDebugMode}
                onCheckedChange={setShowDebugMode}
              />
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={runTests}
              disabled={isRunning}
              size="sm"
              className="flex items-center space-x-2"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{isRunning ? "Running..." : "Run Tests"}</span>
              <span className="sm:hidden">{isRunning ? "..." : "Test"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {lastRunTime && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </Button>
          {showDebugMode && debugReport && (
            <Button
              variant={activeTab === 'debug' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('debug')}
            >
              <Bug className="h-4 w-4 mr-1" />
              Debug
            </Button>
          )}
          {currentUserId && db && (
            <Button
              variant={activeTab === 'prompt' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('prompt')}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              AI Prompt
            </Button>
          )}
        </div>
      )}

      {/* Content Area with Mobile-Responsive Spacing */}
      <div className="space-y-4 sm:space-y-6">
        {/* Step 1: System Overview */}
        {activeTab === 'overview' && (
          <VerificationOverview
            people={people}
            expenses={expenses}
            settlementPayments={settlementPayments}
            testResults={testResults}
          />
        )}

        {/* Step 2: Test Results */}
        {activeTab === 'overview' && testResults.length > 0 && (
          <VerificationResults
            testResults={testResults}
            showDebugMode={showDebugMode}
            lastRunTime={lastRunTime}
          />
        )}

        {/* Step 3: Debug Information */}
        {activeTab === 'debug' && showDebugMode && debugReport && (
          <VerificationDebug
            debugReport={debugReport}
            peopleMap={peopleMap}
            onCopyReport={copyDebugReport}
            onDownloadReport={downloadDebugReport}
            onExportData={exportLiveData}
          />
        )}

        {/* Step 4: AI Prompt Editor */}
        {activeTab === 'prompt' && currentUserId && db && (
          <PromptEditor
            db={db}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </div>
  );
}
