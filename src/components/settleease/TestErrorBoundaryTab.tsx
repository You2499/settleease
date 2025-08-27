"use client";

import React, { useState } from 'react';
import { AlertTriangle, Bug, CheckCircle, XCircle, Zap, RefreshCw, BarChart3, Home, Users, DollarSign } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

// Import actual components to crash
import AnalyticsTab from '@/components/settleease/AnalyticsTab';
import DashboardView from '@/components/settleease/DashboardView';
import AddExpenseTab from '@/components/settleease/AddExpenseTab';
import ManagePeopleTab from '@/components/settleease/ManagePeopleTab';
import SettleEaseErrorBoundary from '@/components/ui/SettleEaseErrorBoundary';

interface TestErrorBoundaryTabProps {
  userRole: 'admin' | 'user' | null;
  // Props needed to render actual components
  expenses?: any[];
  people?: any[];
  peopleMap?: Record<string, string>;
  categories?: any[];
  settlementPayments?: any[];
  db?: any;
  currentUserId?: string;
  getCategoryIconFromName?: (iconName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  onActionComplete?: () => void;
}

export default function TestErrorBoundaryTab({ 
  userRole, 
  expenses = [], 
  people = [], 
  peopleMap = {}, 
  categories = [], 
  settlementPayments = [], 
  db, 
  currentUserId = '', 
  getCategoryIconFromName,
  onActionComplete 
}: TestErrorBoundaryTabProps) {
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

  // Default fallback function for getCategoryIconFromName
  const defaultGetCategoryIcon = (iconName: string) => {
    return () => React.createElement('div', { className: 'w-4 h-4 bg-gray-400 rounded' });
  };

  // Default fallback function for onActionComplete
  const defaultOnActionComplete = () => {
    console.log('Action completed in test environment');
  };

  // Create wrapper components that crash when needed
  const CrashableAnalyticsTab = ({ shouldCrash }: { shouldCrash: boolean }) => {
    if (shouldCrash) {
      throw new Error('Analytics Tab crashed: Invalid data processing in chart rendering');
    }
    return (
      <AnalyticsTab
        expenses={expenses}
        people={people}
        peopleMap={peopleMap}
        dynamicCategories={categories}
        getCategoryIconFromName={getCategoryIconFromName || defaultGetCategoryIcon}
      />
    );
  };

  const CrashableDashboardView = ({ shouldCrash }: { shouldCrash: boolean }) => {
    if (shouldCrash) {
      throw new Error('Dashboard View crashed: Settlement calculation failed with invalid expense data');
    }
    return (
      <DashboardView
        expenses={expenses}
        people={people}
        peopleMap={peopleMap}
        dynamicCategories={categories}
        getCategoryIconFromName={getCategoryIconFromName || defaultGetCategoryIcon}
        settlementPayments={settlementPayments}
        db={db}
        currentUserId={currentUserId}
        onActionComplete={onActionComplete || defaultOnActionComplete}
        userRole={userRole}
      />
    );
  };

  const CrashableAddExpenseTab = ({ shouldCrash }: { shouldCrash: boolean }) => {
    if (shouldCrash) {
      throw new Error('Add Expense Tab crashed: Form validation failed with corrupted category data');
    }
    return (
      <AddExpenseTab
        people={people}
        db={db}
        supabaseInitializationError={null}
        onExpenseAdded={onActionComplete || defaultOnActionComplete}
        dynamicCategories={categories}
      />
    );
  };

  const CrashableManagePeopleTab = ({ shouldCrash }: { shouldCrash: boolean }) => {
    if (shouldCrash) {
      throw new Error('Manage People Tab crashed: Database connection lost during people management operation');
    }
    return (
      <ManagePeopleTab
        people={people}
        db={db}
        supabaseInitializationError={null}
      />
    );
  };

  const testComponents = [
    {
      id: 'analytics-tab',
      name: 'Analytics Tab',
      description: 'Tests actual analytics charts and data visualization',
      component: CrashableAnalyticsTab,
      size: 'large' as const,
      riskLevel: 'high',
      icon: BarChart3
    },
    {
      id: 'dashboard-view',
      name: 'Dashboard View',
      description: 'Tests settlement calculations and expense display',
      component: CrashableDashboardView,
      size: 'large' as const,
      riskLevel: 'critical',
      icon: Home
    },
    {
      id: 'add-expense-tab',
      name: 'Add Expense Tab',
      description: 'Tests expense form and validation logic',
      component: CrashableAddExpenseTab,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: DollarSign
    },
    {
      id: 'manage-people-tab',
      name: 'Manage People Tab',
      description: 'Tests people management interface',
      component: CrashableManagePeopleTab,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: Users
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
          const IconComponent = test.icon;
          
          return (
            <Card key={test.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5" />
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
                  <div className="max-h-96 overflow-hidden">
                    <TestComponent shouldCrash={crashStates[test.id] || false} />
                  </div>
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