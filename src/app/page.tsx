"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Settings2, AlertTriangle, HandCoins, BarChartBig, Activity } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
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
import TestErrorBoundaryTab from '@/components/settleease/TestErrorBoundaryTab';
import AppSidebar from '@/components/settleease/AppSidebar';
import DashboardView from '@/components/settleease/DashboardView';
import SettleEaseErrorBoundary from '@/components/ui/SettleEaseErrorBoundary';
import UserNameModal from '@/components/settleease/UserNameModal';

import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useThemeSync } from '@/hooks/useThemeSync';

import type { ActiveView } from '@/lib/settleease';
import * as LucideIcons from 'lucide-react';


function SettleEasePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Initialize activeView from URL params to prevent dashboard flash on refresh
  const initialView = (() => {
    const viewParam = searchParams.get('view') as ActiveView | null;
    if (viewParam && ['dashboard', 'analytics', 'addExpense', 'editExpenses', 'managePeople', 'manageCategories', 'manageSettlements', 'testErrorBoundary'].includes(viewParam)) {
      return viewParam;
    }
    return 'dashboard';
  })();
  
  const [activeView, setActiveView] = useState<ActiveView>(initialView);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isNameModalEditMode, setIsNameModalEditMode] = useState(false);
  const [hasLoadedInitialView, setHasLoadedInitialView] = useState(false);

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

  // Check for existing session on mount to prevent flashing
  // Start with false to avoid hydration mismatch, then check on client
  const [hasSession, setHasSession] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);

  // Run session check only on client after mount
  useEffect(() => {
    setIsClient(true);
    
    // Check if this is an OAuth redirect (has hash fragment with access_token)
    const isOAuthRedirect = window.location.hash.includes('access_token');
    setIsOAuthCallback(isOAuthRedirect);
    
    // Check for Supabase session cookies
    const cookies = document.cookie;
    const hasCookie = cookies.includes('sb-') && cookies.includes('auth-token');
    
    // Check localStorage for Supabase auth tokens
    let hasLocalStorage = false;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase.auth.token') || (key.includes('sb-') && key.includes('auth-token')))) {
          const value = localStorage.getItem(key);
          if (value && value !== 'null' && value !== '{}' && value.length > 10) {
            hasLocalStorage = true;
            break;
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    
    // If OAuth redirect, assume session exists (prevents skeleton flash)
    const result = isOAuthRedirect || hasCookie || hasLocalStorage;
    setHasSession(result);
  }, []);

  // Update hasSession when auth state changes (handles logout and login)
  useEffect(() => {
    if (!isLoadingAuth) {
      setHasSession(!!currentUser);
      // Clear OAuth callback state once auth is complete
      if (currentUser) {
        setIsOAuthCallback(false);
      }
    }
  }, [currentUser, isLoadingAuth]);

  // Use user profile hook
  const {
    userProfile,
    isLoadingProfile,
    hasCompleteName,
    getDisplayName,
    refreshUserProfile,
  } = useUserProfile(db, currentUser);

  // Sync theme with database and enable real-time updates
  useThemeSync(db, currentUser?.id, userProfile);

  // Helper function to detect Google OAuth users and parse their names
  const getGoogleUserInfo = useCallback(() => {
    if (!currentUser?.user_metadata) return null;
    
    const metadata = currentUser.user_metadata;
    const isGoogle = metadata.iss === 'https://accounts.google.com' || metadata.provider_id;
    
    if (!isGoogle) return null;
    
    const fullName = metadata.full_name || metadata.name || '';
    if (!fullName) return { isGoogle: true, firstName: '', lastName: '' };
    
    // Parse the full name
    const spaceIndex = fullName.indexOf(' ');
    const firstName = spaceIndex > 0 ? fullName.substring(0, spaceIndex).trim() : fullName.trim();
    const lastName = spaceIndex > 0 ? fullName.substring(spaceIndex + 1).trim() : '';
    
    return {
      isGoogle: true,
      firstName,
      lastName,
      originalFullName: fullName
    };
  }, [currentUser]);

  const {
    people,
    expenses,
    categories,
    settlementPayments,
    isLoadingData,
    isDataFetchedAtLeastOnce,
    isLoadingPeople,
    isLoadingExpenses,
    isLoadingCategories,
    isLoadingSettlements,
    fetchAllData,
  } = useSupabaseData(db, supabaseInitializationError, currentUser, userRole, isLoadingAuth, isLoadingRole);

  // Set up realtime subscriptions
  useSupabaseRealtime(db, supabaseInitializationError, currentUser, userRole, isDataFetchedAtLeastOnce, fetchAllData);

  // Effect to show name modal for users without complete names or Google users
  useEffect(() => {
    if (currentUser && !isLoadingProfile) {
      // Check if we've already shown the modal for this user (using localStorage)
      const modalShownKey = `nameModal_shown_${currentUser.id}`;
      const hasShownModal = localStorage.getItem(modalShownKey);
      
      const googleInfo = getGoogleUserInfo();
      
      // Show modal if:
      // 1. Modal hasn't been shown before for this user AND
      // 2. (User is a Google OAuth user OR user doesn't have complete names)
      if (!hasShownModal && (googleInfo?.isGoogle || !userProfile || !hasCompleteName())) {
        // Add a small delay to ensure the UI is ready, especially for Google OAuth redirects
        const timer = setTimeout(() => {
          setIsNameModalEditMode(false); // This is initial setup, not edit mode
          setShowNameModal(true);
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser, userProfile, isLoadingProfile, hasCompleteName, getGoogleUserInfo]);

  const handleNameModalClose = useCallback(async (success: boolean) => {
    if (success && currentUser) {
      // Mark modal as shown for this user (only for initial setup, not for edits)
      if (!isNameModalEditMode) {
        const modalShownKey = `nameModal_shown_${currentUser.id}`;
        localStorage.setItem(modalShownKey, 'true');
      }
      
      // Refresh user profile to get updated names - but do it silently without triggering loading states
      try {
        await refreshUserProfile(false); // false = don't show loading state
      } catch (error) {
        console.warn('Failed to refresh user profile after name update:', error);
      }
    }
    setShowNameModal(false);
    setIsNameModalEditMode(false);
  }, [currentUser, isNameModalEditMode, refreshUserProfile]);

  const handleEditName = useCallback(() => {
    setIsNameModalEditMode(true);
    setShowNameModal(true);
  }, []);

  // Reset hasLoadedInitialView when user changes (to allow toast to show on sign-in)
  useEffect(() => {
    if (currentUser) {
      setHasLoadedInitialView(false);
    }
  }, [currentUser?.id]);

  // CENTRALIZED TOAST LOGIC - Single source of truth for all welcome toasts
  useEffect(() => {
    if (hasLoadedInitialView || !currentUser || !db || !userRole) return;
    
    const loadInitialViewAndShowToast = async () => {
      // Check if URL has a view param - if so, don't restore from database
      const hasUrlView = searchParams.get('view') !== null;
      
      // Fetch all needed data from database
      try {
        const { data, error } = await db
          .from('user_profiles')
          .select('last_active_view, has_seen_welcome_toast, should_show_welcome_toast, first_name, last_name')
          .eq('user_id', currentUser.id)
          .single();
        
        if (error) {
          console.error('Error loading user profile:', error);
          setHasLoadedInitialView(true);
          return;
        }
        
        // Simple flag-based logic - no time windows!
        const shouldShowToast = data?.should_show_welcome_toast === true;
        const isNewUser = !data?.has_seen_welcome_toast;
        const isReturningUser = data?.has_seen_welcome_toast === true;
        
        // Restore last active view from database ONLY if no URL param exists
        // (URL takes precedence over database)
        if (!hasUrlView && data?.last_active_view && data.last_active_view !== 'dashboard') {
          setActiveView(data.last_active_view as ActiveView);
        }
        
        // Show toast if flag is set (no time-based logic!)
        // Add a delay to ensure any role-based redirects happen first
        if (shouldShowToast) {
          // Get user's name for personalization - prioritize database first_name, then metadata, then email
          const dbFirstName = data?.first_name || '';
          const metadataFullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
          const metadataFirstName = metadataFullName ? metadataFullName.split(' ')[0] : '';
          const emailUsername = currentUser.email?.split('@')[0] || 'there';
          
          const userName = dbFirstName || metadataFirstName || emailUsername;
          
          // Clear the flag IMMEDIATELY to prevent duplicate toasts on refresh
          const updates: any = { should_show_welcome_toast: false };
          if (isNewUser) {
            updates.has_seen_welcome_toast = true;
          }
          
          await db
            .from('user_profiles')
            .update(updates)
            .eq('user_id', currentUser.id);
          
          // Use setTimeout to ensure toast is queued after component is fully mounted and role checks complete
          setTimeout(() => {
            if (isNewUser) {
              // NEW USER - Show welcome toast
              toast({
                title: "Welcome to SettleEase!",
                description: `Hi ${userName}! Your account has been created and you're now signed in.`,
                variant: "default",
                duration: 5000
              });
            } else if (isReturningUser) {
              // RETURNING USER
              if (data?.last_active_view && data.last_active_view !== 'dashboard') {
                // Returning to non-dashboard view - show restoration toast with button
                const viewNames: Record<ActiveView, string> = {
                  dashboard: 'Dashboard',
                  analytics: 'Analytics',
                  addExpense: 'Add Expense',
                  editExpenses: 'Edit Expenses',
                  managePeople: 'Manage People',
                  manageCategories: 'Manage Categories',
                  manageSettlements: 'Manage Settlements',
                  testErrorBoundary: 'Test Error Boundary'
                };
                
                const viewName = viewNames[data.last_active_view as ActiveView] || 'your last view';
                
                toast({ 
                  title: "Welcome back!", 
                  description: `Session restored to ${viewName}. Use the sidebar to navigate or click the button to go to Dashboard.`,
                  duration: 5000,
                  action: (
                    <ToastAction 
                      altText="Go to Dashboard" 
                      onClick={() => setActiveView('dashboard')}
                    >
                      Dashboard
                    </ToastAction>
                  )
                });
              } else {
                // Returning to dashboard - show simple welcome back
                toast({ 
                  title: "Welcome back!", 
                  description: "You've successfully signed in to SettleEase.",
                  duration: 5000
                });
              }
            }
          }, 0);
        }
      } catch (err) {
        console.error('Error in centralized toast logic:', err);
      }
      
      setHasLoadedInitialView(true);
    };
    
    loadInitialViewAndShowToast();
  }, [currentUser, db, searchParams, hasLoadedInitialView, userRole, setActiveView]);

  // Effect to synchronize activeView based on userRole
  useEffect(() => {
    let restrictedViewsForUserRole: ActiveView[] = ['addExpense', 'editExpenses', 'managePeople', 'manageCategories', 'manageSettlements', 'testErrorBoundary'];
    
    // Check role-based restrictions
    if (userRole === 'user' && restrictedViewsForUserRole.includes(activeView)) {
      console.log(`Role-View Sync Effect: User role is 'user' and current view ('${activeView}') is restricted. Resetting to dashboard.`);
      setActiveView('dashboard');
      toast({ title: "Access Denied", description: "You do not have permission to access this page.", variant: "destructive" });
      return;
    }
  }, [userRole, activeView]);
  
  // Effect to persist activeView to URL and database
  useEffect(() => {
    if (!hasLoadedInitialView || !currentUser || !db) return;
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', activeView);
    router.replace(`?${params.toString()}`, { scroll: false });
    
    // Save to database (debounced)
    const timeoutId = setTimeout(async () => {
      try {
        await db
          .from('user_profiles')
          .update({ last_active_view: activeView })
          .eq('user_id', currentUser.id);
      } catch (err) {
        console.error('Error saving last active view:', err);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [activeView, currentUser, db, hasLoadedInitialView, router, searchParams]);


  const peopleMap = useMemo(() => people.reduce((acc, person) => { acc[person.id] = person.name; return acc; }, {} as Record<string, string>), [people]);

  const handleSetActiveView = useCallback((view: ActiveView) => {
    let restrictedViewsForUserRole: ActiveView[] = ['addExpense', 'editExpenses', 'managePeople', 'manageCategories', 'manageSettlements', 'testErrorBoundary'];
    
    // Check role-based restrictions
    if (userRole === 'user' && restrictedViewsForUserRole.includes(view)) {
      toast({ title: "Access Denied", description: "You do not have permission to access this page.", variant: "destructive" });
      setActiveView('dashboard');
      return;
    }

    setActiveView(view);
  }, [userRole]);

  const getCategoryIconFromName = useCallback((iconName: string = ""): React.FC<React.SVGProps<SVGSVGElement>> => {
    return (LucideIcons as any)[iconName] || Settings2;
  }, []);

  // Helper for AddExpenseTab to redirect to dashboard after adding
  const handleExpenseAddedAndRedirect = useCallback(async () => {
    await fetchAllData(false);
    setActiveView('dashboard');
  }, [fetchAllData]);

  // Memoized callback for action complete to prevent unnecessary re-renders
  const handleActionComplete = useCallback(() => fetchAllData(false), [fetchAllData]);

  // Show error screen for Supabase initialization errors
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

  // Show transparent loading screen during:
  // 1. OAuth callback - show until data is loaded (prevents skeleton flash)
  // 2. Initial auth check when no session detected (prevents auth form flash)
  if (isLoadingAuth && !currentUser && !hasSession) {
    return <div className="fixed inset-0 bg-background" />;
  }
  
  // Show transparent loading screen during OAuth callback until initial view is loaded
  // This prevents showing wrong skeleton (dashboard) before correct view is determined
  if (isOAuthCallback && !hasLoadedInitialView) {
    return <div className="fixed inset-0 bg-background" />;
  }

  // Show auth form when auth is complete and there's no user
  if (!currentUser && !isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <AuthForm db={db} />
      </div>
    );
  }

  // Show dashboard when:
  // - We have a user, OR
  // - Auth is loading and we have a session (prevents auth form flash)
  // (dashboard will show skeleton loaders while data loads)

  // Show dashboard (with skeleton loaders) when:
  // - User is authenticated, OR
  // - Auth is loading and we likely have a session (prevents auth form flash on refresh)

  // Show the app with skeleton loaders (works for both auth loading and data loading)
  return (
    <>
      {currentUser && (
        <UserNameModal
          isOpen={showNameModal}
          onClose={handleNameModalClose}
          db={db}
          userId={currentUser.id}
          initialFirstName={isNameModalEditMode ? (userProfile?.first_name || '') : (getGoogleUserInfo()?.firstName || userProfile?.first_name || '')}
          initialLastName={isNameModalEditMode ? (userProfile?.last_name || '') : (getGoogleUserInfo()?.lastName || userProfile?.last_name || '')}
          isGoogleUser={!isNameModalEditMode && (getGoogleUserInfo()?.isGoogle || false)}
          isEditMode={isNameModalEditMode}
        />
      )}
      <SidebarProvider defaultOpen={true}>
        <AppSidebar 
          activeView={activeView} 
          setActiveView={handleSetActiveView} 
          handleLogout={handleLogout} 
          currentUserEmail={currentUser?.email || null}
          currentUserName={getDisplayName()}
          userRole={userRole}
          onEditName={handleEditName}
        />
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
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background no-scrollbar min-h-0">
            <div className="min-h-full bg-background">
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
                  currentUserId={currentUser?.id || ''}
                  onActionComplete={handleActionComplete}
                  userRole={userRole}
                  isLoadingPeople={isLoadingPeople}
                  isLoadingExpenses={isLoadingExpenses}
                  isLoadingCategories={isLoadingCategories}
                  isLoadingSettlements={isLoadingSettlements}
                  isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
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
                  settlementPayments={settlementPayments}
                  isLoadingPeople={isLoadingPeople}
                  isLoadingExpenses={isLoadingExpenses}
                  isLoadingCategories={isLoadingCategories}
                  isLoadingSettlements={isLoadingSettlements}
                  isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
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
                  isLoadingPeople={isLoadingPeople}
                  isLoadingCategories={isLoadingCategories}
                  isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
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
                  isLoadingPeople={isLoadingPeople}
                  isLoadingExpenses={isLoadingExpenses}
                  isLoadingCategories={isLoadingCategories}
                  isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
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
                  isLoadingPeople={isLoadingPeople}
                  isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
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
                  onCategoriesUpdate={handleActionComplete}
                  isLoadingCategories={isLoadingCategories}
                  isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
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
                  currentUserId={currentUser?.id || ''}
                  onActionComplete={handleActionComplete}
                  isLoadingPeople={isLoadingPeople}
                  isLoadingExpenses={isLoadingExpenses}
                  isLoadingSettlements={isLoadingSettlements}
                  isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
                />
              </SettleEaseErrorBoundary>
            )}
            {userRole === 'admin' && activeView === 'testErrorBoundary' && (
              <SettleEaseErrorBoundary
                componentName="Test Error Boundary"
                size="large"
                onNavigateHome={() => setActiveView('dashboard')}
              >
                <TestErrorBoundaryTab
                  userRole={userRole}
                  setActiveView={handleSetActiveView}
                  people={people}
                  expenses={expenses}
                  settlementPayments={settlementPayments}
                  peopleMap={peopleMap}
                  categories={categories}
                  isLoadingPeople={isLoadingPeople}
                  isLoadingExpenses={isLoadingExpenses}
                  isLoadingCategories={isLoadingCategories}
                  isLoadingSettlements={isLoadingSettlements}
                  isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
                />
              </SettleEaseErrorBoundary>
            )}
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </>
  );
}

export default function SettleEasePage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-background" />}>
      <SettleEasePageContent />
    </Suspense>
  );
}
