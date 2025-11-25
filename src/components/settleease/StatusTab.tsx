"use client";

import React, { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Database,
  Sparkles,
  Calculator,
  RefreshCw,
  CircleCheck,
  CircleX,
  CircleAlert,
  Clock,
  Zap,
  TriangleAlert,
  Server,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Person, Expense, SettlementPayment, ManualSettlementOverride } from '@/lib/settleease/types';
import { runAllTests } from './dashboard/verification/testRunner';
import type { TestResult } from './dashboard/verification/types';

interface StatusTabProps {
  db?: SupabaseClient;
  people: Person[];
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  manualOverrides?: ManualSettlementOverride[];
  peopleMap?: Record<string, string>;
  isLoadingPeople?: boolean;
  isLoadingExpenses?: boolean;
  isLoadingSettlements?: boolean;
  isDataFetchedAtLeastOnce?: boolean;
}

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'checking';
  message: string;
  responseTime?: number;
  lastChecked?: Date;
  icon: React.ElementType;
  details?: React.ReactNode;
}

export default function StatusTab({
  db,
  people,
  expenses,
  settlementPayments,
  manualOverrides = [],
  peopleMap = {},
  isLoadingPeople = false,
  isLoadingExpenses = false,
  isLoadingSettlements = false,
  isDataFetchedAtLeastOnce = true,
}: StatusTabProps) {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Database Connection',
      status: 'checking',
      message: 'Checking connection...',
      icon: Database,
    },
    {
      name: 'AI Summarization API',
      status: 'checking',
      message: 'Checking API health...',
      icon: Sparkles,
    },
    {
      name: 'Algorithm Integrity',
      status: 'checking',
      message: 'Verifying algorithms...',
      icon: Calculator,
    },
    {
      name: 'Data Sync',
      status: 'checking',
      message: 'Checking sync status...',
      icon: RefreshCw,
    },
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [integrityScore, setIntegrityScore] = useState<number | null>(null);

  // Check service health
  const checkServiceHealth = async () => {
    setIsRefreshing(true);
    const newServices: ServiceStatus[] = [];

    // 1. Database Connection
    const dbStart = Date.now();
    try {
      if (db) {
        const { error } = await db.from('people').select('id').limit(1);
        const dbTime = Date.now() - dbStart;

        newServices.push({
          name: 'Database Connection',
          status: error ? 'down' : 'operational',
          message: error ? `Connection failed: ${error.message}` : 'Connected and responsive',
          responseTime: dbTime,
          lastChecked: new Date(),
          icon: Database,
          details: (
            <div className="text-xs text-muted-foreground mt-1">
              Provider: Supabase • Region: auto • Latency: {dbTime}ms
            </div>
          )
        });
      } else {
        newServices.push({
          name: 'Database Connection',
          status: 'down',
          message: 'Database client not initialized',
          lastChecked: new Date(),
          icon: Database,
        });
      }
    } catch (error) {
      newServices.push({
        name: 'Database Connection',
        status: 'down',
        message: `Error: ${String(error)}`,
        lastChecked: new Date(),
        icon: Database,
      });
    }

    // 2. AI Summarization API
    const aiStart = Date.now();
    try {
      const response = await fetch('/api/summarize/health');
      const aiTime = Date.now() - aiStart;
      const data = await response.json();

      const allHealthy = data.checks?.geminiApiKey &&
        data.checks?.supabaseUrl &&
        data.checks?.supabaseServiceKey &&
        data.checks?.promptFetch;

      newServices.push({
        name: 'AI Summarization API',
        status: allHealthy ? 'operational' : 'degraded',
        message: allHealthy
          ? 'All systems operational'
          : 'Some components unavailable',
        responseTime: aiTime,
        lastChecked: new Date(),
        icon: Sparkles,
        details: (
          <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className={data.checks?.geminiApiKey ? "text-green-500" : "text-red-500"}>●</span> Gemini API
              <span className={data.checks?.promptFetch ? "text-green-500" : "text-red-500"}>●</span> Prompt v{data.checks?.promptVersion || '?'}
            </div>
          </div>
        )
      });
    } catch (error) {
      newServices.push({
        name: 'AI Summarization API',
        status: 'down',
        message: 'API unreachable',
        lastChecked: new Date(),
        icon: Sparkles,
      });
    }

    // 3. Algorithm Integrity (Full Test Suite)
    try {
      const { results, debugReport } = await runAllTests(
        people,
        expenses,
        settlementPayments,
        peopleMap,
        undefined, // uiSimplifiedTransactions (not available here, skipping UI consistency test)
        undefined, // uiPairwiseTransactions
        manualOverrides
      );

      setTestResults(results);
      setIntegrityScore(debugReport.systemInfo.dataIntegrityScore);

      const passedTests = results.filter(r => r.status === 'pass').length;
      const totalTests = results.length;
      const hasFailures = results.some(r => r.status === 'fail');
      const hasWarnings = results.some(r => r.status === 'warning');

      newServices.push({
        name: 'Algorithm Integrity',
        status: hasFailures ? 'down' : hasWarnings ? 'degraded' : 'operational',
        message: hasFailures
          ? `${passedTests}/${totalTests} tests passed. Critical issues detected.`
          : hasWarnings
            ? `${passedTests}/${totalTests} tests passed. Warnings detected.`
            : 'All verification tests passed successfully.',
        lastChecked: new Date(),
        icon: Calculator,
        details: (
          <div className="mt-2 w-full">
            <div className="flex justify-between text-xs mb-1">
              <span>Score: {debugReport.systemInfo.dataIntegrityScore}%</span>
              <span>{passedTests}/{totalTests} Tests</span>
            </div>
            <Progress value={debugReport.systemInfo.dataIntegrityScore} className="h-1.5" />
          </div>
        )
      });
    } catch (error) {
      newServices.push({
        name: 'Algorithm Integrity',
        status: 'down',
        message: `Verification failed: ${String(error)}`,
        lastChecked: new Date(),
        icon: Calculator,
      });
    }

    // 4. Data Sync
    const syncStatus = isLoadingPeople || isLoadingExpenses || isLoadingSettlements;
    newServices.push({
      name: 'Data Sync',
      status: syncStatus ? 'checking' : 'operational',
      message: syncStatus ? 'Syncing data...' : 'All data synchronized',
      lastChecked: new Date(),
      icon: RefreshCw,
      details: (
        <div className="text-xs text-muted-foreground mt-1">
          Last synced: {new Date().toLocaleTimeString()}
        </div>
      )
    });

    setServices(newServices);
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  // Initial check
  useEffect(() => {
    if (isDataFetchedAtLeastOnce && db) {
      checkServiceHealth();
    }
  }, [isDataFetchedAtLeastOnce, db]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRefreshing && isDataFetchedAtLeastOnce && db) {
        checkServiceHealth();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isRefreshing, isDataFetchedAtLeastOnce, db]);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      case 'checking':
        return 'bg-blue-500';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CircleCheck className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'degraded':
        return <CircleAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'down':
        return <CircleX className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'checking':
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">Operational</Badge>;
      case 'degraded':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800">Degraded</Badge>;
      case 'down':
        return <Badge variant="destructive">Down</Badge>;
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
    }
  };

  const overallStatus = services.every(s => s.status === 'operational')
    ? 'operational'
    : services.some(s => s.status === 'down')
      ? 'down'
      : 'degraded';

  const isLoading = !isDataFetchedAtLeastOnce || isLoadingPeople || isLoadingExpenses || isLoadingSettlements;

  if (isLoading) {
    return (
      <Card className="shadow-xl rounded-lg h-full flex flex-col">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <Skeleton className="h-7 sm:h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-full sm:w-96" />
            </div>
            <Skeleton className="h-9 w-full sm:w-32" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 md:space-y-6">
      <Card className="shadow-lg rounded-lg border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                <Activity className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                System Status
              </CardTitle>
              <CardDescription className="mt-2">
                Real-time health monitoring and algorithm verification
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={checkServiceHealth}
                disabled={isRefreshing}
                size="sm"
                className="w-full sm:w-auto gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Running Diagnostics...' : 'Run Full Diagnostics'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Overall Status Banner */}
          <div className={`rounded-xl border p-4 sm:p-6 transition-colors ${overallStatus === 'operational'
            ? 'border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/10'
            : overallStatus === 'down'
              ? 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/10'
              : 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-900/50 dark:bg-yellow-950/10'
            }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className={`p-3 rounded-full shadow-sm ${overallStatus === 'operational'
                ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                : overallStatus === 'down'
                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                  : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
                }`}>
                {overallStatus === 'operational' ? (
                  <ShieldCheck className="h-8 w-8" />
                ) : overallStatus === 'down' ? (
                  <AlertTriangle className="h-8 w-8" />
                ) : (
                  <TriangleAlert className="h-8 w-8" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold mb-1">
                  {overallStatus === 'operational'
                    ? 'All Systems Operational'
                    : overallStatus === 'down'
                      ? 'Critical Issues Detected'
                      : 'Performance Degraded'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {overallStatus === 'operational'
                    ? 'All services are running smoothly. Algorithms verified.'
                    : overallStatus === 'down'
                      ? 'Immediate attention required. Some services are unavailable.'
                      : 'Some checks returned warnings. Review details below.'}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last checked: {lastRefresh.toLocaleTimeString()}
                  </p>
                  {integrityScore !== null && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      Integrity Score: {integrityScore}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Service Status Grid */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Service Health & Diagnostics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <Card key={service.name} className="overflow-hidden border shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-lg ${service.status === 'operational' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                          service.status === 'down' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                            service.status === 'degraded' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                          <Icon className="h-6 w-6" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-base">{service.name}</h4>
                            {getStatusBadge(service.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {service.message}
                          </p>
                          {service.details}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Detailed Test Results (if available) */}
          {testResults && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Algorithm Verification Log
              </h3>
              <Card className="border shadow-sm">
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                    <div className="divide-y">
                      {testResults.map((test) => (
                        <div key={test.id} className="p-4 flex items-start gap-3 border-b last:border-0">
                          <div className="mt-0.5">
                            {test.status === 'pass' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : test.status === 'fail' ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{test.name}</span>
                              <span className="text-xs text-muted-foreground">{test.executionTime}ms</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{test.description}</p>
                            {test.status !== 'pass' && (
                              <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded text-xs text-red-700 dark:text-red-300 font-mono">
                                {test.details.find(d => d.includes('FAIL')) || 'Check debug report for details'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* System Metrics */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              System Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-primary/5 border-none">
                <CardContent className="p-4 text-center">
                  <div className="text-xl sm:text-3xl font-bold text-primary">{people.length}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">Active People</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none">
                <CardContent className="p-4 text-center">
                  <div className="text-xl sm:text-3xl font-bold text-primary">{expenses.length}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">Total Expenses</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none">
                <CardContent className="p-4 text-center">
                  <div className="text-xl sm:text-3xl font-bold text-primary">{settlementPayments.length}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">Settlements</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-none">
                <CardContent className="p-4 text-center">
                  <div className="text-xl sm:text-3xl font-bold text-primary truncate">
                    {formatCurrency(expenses.reduce((sum, e) => sum + e.total_amount, 0))}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">Total Value</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
