"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Play, Calculator, Bug, Sparkles, CircleCheck, CircleX, CircleAlert } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<'overview' | 'results' | 'debug' | 'prompt'>('overview');

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
      setActiveTab('results');
    } catch (error) {
      console.error("Error running tests:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownloadReport = () => {
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

  const handleExportData = () => {
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

  // Calculate test summary
  const passedTests = testResults.filter(t => t.status === 'pass').length;
  const failedTests = testResults.filter(t => t.status === 'fail').length;
  const totalTests = testResults.length;

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
              <Calculator className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Algorithm Verification
            </CardTitle>
            <CardDescription className="mt-2">
              Test settlement calculations and verify algorithm accuracy
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={runTests}
              disabled={isRunning}
              size="sm"
              className="flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">{isRunning ? "Running Tests..." : "Run Tests"}</span>
              <span className="sm:hidden">{isRunning ? "Running..." : "Test"}</span>
            </Button>
            {lastRunTime && totalTests > 0 && (
              <Badge variant={failedTests === 0 ? "default" : "destructive"} className="flex items-center gap-1">
                {failedTests === 0 ? (
                  <CircleCheck className="h-3 w-3" />
                ) : (
                  <CircleX className="h-3 w-3" />
                )}
                {passedTests}/{totalTests}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {!lastRunTime ? (
          // Initial state - show overview
          <div className="text-center py-8 sm:py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 mb-4">
              <Calculator className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Ready to Test</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Run comprehensive tests on settlement calculations to verify algorithm accuracy
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-2xl font-bold text-primary">{people.length}</div>
                <div className="text-xs text-muted-foreground">People</div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-2xl font-bold text-primary">{expenses.length}</div>
                <div className="text-xs text-muted-foreground">Expenses</div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-2xl font-bold text-primary">{settlementPayments.length}</div>
                <div className="text-xs text-muted-foreground">Settlements</div>
              </div>
            </div>
            <Button onClick={runTests} disabled={isRunning} size="lg">
              {isRunning ? "Running Tests..." : "Run Verification Tests"}
            </Button>
          </div>
        ) : (
          // After tests run - show tabs
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="results" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Test </span>Results
              </TabsTrigger>
              <TabsTrigger value="debug" className="text-xs sm:text-sm">
                <Bug className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Debug
              </TabsTrigger>
              {currentUserId && db && (
                <TabsTrigger value="prompt" className="text-xs sm:text-sm">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  AI Prompt
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <VerificationOverview
                people={people}
                expenses={expenses}
                settlementPayments={settlementPayments}
                testResults={testResults}
              />
            </TabsContent>

            <TabsContent value="results" className="mt-0">
              <VerificationResults
                testResults={testResults}
                showDebugMode={true}
                lastRunTime={lastRunTime}
              />
            </TabsContent>

            <TabsContent value="debug" className="mt-0">
              {debugReport && (
                <VerificationDebug
                  debugReport={debugReport}
                  peopleMap={peopleMap}
                  onCopyReport={async () => {
                    const reportText = generateDebugReportText(debugReport, peopleMap);
                    await navigator.clipboard.writeText(reportText);
                    console.log("Debug report copied to clipboard");
                  }}
                  onDownloadReport={handleDownloadReport}
                  onExportData={handleExportData}
                />
              )}
            </TabsContent>

            {currentUserId && db && (
              <TabsContent value="prompt" className="mt-0">
                <PromptEditor
                  db={db}
                  currentUserId={currentUserId}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
