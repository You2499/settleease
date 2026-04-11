"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Settings2, AlertTriangle, HandCoins } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

import AuthForm from '@/components/settleease/AuthForm';
import AddExpenseTab from '@/components/settleease/AddExpenseTab';
import EditExpensesTab from '@/components/settleease/EditExpensesTab';
import ManagePeopleTab from '@/components/settleease/ManagePeopleTab';
import ManageCategoriesTab from '@/components/settleease/ManageCategoriesTab';
import ManageSettlementsTab from '@/components/settleease/ManageSettlementsTab';
import AnalyticsTab from '@/components/settleease/AnalyticsTab';
import TestErrorBoundaryTab from '@/components/settleease/TestErrorBoundaryTab';
import ExportExpenseTab from '@/components/settleease/ExportExpenseTab';
import ScanReceiptTab from '@/components/settleease/ScanReceiptTab';
import SettingsTab from '@/components/settleease/SettingsTab';
import AppSidebar from '@/components/settleease/AppSidebar';
import BetaDashboardView from '@/components/settleease/BetaDashboardView';
import SettleEaseErrorBoundary from '@/components/ui/SettleEaseErrorBoundary';
import UserNameModal from '@/components/settleease/UserNameModal';

import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useConvexData } from '@/hooks/useConvexData';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useThemeSync } from '@/hooks/useThemeSync';

import type { ActiveView } from '@/lib/settleease';
import type { UserRole } from '@/lib/settleease';
import * as LucideIcons from 'lucide-react';
import MobileBottomNav from '@/components/settleease/MobileBottomNav';

const VALID_ACTIVE_VIEWS: ActiveView[] = [
  'dashboard',
  'analytics',
  'addExpense',
  'editExpenses',
  'managePeople',
  'manageCategories',
  'manageSettlements',
  'testErrorBoundary',
  'exportExpense',
  'scanReceipt',
  'settings',
];

const ADMIN_ONLY_VIEWS = new Set<ActiveView>([
  'addExpense',
  'editExpenses',
  'managePeople',
  'manageCategories',
  'manageSettlements',
  'testErrorBoundary',
  'exportExpense',
  'scanReceipt',
  'settings',
]);

const VIEW_NAMES: Record<ActiveView, string> = {
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  addExpense: 'Add Expense',
  editExpenses: 'Edit Expenses',
  managePeople: 'Manage People',
  manageCategories: 'Manage Categories',
  manageSettlements: 'Manage Settlements',
  testErrorBoundary: 'Test Error Boundary',
  exportExpense: 'Export Expense',
  scanReceipt: 'Smart Scan',
  settings: 'Settings',
};

function isValidActiveView(view: string | null | undefined): view is ActiveView {
  return !!view && VALID_ACTIVE_VIEWS.includes(view as ActiveView);
}

function canAccessView(view: ActiveView, userRole: UserRole) {
  return !ADMIN_ONLY_VIEWS.has(view) || userRole === 'admin';
}

function SettleEasePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize activeView from URL params to prevent dashboard flash on refresh
  const initialView = (() => {
    const viewParam = searchParams.get('view');
    if (isValidActiveView(viewParam)) {
      return viewParam;
    }
    return 'dashboard';
  })();

  const [activeView, setActiveView] = useState<ActiveView>(initialView);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isNameModalEditMode, setIsNameModalEditMode] = useState(false);
  const [hasResolvedInitialView, setHasResolvedInitialView] = useState(false);
  const [hasHandledWelcomeToast, setHasHandledWelcomeToast] = useState(false);
  const [restoredInitialView, setRestoredInitialView] = useState<ActiveView | null>(null);
  const lastAccessDeniedViewRef = React.useRef<ActiveView | null>(null);

  // Supabase owns auth; Convex owns data and realtime.
  const {
    supabaseClient,
    supabaseInitializationError,
    currentUser,
    isLoadingAuth,
    handleLogout,
  } = useSupabaseAuth();

  // Check for existing session on mount to prevent flashing
  // Start with false to avoid hydration mismatch, then check on client
  const [hasSession, setHasSession] = useState(false);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);

  // Run session check only on client after mount
  useEffect(() => {
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
      // Clear OAuth callback state ONLY after initial view is loaded
      // This prevents showing dashboard skeleton during OAuth
      if (currentUser && hasResolvedInitialView) {
        setIsOAuthCallback(false);
      }
    }
  }, [currentUser, isLoadingAuth, hasResolvedInitialView]);

  // Use user profile hook
  const {
    userProfile,
    isLoadingProfile,
    hasCompleteName,
    getDisplayName,
    refreshUserProfile,
    updateUserProfile,
  } = useUserProfile(currentUser);

  const userRole = (currentUser && userProfile?.role ? userProfile.role : null) as UserRole;
  const isLoadingRole = !!currentUser && (isLoadingProfile || !userProfile || !userRole);
  const isAppIdentityReady = !!currentUser && !isLoadingAuth && !!userProfile && !!userRole;

  // Sync theme through the live Convex profile.
  useThemeSync(currentUser?.id, userProfile);

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
    manualOverrides,
    isLoadingData,
    isDataFetchedAtLeastOnce,
    isLoadingPeople,
    isLoadingExpenses,
    isLoadingCategories,
    isLoadingSettlements,
    isLoadingOverrides,
    fetchAllData,
  } = useConvexData(currentUser, userRole, isLoadingAuth, isLoadingRole);

  const showAccessDeniedToast = useCallback((view: ActiveView, description = "You do not have permission to access this page.") => {
    if (lastAccessDeniedViewRef.current === view) return;
    lastAccessDeniedViewRef.current = view;
    toast({ title: "Access Denied", description, variant: "destructive" });
  }, []);

  // Effect to show name modal for users without complete names or Google users
  useEffect(() => {
    if (isAppIdentityReady && currentUser) {
      // Check if we've already shown the modal for this user (using localStorage)
      const modalShownKey = `nameModal_shown_${currentUser.id}`;
      const hasShownModal = localStorage.getItem(modalShownKey);

      const googleInfo = getGoogleUserInfo();

      // Show modal if:
      // 1. Modal hasn't been shown before for this user AND
      // 2. (User is a Google OAuth user OR user doesn't have complete names)
      if (!hasShownModal && (googleInfo?.isGoogle || !hasCompleteName())) {
        // Add a small delay to ensure the UI is ready, especially for Google OAuth redirects
        const timer = setTimeout(() => {
          setIsNameModalEditMode(false); // This is initial setup, not edit mode
          setShowNameModal(true);
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [currentUser, isAppIdentityReady, hasCompleteName, getGoogleUserInfo]);

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

  // Reset identity-dependent one-shot work when user changes.
  useEffect(() => {
    setHasResolvedInitialView(false);
    setHasHandledWelcomeToast(false);
    setRestoredInitialView(null);
    lastAccessDeniedViewRef.current = null;
  }, [currentUser?.id]);

  // Resolve the initial view only after the real profile role is known.
  useEffect(() => {
    if (hasResolvedInitialView || !isAppIdentityReady || !userProfile || !userRole) return;

    const hasUrlView = searchParams.get('view') !== null;
    const lastActiveView = userProfile.last_active_view as string | undefined;
    const restorableView = isValidActiveView(lastActiveView) && lastActiveView !== 'dashboard'
      ? lastActiveView
      : null;

    let resolvedView = activeView;
    let restoredView: ActiveView | null = null;

    if (!hasUrlView && restorableView && canAccessView(restorableView, userRole)) {
      resolvedView = restorableView;
      restoredView = restorableView;
    }

    if (!canAccessView(resolvedView, userRole)) {
      showAccessDeniedToast(resolvedView);
      resolvedView = 'dashboard';
      restoredView = null;
    }

    if (resolvedView !== activeView) {
      setActiveView(resolvedView);
    }
    setRestoredInitialView(restoredView);
    setHasResolvedInitialView(true);
  }, [activeView, hasResolvedInitialView, isAppIdentityReady, searchParams, showAccessDeniedToast, userProfile, userRole]);

  // CENTRALIZED TOAST LOGIC - Single source of truth for all welcome toasts.
  useEffect(() => {
    if (hasHandledWelcomeToast || !hasResolvedInitialView || !isAppIdentityReady || !currentUser || !userProfile || !userRole) return;

    const shouldShowToast = userProfile.should_show_welcome_toast === true;
    if (!shouldShowToast) return;

    const isNewUser = !userProfile.has_seen_welcome_toast;
    const isReturningUser = userProfile.has_seen_welcome_toast === true;

    const dbFirstName = userProfile.first_name || '';
    const metadataFullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
    const metadataFirstName = metadataFullName ? String(metadataFullName).split(' ')[0] : '';
    const emailUsername = currentUser.email?.split('@')[0] || 'there';
    const userName = dbFirstName || metadataFirstName || emailUsername;

    setHasHandledWelcomeToast(true);

    void updateUserProfile({
      should_show_welcome_toast: false,
      has_seen_welcome_toast: isNewUser ? true : userProfile.has_seen_welcome_toast,
    });

    setTimeout(() => {
      if (isNewUser) {
        toast({
          title: "Welcome to SettleEase!",
          description: `Hi ${userName}! Your account has been created and you're now signed in.`,
          variant: "default",
          duration: 5000
        });
      } else if (isReturningUser) {
        if (restoredInitialView) {
          const viewName = VIEW_NAMES[restoredInitialView] || 'your last view';

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
          toast({
            title: "Welcome back!",
            description: "You've successfully signed in to SettleEase.",
            duration: 5000
          });
        }
      }
    }, 0);
  }, [currentUser, hasHandledWelcomeToast, hasResolvedInitialView, isAppIdentityReady, restoredInitialView, updateUserProfile, userProfile, userRole]);

  // Effect to synchronize activeView based on userRole
  useEffect(() => {
    if (!hasResolvedInitialView || !isAppIdentityReady || !userRole) return;

    if (!canAccessView(activeView, userRole)) {
      console.log(`Role-View Sync Effect: User role is 'user' and current view ('${activeView}') is restricted. Resetting to dashboard.`);
      setActiveView('dashboard');
      showAccessDeniedToast(activeView);
      return;
    }
  }, [activeView, hasResolvedInitialView, isAppIdentityReady, showAccessDeniedToast, userRole]);

  // Effect to persist activeView to the URL and Convex profile.
  useEffect(() => {
    if (!hasResolvedInitialView || !isAppIdentityReady || !currentUser || !userRole) return;
    if (!canAccessView(activeView, userRole)) return;

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', activeView);
    router.replace(`?${params.toString()}`, { scroll: false });

    // Save to Convex (debounced)
    const timeoutId = setTimeout(async () => {
      try {
        await updateUserProfile({ last_active_view: activeView });
      } catch (err) {
        console.error('Error saving last active view:', err);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [activeView, currentUser, hasResolvedInitialView, isAppIdentityReady, router, searchParams, updateUserProfile, userRole]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + E: Add Expense
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        if (userRole === 'admin') {
          setActiveView('addExpense');
        } else if (userRole === 'user') {
          showAccessDeniedToast('addExpense', "You need admin permissions to add expenses.");
        }
      }

      // Cmd/Ctrl + F: Focus Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        // If not on dashboard, go there first
        if (activeView !== 'dashboard') {
          setActiveView('dashboard');
          // Wait for render then focus
          setTimeout(() => {
            const input = document.getElementById('expense-search-input');
            input?.focus();
          }, 100);
        } else {
          const input = document.getElementById('expense-search-input');
          input?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userRole, activeView, setActiveView, showAccessDeniedToast]);

  const peopleMap = useMemo(() => people.reduce((acc, person) => { acc[person.id] = person.name; return acc; }, {} as Record<string, string>), [people]);

  const handleSetActiveView = useCallback((view: ActiveView) => {
    if (!isAppIdentityReady || !userRole) return;

    if (!canAccessView(view, userRole)) {
      showAccessDeniedToast(view);
      setActiveView('dashboard');
      return;
    }

    lastAccessDeniedViewRef.current = null;
    setActiveView(view);
  }, [isAppIdentityReady, showAccessDeniedToast, userRole]);

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
  if (supabaseInitializationError && !supabaseClient) {
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

  // Keep the shell hidden until auth, profile, and the initial view are resolved.
  // Rendering before that point can briefly expose the wrong role/navigation.
  if (isLoadingAuth || (hasSession && !currentUser)) {
    return <div className="fixed inset-0 bg-background" />;
  }

  // Show transparent loading screen during OAuth callback until initial view is loaded
  // This prevents showing wrong skeleton (dashboard) before correct view is determined
  if (isOAuthCallback && !hasResolvedInitialView) {
    return <div className="fixed inset-0 bg-background" />;
  }

  // Show auth form when auth is complete and there's no user
  if (!currentUser && !isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <AuthForm supabase={supabaseClient} />
      </div>
    );
  }

  if (currentUser && (!isAppIdentityReady || !hasResolvedInitialView)) {
    return <div className="fixed inset-0 bg-background" />;
  }

  // Show the app only after identity-dependent routing has settled.
  return (
    <>
      {currentUser && (
        <UserNameModal
          isOpen={showNameModal}
          onClose={handleNameModalClose}
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
          isProfileLoading={!isAppIdentityReady}
        />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <header className="p-4 md:hidden flex items-center justify-center sticky top-0 bg-background z-20 border-b shadow-sm">
              <div className="flex items-center justify-center"> {/* Center part for logo */}
                <HandCoins className="h-7 w-7 text-primary mr-2" />
                <span className="text-xl font-bold text-primary">SettleEase</span>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background no-scrollbar min-h-0 pb-24 md:pb-6">
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
                    <BetaDashboardView
                      expenses={expenses}
                      people={people}
                      peopleMap={peopleMap}
                      dynamicCategories={categories}
                      getCategoryIconFromName={getCategoryIconFromName}
                      settlementPayments={settlementPayments}
                      manualOverrides={manualOverrides}
                      currentUserId={currentUser?.id || ''}
                      onActionComplete={handleActionComplete}
                      userRole={userRole}
                      isLoadingPeople={isLoadingPeople}
                      isLoadingExpenses={isLoadingExpenses}
                      isLoadingCategories={isLoadingCategories}
                      isLoadingSettlements={isLoadingSettlements}
                      isLoadingOverrides={isLoadingOverrides}
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
                      manualOverrides={manualOverrides}
                      currentUserId={currentUser?.id || ''}
                      onActionComplete={handleActionComplete}
                      isLoadingPeople={isLoadingPeople}
                      isLoadingExpenses={isLoadingExpenses}
                      isLoadingSettlements={isLoadingSettlements}
                      isLoadingOverrides={isLoadingOverrides}
                      isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
                      userRole={userRole}
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
                      manualOverrides={manualOverrides}
                      peopleMap={peopleMap}
                      categories={categories}
                      currentUserId={currentUser?.id}
                      isLoadingPeople={isLoadingPeople}
                      isLoadingExpenses={isLoadingExpenses}
                      isLoadingCategories={isLoadingCategories}
                      isLoadingSettlements={isLoadingSettlements}
                      isLoadingOverrides={isLoadingOverrides}
                      isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
                    />
                  </SettleEaseErrorBoundary>
                )}
                {userRole === 'admin' && activeView === 'exportExpense' && (
                  <SettleEaseErrorBoundary
                    componentName="Export Expense"
                    size="large"
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <ExportExpenseTab
                      expenses={expenses}
                      settlementPayments={settlementPayments}
                      people={people}
                      categories={categories}
                      peopleMap={peopleMap}
                      getCategoryIconFromName={getCategoryIconFromName}
                    />
                  </SettleEaseErrorBoundary>
                )}
                {userRole === 'admin' && activeView === 'scanReceipt' && (
                  <SettleEaseErrorBoundary
                    componentName="Smart Scan"
                    size="large"
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <ScanReceiptTab
                      people={people}
                      onExpenseAdded={handleExpenseAddedAndRedirect}
                      dynamicCategories={categories}
                      isLoadingPeople={isLoadingPeople}
                      isLoadingCategories={isLoadingCategories}
                      isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
                    />
                  </SettleEaseErrorBoundary>
                )}
                {userRole === 'admin' && activeView === 'settings' && (
                  <SettleEaseErrorBoundary
                    componentName="Settings"
                    size="large"
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <SettingsTab onNavigate={handleSetActiveView} />
                  </SettleEaseErrorBoundary>
                )}
              </div>
            </main>
            <MobileBottomNav activeView={activeView} setActiveView={handleSetActiveView} userRole={userRole} isProfileLoading={!isAppIdentityReady} />
          </div>
        </SidebarInset>
      </SidebarProvider >
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
