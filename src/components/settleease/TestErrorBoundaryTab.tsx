"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bug, CheckCircle, XCircle, Zap, RefreshCw, BarChart4, Home, Users, DollarSign, Settings, FileEdit, Handshake, Shield, Layers, Component, MousePointer } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { crashTestManager } from '@/lib/settleease/crashTestContext';
import ComprehensiveDebug from './dashboard/verification/ComprehensiveDebug';
import type { ActiveView, Person, Expense, Category, SettlementPayment } from '@/lib/settleease/types';

interface TestErrorBoundaryTabProps {
  userRole: 'admin' | 'user' | null;
  setActiveView: (view: ActiveView) => void;
  people: Person[];
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  peopleMap: Record<string, string>;
  categories: Category[];
}

export default function TestErrorBoundaryTab({
  userRole,
  setActiveView,
  people,
  expenses,
  settlementPayments,
  peopleMap,
  categories
}: TestErrorBoundaryTabProps) {
  const isMobile = useIsMobile();
  const [crashStates, setCrashStates] = useState(crashTestManager.getAllStates());
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({});
  const [showComprehensiveDebug, setShowComprehensiveDebug] = useState(false);
  const [isDebugSheetOpen, setIsDebugSheetOpen] = useState(false);

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
      description: 'Crashes the real analytics charts and data visualization',
      tabName: 'analytics' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: BarChart4,
      category: 'Tab Level'
    },
    {
      id: 'dashboard' as const,
      name: 'Dashboard View',
      description: 'Crashes the real settlement calculations and expense display',
      tabName: 'dashboard' as ActiveView,
      size: 'large' as const,
      riskLevel: 'critical',
      icon: Home,
      category: 'Tab Level'
    },
    {
      id: 'addExpense' as const,
      name: 'Add Expense Tab',
      description: 'Crashes the real expense form and validation logic',
      tabName: 'addExpense' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: DollarSign,
      category: 'Tab Level'
    },
    {
      id: 'managePeople' as const,
      name: 'Manage People Tab',
      description: 'Crashes the real people management interface',
      tabName: 'managePeople' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: Users,
      category: 'Tab Level'
    },
    {
      id: 'manageCategories' as const,
      name: 'Manage Categories Tab',
      description: 'Crashes the real category management interface',
      tabName: 'manageCategories' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: Settings,
      category: 'Tab Level'
    },
    {
      id: 'editExpenses' as const,
      name: 'Edit Expenses Tab',
      description: 'Crashes the real expense editing interface',
      tabName: 'editExpenses' as ActiveView,
      size: 'large' as const,
      riskLevel: 'medium',
      icon: FileEdit,
      category: 'Tab Level'
    },
    {
      id: 'manageSettlements' as const,
      name: 'Manage Settlements Tab',
      description: 'Crashes the real settlement management interface',
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
      description: 'Crashes the expense basic information section in Add Expense',
      tabName: 'addExpense' as ActiveView,
      size: 'medium' as const,
      riskLevel: 'medium',
      icon: FileEdit,
      category: 'Section Level'
    },
    {
      id: 'celebrationSection' as const,
      name: 'Celebration Section',
      description: 'Crashes the celebration mode section in Add Expense',
      tabName: 'addExpense' as ActiveView,
      size: 'medium' as const,
      riskLevel: 'low',
      icon: DollarSign,
      category: 'Section Level'
    },
    {
      id: 'paymentDetails' as const,
      name: 'Payment Details Section',
      description: 'Crashes the payment details section in Add Expense',
      tabName: 'addExpense' as ActiveView,
      size: 'medium' as const,
      riskLevel: 'high',
      icon: Users,
      category: 'Section Level'
    },
    {
      id: 'expenseGeneralInfo' as const,
      name: 'Expense General Info',
      description: 'Crashes the general info section in expense detail modal',
      tabName: 'dashboard' as ActiveView,
      size: 'medium' as const,
      riskLevel: 'medium',
      icon: FileEdit,
      category: 'Modal Section'
    },
    {
      id: 'expensePaymentInfo' as const,
      name: 'Expense Payment Info',
      description: 'Crashes the payment info section in expense detail modal',
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
      description: 'Crashes the description input field in Add Expense',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'low',
      icon: FileEdit,
      category: 'Input Field'
    },
    {
      id: 'amountInput' as const,
      name: 'Amount Input',
      description: 'Crashes the amount input field in Add Expense',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'medium',
      icon: DollarSign,
      category: 'Input Field'
    },
    {
      id: 'categorySelect' as const,
      name: 'Category Select',
      description: 'Crashes the category selection dropdown in Add Expense',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'low',
      icon: Settings,
      category: 'Input Field'
    },
    {
      id: 'datePicker' as const,
      name: 'Date Picker',
      description: 'Crashes the date picker component in Add Expense',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'low',
      icon: BarChart4,
      category: 'Input Field'
    },
    {
      id: 'celebrationPayerSelect' as const,
      name: 'Celebration Payer Select',
      description: 'Crashes the celebration payer selection in Add Expense',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'low',
      icon: Users,
      category: 'Input Field'
    },
    {
      id: 'celebrationAmountInput' as const,
      name: 'Celebration Amount Input',
      description: 'Crashes the celebration amount input in Add Expense',
      tabName: 'addExpense' as ActiveView,
      size: 'small' as const,
      riskLevel: 'low',
      icon: DollarSign,
      category: 'Input Field'
    }
  ];

  const getRiskBadgeColor = (risk?: string) => {
    switch (risk) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Tab Level': return Layers;
      case 'Section Level': return Component;
      case 'Modal Section': return Component;
      case 'Input Field': return MousePointer;
      default: return Shield;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Tab Level': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
      case 'Section Level': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800';
      case 'Modal Section': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
      case 'Input Field': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800';
      default: return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800';
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

  const getTestResultIcon = (result: 'pass' | 'fail' | 'pending') => {
    switch (result) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <RefreshCw className="h-4 w-4 text-gray-400" />;
    }
  };

  if (userRole !== 'admin') {
    return (
      <Card className="shadow-xl rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6">
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
    <Card className="shadow-xl rounded-lg h-full flex flex-col">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
              <Bug className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Test Error Boundaries
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Visually test error boundary coverage by forcing component crashes
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
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
              className="flex items-center gap-2 flex-1 sm:flex-initial"
            >
              <BarChart4 className="h-4 w-4" />
              {isMobile ? 'Show Debug' : (showComprehensiveDebug ? 'Hide Debug' : 'Show Debug')}
            </Button>
            <Button onClick={resetAll} variant="outline" size="sm" className="flex items-center gap-2 flex-1 sm:flex-initial">
              <RefreshCw className="h-4 w-4" />
              Reset All Tests
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pt-4 sm:pt-6">
        {/* Mobile: Debug in a bottom sheet */}
        {isMobile && (
          <Sheet open={isDebugSheetOpen} onOpenChange={setIsDebugSheetOpen}>
            <SheetContent side="bottom" className="w-full max-w-full p-0">
              <SheetHeader className="px-4 pt-4">
                <SheetTitle>Comprehensive Debug</SheetTitle>
              </SheetHeader>
              <div className="h-[80vh] flex flex-col p-4 pt-2">
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <ComprehensiveDebug
                    people={people}
                    expenses={expenses}
                    settlementPayments={settlementPayments}
                    peopleMap={peopleMap}
                    categories={categories}
                    userRole={userRole}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Desktop: Debug inline */}
        {!isMobile && showComprehensiveDebug && (
          <div className="mb-6">
            <ComprehensiveDebug
              people={people}
              expenses={expenses}
              settlementPayments={settlementPayments}
              peopleMap={peopleMap}
              categories={categories}
              userRole={userRole}
            />
          </div>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Testing Instructions</AlertTitle>
          <AlertDescription>
            Click "Force Crash" to crash the actual components in the main application tabs.
            Navigate to the respective tab to see the error boundary in action.
            If error boundaries are working correctly, you should see a graceful error UI instead of a blank screen.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 sm:space-y-6">
          {Object.entries(groupedComponents).map(([category, components]) => {
            const CategoryIcon = getCategoryIcon(category);
            const categoryColor = getCategoryColor(category);

            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${categoryColor}`}>
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold">{category} Error Boundaries</h2>
                    <p className="text-sm text-muted-foreground">
                      {category === 'Tab Level' && 'Large boundaries that protect entire application tabs'}
                      {category === 'Section Level' && 'Medium boundaries that protect major sections within tabs'}
                      {category === 'Modal Section' && 'Medium boundaries that protect sections within modals'}
                      {category === 'Input Field' && 'Small boundaries that protect individual input components'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:gap-6">
                  {components.map((test) => {
                    const IconComponent = test.icon;
                    const isActive = crashStates[test.id];

                    return (
                      <Card key={test.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
                        <CardHeader className="pb-3">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-2">
                              <CardTitle className="flex flex-wrap items-center gap-2 text-base md:text-lg">
                                <IconComponent className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                                <span className="break-words">{test.name}</span>
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant={getRiskBadgeColor(test.riskLevel)} className="text-xs">
                                    {test.riskLevel || 'low'} risk
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {test.size} boundary
                                  </Badge>
                                  <Badge className={`text-xs ${categoryColor}`}>
                                    {category}
                                  </Badge>
                                  {isActive && (
                                    <Badge variant="destructive" className="animate-pulse text-xs">
                                      <Zap className="h-3 w-3 mr-1" />
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
                                className="flex items-center gap-2 flex-1 md:flex-initial transition-all duration-200 hover:shadow-sm"
                                disabled={!isActive}
                              >
                                <IconComponent className="h-3 w-3 md:h-4 md:w-4" />
                                <span className="text-xs md:text-sm">View Tab</span>
                              </Button>
                              <Button
                                onClick={() => toggleCrash(test.id)}
                                variant={isActive ? "destructive" : "default"}
                                size={isMobile ? "sm" : "sm"}
                                className="flex items-center gap-2 flex-1 md:flex-initial transition-all duration-200 hover:shadow-sm"
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
                                <span>Component is currently crashing. Navigate to the tab to see the error boundary in action.</span>
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
              </div>
            );
          })}
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Error Boundary Coverage Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                    <span className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">7</span>
                  </div>
                  <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 font-medium">Tab Level</div>
                  <div className="text-xs text-muted-foreground">Large boundaries</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Component className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                    <span className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">5</span>
                  </div>
                  <div className="text-xs sm:text-sm text-green-800 dark:text-green-200 font-medium">Section Level</div>
                  <div className="text-xs text-muted-foreground">Medium boundaries</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Component className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                    <span className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">2</span>
                  </div>
                  <div className="text-xs sm:text-sm text-purple-800 dark:text-purple-200 font-medium">Modal Sections</div>
                  <div className="text-xs text-muted-foreground">Medium boundaries</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MousePointer className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                    <span className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">6</span>
                  </div>
                  <div className="text-xs sm:text-sm text-orange-800 dark:text-orange-200 font-medium">Input Fields</div>
                  <div className="text-xs text-muted-foreground">Small boundaries</div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                    <span className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">Excellent</span>
                  </div>
                  <div className="text-xs sm:text-sm text-green-800 dark:text-green-200 font-medium">Add Expense Flow</div>
                  <div className="text-xs text-muted-foreground mt-1">Multi-level protection with 13 boundaries</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-lg sm:text-xl font-bold text-yellow-600 dark:text-yellow-400">Good</span>
                  </div>
                  <div className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 font-medium">Expense Modals</div>
                  <div className="text-xs text-muted-foreground mt-1">Section-level boundaries in place</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
                    <span className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">Basic</span>
                  </div>
                  <div className="text-xs sm:text-sm text-red-800 dark:text-red-200 font-medium">Other Tabs</div>
                  <div className="text-xs text-muted-foreground mt-1">Only top-level protection</div>
                </div>
              </div>

              <Separator />

              <div className="text-xs sm:text-sm text-muted-foreground space-y-3">
                <div>
                  <p className="font-semibold text-foreground mb-2">Coverage Analysis:</p>
                  <ul className="space-y-1 list-disc list-inside pl-2">
                    <li><strong>Total Coverage:</strong> 20 error boundaries across the application</li>
                    <li><strong>Best Protected:</strong> Add Expense flow with granular component-level boundaries</li>
                    <li><strong>Well Protected:</strong> Expense detail modals with section-level boundaries</li>
                    <li><strong>Basic Protection:</strong> Other tabs rely on top-level boundaries only</li>
                  </ul>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs text-primary font-medium mb-1">💡 Testing Tip:</p>
                  <p className="text-xs">Start with small boundaries (input fields) to see granular error handling, then test larger boundaries to see how errors are contained at different levels.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}