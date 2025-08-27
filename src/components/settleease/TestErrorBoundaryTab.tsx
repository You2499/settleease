"use client";

import React, { useState } from 'react';
import { AlertTriangle, Bug, CheckCircle, XCircle, Zap, RefreshCw, BarChart3, Calculator } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SettleEaseErrorBoundary from '@/components/ui/SettleEaseErrorBoundary';

// Test components that can be made to crash
const CrashableComponent = ({ shouldCrash, componentName }: { shouldCrash: boolean; componentName: string }) => {
  if (shouldCrash) {
    throw new Error(`Intentional crash in ${componentName} for testing error boundary`);
  }
  
  return (
    <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        <span className="text-green-800 dark:text-green-200 font-medium">{componentName} is working correctly</span>
      </div>
    </div>
  );
};

const AnalyticsChartSimulator = ({ shouldCrash, componentName }: { shouldCrash: boolean; componentName: string }) => {
  if (shouldCrash) {
    throw new Error(`Chart rendering failed in ${componentName} - invalid data format`);
  }
  
  return (
    <div className="h-32 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg flex items-center justify-center">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <span className="text-blue-800 dark:text-blue-200 font-medium">Mock Analytics Chart</span>
      </div>
    </div>
  );
};

const SettlementCalculatorSimulator = ({ shouldCrash, componentName }: { shouldCrash: boolean; componentName: string }) => {
  if (shouldCrash) {
    throw new Error(`Settlement calculation failed in ${componentName} - division by zero`);
  }
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
        <span>Alice owes Bob</span>
        <span className="font-mono">$25.00</span>
      </div>
      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
        <span>Charlie owes Alice</span>
        <span className="font-mono">$15.50</span>
      </div>
    </div>
  );
};

interface TestErrorBoundaryTabProps {
  userRole: 'admin' | 'user' | null;
}

export default function TestErrorBoundaryTab({ userRole }: TestErrorBoundaryTabProps) {
  const [crashStates, setCrashStates] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({});

  const toggleCrash = (componentId: string) => {
    setCrashStates(prev => ({
      ...prev,
      [componentId]: !prev[componentId]
    }));
    
    // Set test result based on crash state
    setTestResults(prev => ({
      ...prev,
      [componentId]: !crashStates[componentId] ? 'fail' : 'pass'
    }));
  };

  const resetAll = () => {
    setCrashStates({});
    setTestResults({});
  };

  const testComponents = [
    {
      id: 'analytics-chart',
      name: 'Analytics Chart',
      description: 'Simulates complex data visualization components',
      component: AnalyticsChartSimulator,
      size: 'small' as const,
      riskLevel: 'high'
    },
    {
      id: 'settlement-calculator',
      name: 'Settlement Calculator',
      description: 'Simulates critical business logic calculations',
      component: SettlementCalculatorSimulator,
      size: 'medium' as const,
      riskLevel: 'critical'
    },
    {
      id: 'dashboard-widget',
      name: 'Dashboard Widget',
      description: 'Simulates dashboard component rendering',
      component: CrashableComponent,
      size: 'small' as const,
      riskLevel: 'medium'
    },
    {
      id: 'expense-form',
      name: 'Expense Form Section',
      description: 'Simulates form input components',
      component: CrashableComponent,
      size: 'medium' as const,
      riskLevel: 'medium'
    }
  ];

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'outline';
    }
  };

  const getTestResultIcon = (result: 'pass' | 'fail' | 'pending') => {
    switch (result) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <RefreshCw className="h-4 w-4 text-gray-400" />;
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            Error boundary testing is only available to administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bug className="h-8 w-8 text-primary" />
            Test Error Boundaries
          </h1>
          <p className="text-muted-foreground mt-2">
            Visually test error boundary coverage by forcing component crashes
          </p>
        </div>
        <Button onClick={resetAll} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Reset All Tests
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Testing Instructions</AlertTitle>
        <AlertDescription>
          Click "Force Crash" to simulate component failures. If error boundaries are working correctly, 
          you should see a graceful error UI instead of a blank screen or app crash.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {testComponents.map((test) => {
          const TestComponent = test.component;
          
          return (
            <Card key={test.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {test.name}
                      <Badge variant={getRiskBadgeColor(test.riskLevel)}>
                        {test.riskLevel} risk
                      </Badge>
                      <Badge variant="outline">
                        {test.size} boundary
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{test.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTestResultIcon(testResults[test.id] || 'pending')}
                    <Button
                      onClick={() => toggleCrash(test.id)}
                      variant={crashStates[test.id] ? "destructive" : "default"}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      {crashStates[test.id] ? 'Stop Crash' : 'Force Crash'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-6">
                <SettleEaseErrorBoundary 
                  componentName={test.name} 
                  size={test.size}
                  onNavigateHome={() => {
                    // Reset this specific test
                    setCrashStates(prev => ({ ...prev, [test.id]: false }));
                    setTestResults(prev => ({ ...prev, [test.id]: 'pass' }));
                  }}
                >
                  <TestComponent 
                    shouldCrash={crashStates[test.id] || false} 
                    componentName={test.name}
                  />
                </SettleEaseErrorBoundary>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Error Boundary Coverage Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">Excellent</span>
                </div>
                <div className="text-sm text-green-800 dark:text-green-200">Add Expense Flow</div>
                <div className="text-xs text-muted-foreground">13 error boundaries</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  <span className="text-xl font-bold text-red-600 dark:text-red-400">Poor</span>
                </div>
                <div className="text-sm text-red-800 dark:text-red-200">Analytics Components</div>
                <div className="text-xs text-muted-foreground">0 internal boundaries</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">Minimal</span>
                </div>
                <div className="text-sm text-yellow-800 dark:text-yellow-200">Dashboard Components</div>
                <div className="text-xs text-muted-foreground">Top-level only</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-sm text-muted-foreground">
              <p className="mb-2"><strong>Coverage Analysis:</strong></p>
              <ul className="space-y-1 list-disc list-inside">
                <li>7 main tabs have large error boundaries (App level)</li>
                <li>AddExpense flow has comprehensive multi-level protection</li>
                <li>Analytics and Dashboard components lack internal error boundaries</li>
                <li>Management features rely solely on top-level boundaries</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}