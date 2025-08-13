"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings2, AlertTriangle, HandCoins } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import AuthForm from '@/components/settleease/AuthForm';
import AddExpenseTab from '@/components/settleease/AddExpenseTab';
import EditExpensesTab from '@/components/settleease/EditExpensesTab';
import ManagePeopleTab from '@/components/settleease/ManagePeopleTab';
import ManageCategoriesTab from '@/components/settleease/ManageCategoriesTab';
import ManageSettlementsTab from '@/components/settleease/ManageSettlementsTab';
import AnalyticsTab from '@/components/settleease/AnalyticsTab';
import AppSidebar from '@/components/settleease/AppSidebar';
import DashboardView from '@/components/settleease/DashboardView';
import AppLoadingScreen from '@/components/settleease/AppLoadingScreen';
import SettleEaseErrorBoundary from '@/components/ui/SettleEaseErrorBoundary';

import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

import type { ActiveView } from '@/lib/settleease';
import * as LucideIcons from 'lucide-react';


export default function SettleEasePage() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  // Use custom hooks for auth, data, and realtime
  const {
    db,
    supabaseInitializationError,
    currentUser,
    userRole,
    isLoadingAuth,
    isLoadingRole,
    handleLogout,
  } = useSupabaseAuth();

  const {
    people,
    expenses,
    categories,
    settlementPayments,
    isLoadingData,
    isDataFetchedAtLeastOnce,
    fetchAllData,
  } = useSupabaseData(db, supabaseInitializationError, currentUser, userRole, isLoadingAuth, isLoadingRole);

  // Set up realtime subscriptions
  useSupabaseRealtime(db, supabaseInitializationError, currentUser, userRole, isDataFetchedAtLeastOnce, fetchAllData);


  // Effect to synchronize activeView based on userRole (e.g., redirect 'user' from admin pages)
  useEffect(() => {
    let restrictedViewsForUserRole: ActiveView[] = ['addExpense', 'editExpenses', 'managePeople', 'manageCategories', 'manageSettlements'];
    if (userRole === 'user' && restrictedViewsForUserRole.includes(activeView)) {
      console.log(`Role-View Sync Effect: User role is 'user' and current view ('${activeView}') is restricted. Resetting to dashboard.`);
      setActiveView('dashboard');
      toast({ title: "Access Denied", description: "You do not have permission to access this page.", variant: "destructive" });
    }
  }, [userRole, activeView]);


  const peopleMap = useMemo(() => people.reduce((acc, person) => { acc[person.id] = person.name; return acc; }, {} as Record<string, string>), [people]);

  const handleSetActiveView = (view: ActiveView) => {
    let restrictedViewsForUserRole: ActiveView[] = ['addExpense', 'editExpenses', 'managePeople', 'manageCategories', 'manageSettlements'];
    if (userRole === 'user' && restrictedViewsForUserRole.includes(view)) {
      toast({ title: "Access Denied", description: "You do not have permission to access this page.", variant: "destructive" });
      setActiveView('dashboard'); // This triggers the Role-View Sync effect if needed
    } else {
      setActiveView(view);
    }
  };

 const getCategoryIconFromName = useCallback((iconName: string = ""): React.FC<React.SVGProps<SVGSVGElement>> => {
    return (LucideIcons as any)[iconName] || Settings2;
  }, []);


  if (isLoadingAuth || (currentUser && isLoadingRole)) {
    const title = "Loading SettleEase";
    const subtitle = isLoadingAuth 
      ? "Initializing application and verifying your session. Just a moment..." 
      : "Securing your account details. Almost there...";
    return <AppLoadingScreen title={title} subtitle={subtitle} />;
  }

  if (supabaseInitializationError && !db) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Configuration Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">SettleEase could not start due to a Supabase configuration problem.</p>
            <p className="mt-2 text-sm text-muted-foreground bg-destructive/10 p-3 rounded-md">{supabaseInitializationError}</p>
            <p className="mt-3 text-xs">Please ensure your Supabase environment variables (e.g., NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are correctly set in your project (e.g., in a `.env.local` file for local development, or in your hosting provider's settings for deployment).</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <AuthForm db={db} />
      </div>
    );
  }

  if (isLoadingData && !isDataFetchedAtLeastOnce) {
     return <AppLoadingScreen title="Loading Your Data" subtitle="Preparing your dashboard and fetching latest information. Hang tight!" />;
  }

  // Helper for AddExpenseTab to redirect to dashboard after adding
  const handleExpenseAddedAndRedirect = async () => {
    await fetchAllData(false);
    setActiveView('dashboard');
  };


  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar activeView={activeView} setActiveView={handleSetActiveView} handleLogout={handleLogout} currentUserEmail={currentUser.email} userRole={userRole} />
      <SidebarInset>
        <div className="flex flex-col h-full">
          <header className="p-4 md:hidden flex items-center sticky top-0 bg-background z-20 border-b shadow-sm">
            <div className="w-10"> {/* Left part for trigger */}
              <SidebarTrigger />
            </div>
            <div className="flex-grow flex items-center justify-center"> {/* Center part for logo */}
              <HandCoins className="h-7 w-7 text-primary mr-2" />
              <span className="text-xl font-bold text-primary">SettleEase</span>
            </div>
            <div className="w-10" /> {/* Right part, spacer for symmetry */}
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background no-scrollbar">
            {isLoadingData && isDataFetchedAtLeastOnce && (
                <div className="text-center text-sm text-muted-foreground mb-4">Syncing data...</div>
            )}
            {activeView === 'dashboard' && (
              <SettleEaseErrorBoundary 
                componentName="Dashboard" 
                size="large"
                onNavigateHome={() => setActiveView('dashboard')}
              >
                <DashboardView
                  expenses={expenses}
                  people={people}
                  peopleMap={peopleMap}
                  dynamicCategories={categories}
                  getCategoryIconFromName={getCategoryIconFromName}
                  settlementPayments={settlementPayments}
                  db={db}
                  currentUserId={currentUser.id}
                  onActionComplete={() => fetchAllData(false)}
                  userRole={userRole}
                />
              </SettleEaseErrorBoundary>
            )}
            {activeView === 'analytics' && (
              <SettleEaseErrorBoundary 
                componentName="Analytics" 
                size="large"
                onNavigateHome={() => setActiveView('dashboard')}
              >
                <AnalyticsTab
                  expenses={expenses}
                  people={people}
                  peopleMap={peopleMap}
                  dynamicCategories={categories}
                  getCategoryIconFromName={getCategoryIconFromName}
                />
              </SettleEaseErrorBoundary>
            )}
            {userRole === 'admin' && activeView === 'addExpense' && (
              <SettleEaseErrorBoundary 
                componentName="Add Expense" 
                size="large"
                onNavigateHome={() => setActiveView('dashboard')}
              >
                <AddExpenseTab 
                  people={people} 
                  db={db} 
                  supabaseInitializationError={supabaseInitializationError} 
                  onExpenseAdded={handleExpenseAddedAndRedirect} 
                  dynamicCategories={categories} 
                />
              </SettleEaseErrorBoundary>
            )}
            {userRole === 'admin' && activeView === 'editExpenses' && (
              <SettleEaseErrorBoundary 
                componentName="Edit Expenses" 
                size="large"
                onNavigateHome={() => setActiveView('dashboard')}
              >
                <EditExpensesTab 
                  people={people} 
                  expenses={expenses} 
                  db={db} 
                  supabaseInitializationError={supabaseInitializationError} 
                  onActionComplete={handleExpenseAddedAndRedirect} 
                  dynamicCategories={categories} 
                />
              </SettleEaseErrorBoundary>
            )}
            {userRole === 'admin' && activeView === 'managePeople' && (
              <SettleEaseErrorBoundary 
                componentName="Manage People" 
                size="large"
                onNavigateHome={() => setActiveView('dashboard')}
              >
                <ManagePeopleTab 
                  people={people} 
                  db={db} 
                  supabaseInitializationError={supabaseInitializationError} 
                />
              </SettleEaseErrorBoundary>
            )}
            {userRole === 'admin' && activeView === 'manageCategories' && (
              <SettleEaseErrorBoundary 
                componentName="Manage Categories" 
                size="large"
                onNavigateHome={() => setActiveView('dashboard')}
              >
                <ManageCategoriesTab 
                  categories={categories} 
                  db={db} 
                  supabaseInitializationError={supabaseInitializationError} 
                  onCategoriesUpdate={() => fetchAllData(false)} 
                />
              </SettleEaseErrorBoundary>
            )}
            {userRole === 'admin' && activeView === 'manageSettlements' && (
              <SettleEaseErrorBoundary 
                componentName="Manage Settlements" 
                size="large"
                onNavigateHome={() => setActiveView('dashboard')}
              >
                <ManageSettlementsTab
                  expenses={expenses}
                  people={people}
                  peopleMap={peopleMap}
                  settlementPayments={settlementPayments}
                  db={db}
                  currentUserId={currentUser.id}
                  onActionComplete={() => fetchAllData(false)}
                />
              </SettleEaseErrorBoundary>
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

