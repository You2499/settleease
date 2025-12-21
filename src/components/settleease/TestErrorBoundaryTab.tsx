"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bug, CheckCircle, XCircle, Zap, RefreshCw, BarChart4, Home, Users, DollarSign, Settings, FileEdit, Handshake, Layers, Component, MousePointer, X, Sparkles, ChevronRight } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { crashTestManager } from '@/lib/settleease/crashTestContext';
import ComprehensiveDebug from './dashboard/verification/ComprehensiveDebug';
import AlgorithmVerification from './dashboard/verification/AlgorithmVerification';
import PromptEditor from './dashboard/verification/PromptEditor';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { ActiveView, Person, Expense, Category, SettlementPayment, ManualSettlementOverride } from '@/lib/settleease/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateSimplifiedTransactions, calculatePairwiseTransactions } from '@/lib/settleease/settlementCalculations';

interface TestErrorBoundaryTabProps {
  userRole: 'admin' | 'user' | null;
  setActiveView: (view: ActiveView) => void;
  people: Person[];
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  manualOverrides: ManualSettlementOverride[];
  peopleMap: Record<string, string>;
  categories: Category[];
  db?: SupabaseClient;
  currentUserId?: string;
  isLoadingPeople?: boolean;
  isLoadingExpenses?: boolean;
  isLoadingCategories?: boolean;
  isLoadingSettlements?: boolean;
  isLoadingOverrides?: boolean;
  isDataFetchedAtLeastOnce?: boolean;
}

