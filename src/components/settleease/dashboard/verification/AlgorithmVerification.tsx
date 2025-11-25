"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  Play,
  Calculator,
  Bug,
  Sparkles,
  CircleCheck,
  CircleX,
  CircleAlert,
  ShieldCheck,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
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
  manualOverrides,
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
  const [progress, setProgress] = useState(0);
  const [integrityScore, setIntegrityScore] = useState<number | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setProgress(0);

    // Simulate progress for better UX since runAllTests is fast but we want to show activity
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 100);

    try {
      const { results, debugReport } = await runAllTests(
        people,
        expenses,
        settlementPayments,
        peopleMap,
        uiSimplifiedTransactions,
        uiPairwiseTransactions,
        manualOverrides
      );

      clearInterval(interval);
      setProgress(100);

      // Small delay to let the progress bar finish
      setTimeout(() => {
        setTestResults(results);
        setDebugReport(debugReport);
        setIntegrityScore(debugReport.systemInfo.dataIntegrityScore);
        setLastRunTime(new Date());
        setActiveTab('results');
        setIsRunning(false);
      }, 500);

    } catch (error) {
      console.error("Error running tests:", error);
      clearInterval(interval);
      setIsRunning(false);
    }
  };

  const handleDownloadReport = () => {
    const reportText = generateDebugReportText(debugReport, peopleMap);
    const blob = new Blob([reportText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settleease-debug-report-${new Date().toISOString().split("T")[0]
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
    a.download = `settleease-live-data-${new Date().toISOString().split("T")[0]
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
    <Card className="shadow-lg rounded-lg border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
              <ShieldCheck className="mr-2 sm:mr-3 h-6 w-6 text-primary" />
              Algorithm Verification
            </CardTitle>
            <CardDescription className="mt-2 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Verify mathematical integrity of settlement calculations
            </CardDescription>
          </div>

          {lastRunTime && (
            <div className="flex items-center gap-3 bg-background/80 p-2 rounded-lg border shadow-sm">
              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Integrity Score</span>
                <span className={`text-lg font-bold ${(integrityScore || 0) === 100 ? 'text-green-600' :
                  (integrityScore || 0) > 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  {integrityScore}%
                </span>
              </div>
              <div className={`h-10 w-1 rounded-full ${(integrityScore || 0) === 100 ? 'bg-green-500' :
                (integrityScore || 0) > 80 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isRunning && (
          <div className="w-full bg-secondary/20">
            <Progress value={progress} className="h-1 rounded-none" />
          </div>
        )}

        {!lastRunTime && !isRunning ? (
          // Initial state - show overview
          <div className="text-center py-12 px-4 sm:px-6 bg-card/30">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 ring-8 ring-primary/5">
              <Calculator className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3">Ready to Verify</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto text-base">
              Run our comprehensive test suite to mathematically prove that all expenses, splits, and settlements are calculated correctly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
              <Card className="bg-background/60 backdrop-blur border shadow-sm">
                <CardContent className="p-4 flex flex-col items-center">
                  <span className="text-3xl font-bold text-primary mb-1">{people.length}</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">People</span>
                </CardContent>
              </Card>
              <Card className="bg-background/60 backdrop-blur border shadow-sm">
                <CardContent className="p-4 flex flex-col items-center">
                  <span className="text-3xl font-bold text-primary mb-1">{expenses.length}</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses</span>
                </CardContent>
              </Card>
              <Card className="bg-background/60 backdrop-blur border shadow-sm">
                <CardContent className="p-4 flex flex-col items-center">
                  <span className="text-3xl font-bold text-primary mb-1">{settlementPayments.length}</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Settlements</span>
                </CardContent>
              </Card>
            </div>

            <Button
              onClick={runTests}
              disabled={isRunning}
              size="lg"
              className="h-12 px-8 text-base shadow-lg"
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              Run Verification Suite
            </Button>
          </div>
        ) : (
          // After tests run - show tabs
          <div className="flex flex-col min-h-[500px]">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-1 flex flex-col">
              <div className="px-4 sm:px-6 pt-4 border-b bg-muted/30">
                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-4 bg-background/50 p-1 h-auto no-scrollbar">
                  <TabsTrigger value="overview" className="flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm px-3 py-1.5 h-9">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="results" className="flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm px-3 py-1.5 h-9">
                    <span className="flex items-center gap-2">
                      Results
                      {failedTests > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                          {failedTests}
                        </Badge>
                      )}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="debug" className="flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm px-3 py-1.5 h-9">
                    <Bug className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Debug Report
                  </TabsTrigger>

                </TabsList>
              </div>

              <div className="flex-1 bg-card/30 p-4 sm:p-6">
                <TabsContent value="overview" className="mt-0 h-full">
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-end">
                      <Button onClick={runTests} variant="outline" size="sm" className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
                        Rerun Tests
                      </Button>
                    </div>
                    <VerificationOverview
                      people={people}
                      expenses={expenses}
                      settlementPayments={settlementPayments}
                      testResults={testResults}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="results" className="mt-0 h-full">
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Test Execution Results</h3>
                      <Button onClick={runTests} variant="outline" size="sm" className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
                        Rerun Tests
                      </Button>
                    </div>
                    <VerificationResults
                      testResults={testResults}
                      showDebugMode={true}
                      lastRunTime={lastRunTime}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="debug" className="mt-0 h-full">
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


              </div>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
