"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bug, CheckCircle, XCircle, Zap, RefreshCw, BarChart3, Home, Users, DollarSign, Settings, FileEdit, Handshake } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { crashTestManager } from '@/lib/settleease/crashTestContext';
import type { ActiveView } from '@/lib/settleease/types';

interface TestErrorBoundaryTabProps {
  userRole: 'admin' | 'user' | null;
  setActiveView: (view: ActiveView) => void;
}

export default function TestErrorBoundaryTab({ 
  userRole,
  setActiveView
}: TestErrorBoundaryTabProps) {
  const isMobile = useIsMobile();
  const [crashStates, setCrashStates] = useState(crashTestManager.getAllStates());
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({});

  // Subscribe to crash state changes
  useEffect(() => {
    const unsubscribe = crashTestManager.subscribe(() => {
      setCrashStates(crashTestManager.getAllStates());
    });
    return unsubscribe;
  }, []);

  const toggleCrash = (componentId: keyof typeof crashStates) => {
    const newState = !crashStates[componentId];
    crashTestManager.setCrashState(componentId, newState);
    
    // Set test result based on crash state
    setTestResults(prev => ({
      ...prev,
      [componentId]: newState ? 'fail' : 'pass'
    }));
  };

  const resetAll = () => {
    crashTestManager.resetAll();
    setTestResults({});
  };

  const navigateToTab = (tabName: ActiveView) => {
    setActiveView(tabName);
  };

  const testComponents = [
    {
      id: 'analytics' as const,
      name: 'Analytics Tab',
      description: 'Crashes the real analytics charts and data visualization',
      tabName: 'analytics' as ActiveView,
      size: 'large' as const,
      riskLevel: 'high',
      icon: BarChart3
    },
    {
      id: 'dashboard' as const,
      name: 'Dashboard View',
      description: 'Crashes the real settlement calculations and expense display',
      tabName: 'dashboard' as ActiveView,
      size: 'large' as const,
      riskLevel: 'critical',
      icon: Home
    },
    {
      id: 'addExpense' as const,
      name: 'Add Expense Tab',
      description: 'Crashes the real expense form and validation logic',
      tabName: 'addExpense' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: DollarSign
    },
    {
      id: 'managePeople' as const,
      name: 'Manage People Tab',
      description: 'Crashes the real people management interface',
      tabName: 'managePeople' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: Users
    },
    {
      id: 'manageCategories' as const,
      name: 'Manage Categories Tab',
      description: 'Crashes the real category management interface',
      tabName: 'manageCategories' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: Settings
    },
    {
      id: 'editExpenses' as const,
      name: 'Edit Expenses Tab',
      description: 'Crashes the real expense editing interface',
      tabName: 'editExpenses' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: FileEdit
    },
    {
      id: 'manageSettlements' as const,
      name: 'Manage Settlements Tab',
      description: 'Crashes the real settlement management interface',
      tabName: 'manageSettlements' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: Handshake
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
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Bug className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            Test Error Boundaries
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Visually test error boundary coverage by forcing component crashes
          </p>
        </div>
        <Button onClick={resetAll} variant="outline" className="flex items-center gap-2 w-full md:w-auto">
          <RefreshCw className="h-4 w-4" />
          Reset All Tests
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Testing Instructions</AlertTitle>
        <AlertDescription>
          Click "Force Crash" to crash the actual components in the main application tabs. 
          Navigate to the respective tab to see the error boundary in action. 
          If error boundaries are working correctly, you should see a graceful error UI instead of a blank screen.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:gap-6">
        {testComponents.map((test) => {
          const IconComponent = test.icon;
          const isActive = crashStates[test.id];
          
          return (
            <Card key={test.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base md:text-lg">
                      <IconComponent className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                      <span className="break-words">{test.name}</span>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={getRiskBadgeColor(test.riskLevel)} className="text-xs">
                          {test.riskLevel} risk
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {test.size} boundary
                        </Badge>
                        {isActive && (
                          <Badge variant="destructive" className="animate-pulse text-xs">
                            CRASHING
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                    <p className="text-xs md:text-sm text-muted-foreground">{test.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                    {getTestResultIcon(testResults[test.id] || 'pending')}
                    <Button
                      onClick={() => navigateToTab(test.tabName)}
                      variant="outline"
                      size={isMobile ? "sm" : "sm"}
                      className="flex items-center gap-2 flex-1 md:flex-initial"
                      disabled={!isActive}
                    >
                      <IconComponent className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-xs md:text-sm">View Tab</span>
                    </Button>
                    <Button
                      onClick={() => toggleCrash(test.id)}
                      variant={isActive ? "destructive" : "default"}
                      size={isMobile ? "sm" : "sm"}
                      className="flex items-center gap-2 flex-1 md:flex-initial"
                    >
                      <Zap className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-xs md:text-sm">{isActive ? 'Stop Crash' : 'Force Crash'}</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-3 md:p-4">
                <div className="text-xs md:text-sm text-muted-foreground">
                  {isActive ? (
                    <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                      <XCircle className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 mt-0.5" />
                      <span>Component is currently crashing. Navigate to the tab to see the error boundary.</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 mt-0.5" />
                      <span>Component is running normally.</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
            Error Boundary Coverage Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="text-center p-3 md:p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
                  <span className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">Excellent</span>
                </div>
                <div className="text-xs md:text-sm text-green-800 dark:text-green-200">Add Expense Flow</div>
                <div className="text-xs text-muted-foreground">13 error boundaries</div>
              </div>
              <div className="text-center p-3 md:p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 md:h-6 md:w-6 text-red-600 dark:text-red-400" />
                  <span className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400">Poor</span>
                </div>
                <div className="text-xs md:text-sm text-red-800 dark:text-red-200">Analytics Components</div>
                <div className="text-xs text-muted-foreground">0 internal boundaries</div>
              </div>
              <div className="text-center p-3 md:p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-lg md:text-xl font-bold text-yellow-600 dark:text-yellow-400">Minimal</span>
                </div>
                <div className="text-xs md:text-sm text-yellow-800 dark:text-yellow-200">Dashboard Components</div>
                <div className="text-xs text-muted-foreground">Top-level only</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-xs md:text-sm text-muted-foreground">
              <p className="mb-2"><strong>Coverage Analysis:</strong></p>
              <ul className="space-y-1 list-disc list-inside pl-2">
                <li>8 main tabs have large error boundaries (App level)</li>
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