export default function TestErrorBoundaryTab({
  userRole,
  setActiveView,
  people,
  expenses,
  settlementPayments,
  manualOverrides,
  peopleMap,
  categories,
  db,
  currentUserId,
  isLoadingPeople = false,
  isLoadingExpenses = false,
  isLoadingCategories = false,
  isLoadingSettlements = false,
  isLoadingOverrides = false,
  isDataFetchedAtLeastOnce = true,
}: TestErrorBoundaryTabProps) {
  const isMobile = useIsMobile();
  const [crashStates, setCrashStates] = useState(crashTestManager.getAllStates());
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({});
  const [showComprehensiveDebug, setShowComprehensiveDebug] = useState(false);
  const [isDebugSheetOpen, setIsDebugSheetOpen] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // Calculate transactions for AlgorithmVerification
  const simplifiedTransactions = calculateSimplifiedTransactions(people, expenses, settlementPayments);
  const pairwiseTransactions = calculatePairwiseTransactions(people, expenses, settlementPayments);

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
    // Large (Tab-level) Error Boundaries
    {
      id: 'analytics' as const,
      name: 'Analytics Tab',
      description: 'Crashes the analytics charts and data visualization',
      tabName: 'analytics' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: BarChart4,
      category: 'Tab Level'
    },
    {
      id: 'dashboard' as const,
      name: 'Dashboard View',
      description: 'Crashes settlement calculations and expense display',
      tabName: 'dashboard' as ActiveView,
      size: 'large' as const,
      riskLevel: 'critical',
      icon: Home,
      category: 'Tab Level'
    },
    {
      id: 'addExpense' as const,
      name: 'Add Expense Tab',
      description: 'Crashes the expense form and validation logic',
      tabName: 'addExpense' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: DollarSign,
      category: 'Tab Level'
    },
    {
      id: 'managePeople' as const,
      name: 'Manage People Tab',
      description: 'Crashes the people management interface',
      tabName: 'managePeople' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: Users,
      category: 'Tab Level'
    },
    {
      id: 'manageCategories' as const,
      name: 'Manage Categories Tab',
      description: 'Crashes the category management interface',
      tabName: 'manageCategories' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: Settings,
      category: 'Tab Level'
    },
    {
      id: 'editExpenses' as const,
      name: 'Edit Expenses Tab',
      description: 'Crashes the expense editing interface',
      tabName: 'editExpenses' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: FileEdit,
      category: 'Tab Level'
    },
    {
      id: 'manageSettlements' as const,
      name: 'Manage Settlements Tab',
      description: 'Crashes the settlement management interface',
      tabName: 'manageSettlements' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: Handshake,
      category: 'Tab Level'
    },

    // Medium (Section-level) Error Boundaries
    {
      id: 'expenseBasicInfo' as const,
      name: 'Expense Basic Info Section',
      description: 'Crashes the expense basic information section',
      tabName: 'addExpense' as ActiveView,
      size: 'medium' as const,
      riskLevel: 'medium',
      icon: FileEdit,
      category: 'Section Level'
    },
    {
      id: 'celebrationSection' as const,
      name: 'Celebration Section',
      description: 'Crashes the celebration mode section',
      tabName: 'addExpense' as ActiveView,
      size: 'medium' as const,
      riskLevel: 'low',
      icon: DollarSign,
      category: 'Section Level'
    },
    {
      id: 'paymentDetails' as const,
      name: 'Payment Details Section',
      description: 'Crashes the payment details section',
      tabName: 'addExpense' as ActiveView,
      size: 'medium' as const,
      riskLevel: 'high',
      icon: Users,
      category: 'Section Level'
    },
    {
      id: 'expenseGeneralInfo' as const,
      name: 'Expense General Info',
      description: 'Crashes general info in expense detail modal',
      tabName: 'dashboard' as ActiveView,
      size: 'medium' as const,
      riskLevel: 'medium',
      icon: FileEdit,
      category: 'Modal Section'
    },
    {
      id: 'expensePaymentInfo' as const,
      name: 'Expense Payment Info',
      description: 'Crashes payment info in expense detail modal',
      tabName: 'dashboard' as ActiveView,
      size: 'medium' as const,
      riskLevel: 'medium',
      icon: DollarSign,
      category: 'Modal Section'
    },

    // Small (Component-level) Error Boundaries
    {
      id: 'descriptionInput' as const,
      name: 'Description Input',
      description: 'Crashes the description input field',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'low',
      icon: FileEdit,
      category: 'Input Field'
    },
    {
      id: 'amountInput' as const,
      name: 'Amount Input',
      description: 'Crashes the amount input field',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'medium',
      icon: DollarSign,
      category: 'Input Field'
    },
    {
      id: 'categorySelect' as const,
      name: 'Category Select',
      description: 'Crashes the category selection dropdown',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'low',
      icon: Settings,
      category: 'Input Field'
    },
    {
      id: 'datePicker' as const,
      name: 'Date Picker',
      description: 'Crashes the date picker component',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'low',
      icon: BarChart4,
      category: 'Input Field'
    },
    {
      id: 'celebrationPayerSelect' as const,
      name: 'Celebration Payer Select',
      description: 'Crashes the celebration payer selection',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'low',
      icon: Users,
      category: 'Input Field'
    },
    {
      id: 'celebrationAmountInput' as const,
      name: 'Celebration Amount Input',
      description: 'Crashes the celebration amount input',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'low',
      icon: DollarSign,
      category: 'Input Field'
    }
  ];

  const getRiskBadgeVariant = (risk?: string): "destructive" | "secondary" | "outline" => {
    switch (risk) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Tab Level': return Layers;
      case 'Section Level': return Component;
      case 'Modal Section': return Component;
      case 'Input Field': return MousePointer;
      default: return Layers;
    }
  };

  // Group components by category
  const groupedComponents = testComponents.reduce((acc, component) => {
    const category = component.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(component);
    return acc;
  }, {} as Record<string, typeof testComponents>);

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case 'Tab Level': return 'Large boundaries protecting entire application tabs';
      case 'Section Level': return 'Medium boundaries protecting major sections';
      case 'Modal Section': return 'Medium boundaries protecting modal sections';
      case 'Input Field': return 'Small boundaries protecting individual inputs';
      default: return '';
    }
  };

  // Show loading skeleton while data is being fetched
  const isLoading = !isDataFetchedAtLeastOnce || isLoadingPeople || isLoadingExpenses || isLoadingCategories || isLoadingSettlements;

  if (isLoading) {
    return (
      <Card className="shadow-lg rounded-lg h-full flex flex-col bg-background">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <Skeleton className="h-7 sm:h-8 w-full max-w-[200px] sm:w-56" />
          <Skeleton className="h-4 w-full sm:w-96 mt-2" />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Action buttons skeleton */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton className="h-9 w-full sm:w-28" />
            <Skeleton className="h-9 w-full sm:w-32" />
            <Skeleton className="h-9 w-full sm:w-28" />
          </div>

          {/* Alert skeleton */}
          <div className="rounded-lg border p-3 sm:p-4">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>

          {/* Category groups skeleton */}
          {[1, 2, 3].map((groupIndex) => (
            <div key={groupIndex} className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="h-5 w-5" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Show access restriction only when NOT loading
  if (!isLoading && userRole !== 'admin') {
    return (
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6 pb-4 border-b">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold text-destructive">
            <AlertTriangle className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
            Access Restricted
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 sm:p-6">
          <p className="text-sm sm:text-base">Error boundary testing is only available to administrators.</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Please contact an administrator for access.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-lg h-full flex flex-col overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <Bug className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Test Error Boundaries
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Test error boundary coverage by forcing component crashes across the application.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Action Buttons Section */}
        <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => {
                  if (isMobile) {
                    setIsDebugSheetOpen(true)
                  } else {
                    setShowComprehensiveDebug((s) => !s)
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto gap-2"
              >
                <BarChart4 className="h-4 w-4" />
                {isMobile ? 'Debug Panel' : (showComprehensiveDebug ? 'Hide Debug' : 'Debug Panel')}
              </Button>
              <Button onClick={resetAll} variant="outline" size="sm" className="w-full sm:w-auto gap-2">
                <RefreshCw className="h-4 w-4" />
                Reset All
              </Button>
            </div>

            <Dialog open={showPromptEditor} onOpenChange={setShowPromptEditor}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Config
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar">
                {db && <PromptEditor db={db} currentUserId={currentUserId || 'admin'} />}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Mobile: Debug in full screen */}
        {isMobile && isDebugSheetOpen && (
          <div className="fixed inset-0 z-50 bg-background">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold">Comprehensive Debug</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDebugSheetOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ComprehensiveDebug
                  people={people}
                  expenses={expenses}
                  settlementPayments={settlementPayments}
                  manualOverrides={manualOverrides}
                  peopleMap={peopleMap}
                  categories={categories}
                  userRole={userRole}
                  isInSheet={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Desktop: Debug inline */}
        {!isMobile && showComprehensiveDebug && (
          <ComprehensiveDebug
            people={people}
            expenses={expenses}
            settlementPayments={settlementPayments}
            manualOverrides={manualOverrides}
            peopleMap={peopleMap}
            categories={categories}
            userRole={userRole}
          />
        )}

        {/* Algorithm Verification Section */}
        <AlgorithmVerification
          people={people}
          expenses={expenses}
          settlementPayments={settlementPayments}
          manualOverrides={manualOverrides}
          peopleMap={peopleMap}
          uiSimplifiedTransactions={simplifiedTransactions}
          uiPairwiseTransactions={pairwiseTransactions}
          db={db}
          currentUserId={currentUserId}
        />

        {/* Testing Instructions */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">Testing Instructions</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">
            Click "Force Crash" to simulate component failures. Navigate to the target tab to see error boundaries in action.
          </AlertDescription>
        </Alert>

        {/* Test Components List */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full rounded-md border bg-background">
            <div className="p-2 sm:p-4 space-y-6 max-w-full overflow-hidden">
              {Object.entries(groupedComponents).map(([category, components]) => {
                const CategoryIcon = getCategoryIcon(category);
                const activeCrashCount = components.filter(c => crashStates[c.id]).length;

                return (
                  <div key={category} className="space-y-3">
                    {/* Category Header */}
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      <h4 className="text-md sm:text-lg font-semibold text-primary">{category}</h4>
                      {activeCrashCount > 0 && (
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          {activeCrashCount} active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground -mt-1 mb-2">
                      {getCategoryDescription(category)}
                    </p>

                    {/* Test Items */}
                    <ul className="space-y-1.5 sm:space-y-2">
                      {components.map((test) => {
                        const IconComponent = test.icon;
                        const isActive = crashStates[test.id];

                        return (
                          <li
                            key={test.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 rounded-md shadow-sm transition-colors group ${isActive
                              ? 'bg-destructive/10 border border-destructive/30'
                              : 'bg-card/70 hover:bg-card/90'
                              }`}
                          >
                            <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0 mb-2 sm:mb-0 overflow-hidden">
                              <div className={`p-1.5 rounded-md flex-shrink-0 ${isActive ? 'bg-destructive/20' : 'bg-muted'}`}>
                                <IconComponent className={`h-4 w-4 ${isActive ? 'text-destructive' : 'text-muted-foreground'}`} />
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-medium text-sm truncate max-w-[120px] sm:max-w-none">{test.name}</span>
                                  <Badge variant={getRiskBadgeVariant(test.riskLevel)} className="text-[10px] px-1.5 py-0 flex-shrink-0">
                                    {test.riskLevel}
                                  </Badge>
                                  {isActive && (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse gap-1 flex-shrink-0">
                                      <Zap className="h-2.5 w-2.5" />
                                      CRASH
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{test.description}</p>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 sm:gap-2 pl-8 sm:pl-0 flex-shrink-0">
                              {isActive ? (
                                <CheckCircle className="h-4 w-4 text-green-600 hidden sm:block" />
                              ) : (
                                <span className="hidden sm:block w-4" />
                              )}
                              <Button
                                onClick={() => navigateToTab(test.tabName)}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 sm:px-3 text-xs gap-1"
                                disabled={!isActive}
                              >
                                <ChevronRight className="h-3 w-3" />
                                View
                              </Button>
                              <Button
                                onClick={() => toggleCrash(test.id)}
                                variant={isActive ? "destructive" : "default"}
                                size="sm"
                                className="h-8 px-2 sm:px-3 text-xs gap-1"
                              >
                                <Zap className="h-3 w-3" />
                                {isActive ? 'Stop' : 'Crash'}
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}