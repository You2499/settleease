"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bug, CheckCircle, Zap, RefreshCw, BarChart4, Home, Users, DollarSign, Settings, FileEdit, Handshake, Layers, Component, MousePointer, X, Sparkles, ChevronRight } from 'lucide-react';

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

  const simplifiedTransactions = calculateSimplifiedTransactions(people, expenses, settlementPayments);
  const pairwiseTransactions = calculatePairwiseTransactions(people, expenses, settlementPayments);

  useEffect(() => {
    const unsubscribe = crashTestManager.subscribe(() => {
      setCrashStates(crashTestManager.getAllStates());
    });
    return unsubscribe;
  }, []);

  const toggleCrash = (componentId: keyof typeof crashStates) => {
    const newState = !crashStates[componentId];
    crashTestManager.setCrashState(componentId, newState);
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
    { id: 'analytics' as const, name: 'Analytics Tab', description: 'Crashes analytics charts', tabName: 'analytics' as ActiveView, riskLevel: 'medium', icon: BarChart4, category: 'Tab Level' },
    { id: 'dashboard' as const, name: 'Dashboard View', description: 'Crashes settlement calculations', tabName: 'dashboard' as ActiveView, riskLevel: 'critical', icon: Home, category: 'Tab Level' },
    { id: 'addExpense' as const, name: 'Add Expense Tab', description: 'Crashes expense form', tabName: 'addExpense' as ActiveView, riskLevel: 'medium', icon: DollarSign, category: 'Tab Level' },
    { id: 'managePeople' as const, name: 'Manage People Tab', description: 'Crashes people management', tabName: 'managePeople' as ActiveView, riskLevel: 'medium', icon: Users, category: 'Tab Level' },
    { id: 'manageCategories' as const, name: 'Manage Categories Tab', description: 'Crashes category management', tabName: 'manageCategories' as ActiveView, riskLevel: 'medium', icon: Settings, category: 'Tab Level' },
    { id: 'editExpenses' as const, name: 'Edit Expenses Tab', description: 'Crashes expense editing', tabName: 'editExpenses' as ActiveView, riskLevel: 'medium', icon: FileEdit, category: 'Tab Level' },
    { id: 'manageSettlements' as const, name: 'Manage Settlements Tab', description: 'Crashes settlement management', tabName: 'manageSettlements' as ActiveView, riskLevel: 'medium', icon: Handshake, category: 'Tab Level' },
    { id: 'expenseBasicInfo' as const, name: 'Expense Basic Info', description: 'Crashes basic info section', tabName: 'addExpense' as ActiveView, riskLevel: 'medium', icon: FileEdit, category: 'Section Level' },
    { id: 'celebrationSection' as const, name: 'Celebration Section', description: 'Crashes celebration mode', tabName: 'addExpense' as ActiveView, riskLevel: 'low', icon: DollarSign, category: 'Section Level' },
    { id: 'paymentDetails' as const, name: 'Payment Details', description: 'Crashes payment details', tabName: 'addExpense' as ActiveView, riskLevel: 'high', icon: Users, category: 'Section Level' },
    { id: 'expenseGeneralInfo' as const, name: 'General Info Modal', description: 'Crashes modal general info', tabName: 'dashboard' as ActiveView, riskLevel: 'medium', icon: FileEdit, category: 'Modal Section' },
    { id: 'expensePaymentInfo' as const, name: 'Payment Info Modal', description: 'Crashes modal payment info', tabName: 'dashboard' as ActiveView, riskLevel: 'medium', icon: DollarSign, category: 'Modal Section' },
    { id: 'descriptionInput' as const, name: 'Description Input', description: 'Crashes description field', tabName: 'addExpense' as ActiveView, riskLevel: 'low', icon: FileEdit, category: 'Input Field' },
    { id: 'amountInput' as const, name: 'Amount Input', description: 'Crashes amount field', tabName: 'addExpense' as ActiveView, riskLevel: 'medium', icon: DollarSign, category: 'Input Field' },
    { id: 'categorySelect' as const, name: 'Category Select', description: 'Crashes category dropdown', tabName: 'addExpense' as ActiveView, riskLevel: 'low', icon: Settings, category: 'Input Field' },
    { id: 'datePicker' as const, name: 'Date Picker', description: 'Crashes date picker', tabName: 'addExpense' as ActiveView, riskLevel: 'low', icon: BarChart4, category: 'Input Field' },
    { id: 'celebrationPayerSelect' as const, name: 'Celebration Payer', description: 'Crashes payer selection', tabName: 'addExpense' as ActiveView, riskLevel: 'low', icon: Users, category: 'Input Field' },
    { id: 'celebrationAmountInput' as const, name: 'Celebration Amount', description: 'Crashes celebration amount', tabName: 'addExpense' as ActiveView, riskLevel: 'low', icon: DollarSign, category: 'Input Field' }
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

  const groupedComponents = testComponents.reduce((acc, component) => {
    const category = component.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(component);
    return acc;
  }, {} as Record<string, typeof testComponents>);

  const isLoading = !isDataFetchedAtLeastOnce || isLoadingPeople || isLoadingExpenses || isLoadingCategories || isLoadingSettlements;

  if (isLoading) {
    return (
      <Card className="shadow-lg rounded-lg h-full flex flex-col bg-background">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <Skeleton className="h-7 sm:h-8 w-48" />
          <Skeleton className="h-4 w-full max-w-[300px] mt-2" />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 py-4 space-y-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="rounded-lg border p-3">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

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
    <>
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6 pb-4 border-b">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
            <Bug className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Test Error Boundaries
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Test error boundary coverage by forcing component crashes.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Action Buttons */}
          <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
            <div className="flex flex-col gap-2">
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
                className="w-full gap-2"
              >
                <BarChart4 className="h-4 w-4" />
                {isMobile ? 'Debug Panel' : (showComprehensiveDebug ? 'Hide Debug' : 'Debug Panel')}
              </Button>
              <Button onClick={resetAll} variant="outline" size="sm" className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Reset All
              </Button>
              <Dialog open={showPromptEditor} onOpenChange={setShowPromptEditor}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full gap-2">
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

          {/* Mobile Debug Sheet */}
          {isMobile && isDebugSheetOpen && (
            <div className="fixed inset-0 z-50 bg-background">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
                  <h2 className="text-lg font-semibold">Comprehensive Debug</h2>
                  <Button variant="ghost" size="icon" onClick={() => setIsDebugSheetOpen(false)}>
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

          {/* Desktop Debug */}
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

          {/* Algorithm Verification */}
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
              Click "Crash" to simulate failures. Navigate to the target tab to see error boundaries.
            </AlertDescription>
          </Alert>

          {/* Test Components List */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full rounded-md border bg-background">
              <div className="p-3 sm:p-4 space-y-4">
                {Object.entries(groupedComponents).map(([category, components]) => {
                  const CategoryIcon = getCategoryIcon(category);
                  const activeCrashCount = components.filter(c => crashStates[c.id]).length;

                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4 text-primary flex-shrink-0" />
                        <h4 className="text-sm font-semibold text-primary">{category}</h4>
                        {activeCrashCount > 0 && (
                          <Badge variant="destructive" className="text-[10px] animate-pulse">
                            {activeCrashCount}
                          </Badge>
                        )}
                      </div>

                      <ul className="space-y-1.5">
                        {components.map((test) => {
                          const IconComponent = test.icon;
                          const isActive = crashStates[test.id];

                          return (
                            <li
                              key={test.id}
                              className={`p-2.5 rounded-md transition-colors ${isActive
                                  ? 'bg-destructive/10 border border-destructive/30'
                                  : 'bg-card/70'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <IconComponent className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-destructive' : 'text-muted-foreground'}`} />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-medium text-xs truncate">{test.name}</span>
                                      {isActive && (
                                        <Badge variant="destructive" className="text-[9px] px-1 py-0 animate-pulse">
                                          CRASH
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Button
                                    onClick={() => navigateToTab(test.tabName)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[10px]"
                                    disabled={!isActive}
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    onClick={() => toggleCrash(test.id)}
                                    variant={isActive ? "destructive" : "default"}
                                    size="sm"
                                    className="h-7 px-2 text-[10px]"
                                  >
                                    {isActive ? 'Stop' : 'Crash'}
                                  </Button>
                                </div>
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
    </>
  );
}