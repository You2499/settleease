"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Settings2, AlertTriangle, HandCoins, SidebarClose, SidebarOpen } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";

import AuthForm from '@/components/settleease/AuthForm';
import AddExpenseTab from '@/components/settleease/AddExpenseTab';
import EditExpensesTab from '@/components/settleease/EditExpensesTab';
import ManagePeopleTab from '@/components/settleease/ManagePeopleTab';
import ManageCategoriesTab from '@/components/settleease/ManageCategoriesTab';
import ManageSettlementsTab from '@/components/settleease/ManageSettlementsTab';
import AnalyticsTab from '@/components/settleease/AnalyticsTab';
import HealthTab from '@/components/settleease/HealthTab';
import ExportExpenseTab, { ExportExpenseSkeleton } from '@/components/settleease/ExportExpenseTab';
import ScanReceiptTab from '@/components/settleease/ScanReceiptTab';
import SettingsTab, { SettingsTabSkeleton } from '@/components/settleease/SettingsTab';
import AppSidebar from '@/components/settleease/AppSidebar';
import DashboardView from '@/components/settleease/DashboardView';
import SettleEaseErrorBoundary from '@/components/ui/SettleEaseErrorBoundary';
import UserNameModal from '@/components/settleease/UserNameModal';
import KeyboardShortcutsModal from '@/components/settleease/KeyboardShortcutsModal';
import {
  WindowsExperienceCrashGate,
  WindowsExperienceFreezeLayer,
  WindowsExperienceProvider,
  useWindowsExperienceLoadingDelay,
  useWindowsExperienceNavigation,
} from '@/components/settleease/WindowsExperience';

import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useConvexData } from '@/hooks/useConvexData';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useThemeSync } from '@/hooks/useThemeSync';
import { useFontSync } from '@/hooks/useFontSync';
import { useSettleEaseShortcuts } from '@/hooks/useSettleEaseShortcuts';

import {
  buildWelcomeToastModel,
  canAccessView,
  getWelcomeUserName,
  isValidActiveView,
  resolveInitialView,
  shouldShowWelcomeToastForNavigation,
} from '@/lib/settleease/authFlow';
import type { ActiveView } from '@/lib/settleease';
import type { UserRole } from '@/lib/settleease';
import * as LucideIcons from 'lucide-react';
import MobileBottomNav from '@/components/settleease/MobileBottomNav';

function MobileTopBar() {
  const { openMobile, setOpenMobile } = useSidebar();
  const SidebarIcon = openMobile ? SidebarClose : SidebarOpen;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-center border-b bg-background px-4 py-3 shadow-sm md:hidden">
      <button
        type="button"
        onClick={() => setOpenMobile(!openMobile)}
        className="absolute left-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-primary hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={openMobile ? "Close menu" : "Open menu"}
      >
        <SidebarIcon className="h-5 w-5" />
      </button>
      <div className="flex min-w-0 items-center justify-center px-12">
        <HandCoins className="mr-2 h-7 w-7 shrink-0 text-primary" />
        <span className="truncate text-xl font-bold text-primary">SettleEase</span>
      </div>
    </header>
  );
}

function SettleEasePageContent() {
  const searchParams = useSearchParams();
  const requestedView = searchParams.get('view');
  const searchParamsString = searchParams.toString();
  const lastSyncedQueryRef = React.useRef(searchParamsString);

  // Initialize activeView from URL params to prevent dashboard flash on refresh
  const initialView = (() => {
    if (isValidActiveView(requestedView)) {
      return requestedView;
    }
    return 'dashboard';
  })();

  const [activeView, setActiveView] = useState<ActiveView>(initialView);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isNameModalEditMode, setIsNameModalEditMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [hasResolvedInitialView, setHasResolvedInitialView] = useState(false);
  const [hasHandledWelcomeToast, setHasHandledWelcomeToast] = useState(false);
  const [restoredInitialView, setRestoredInitialView] = useState<ActiveView | null>(null);
  const lastAccessDeniedViewRef = React.useRef<ActiveView | null>(null);
  const navigationType = useMemo(() => {
    if (typeof window === 'undefined') return null;

    const navigationEntry = window.performance
      ?.getEntriesByType?.('navigation')
      ?.at(0) as PerformanceNavigationTiming | undefined;

    if (typeof navigationEntry?.type === 'string') {
      return navigationEntry.type;
    }

    const legacyNavigationType = window.performance?.navigation?.type;
    if (legacyNavigationType === 1) return 'reload';
    if (legacyNavigationType === 2) return 'back_forward';
    if (legacyNavigationType === 0) return 'navigate';
    return null;
  }, []);

  useEffect(() => {
    lastSyncedQueryRef.current = searchParamsString;
  }, [searchParamsString]);

  // Supabase owns auth; Convex owns data and realtime.
  const {
    supabaseClient,
    supabaseInitializationError,
    currentUser,
    isLoadingAuth,
    hasRecoverableAuthSession,
    handleLogout,
    isDevelopmentEnvironment,
  } = useSupabaseAuth();

  const [isOAuthCallback, setIsOAuthCallback] = useState(false);

  useEffect(() => {
    setIsOAuthCallback(window.location.hash.includes('access_token'));
  }, []);

  useEffect(() => {
    if (!isLoadingAuth && currentUser && hasResolvedInitialView) {
      setIsOAuthCallback(false);
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
  useFontSync(userProfile?.font_preference);

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

    const { deniedView, resolvedView, restoredView } = resolveInitialView({
      currentView: activeView,
      lastActiveView: userProfile.last_active_view,
      requestedView,
      userRole,
    });

    if (deniedView) {
      showAccessDeniedToast(deniedView);
    }

    if (resolvedView !== activeView) {
      setActiveView(resolvedView);
    }
    setRestoredInitialView(restoredView);
    setHasResolvedInitialView(true);
  }, [activeView, hasResolvedInitialView, isAppIdentityReady, requestedView, showAccessDeniedToast, userProfile, userRole]);

  // CENTRALIZED TOAST LOGIC - Single source of truth for all welcome toasts.
  useEffect(() => {
    if (hasHandledWelcomeToast || !hasResolvedInitialView || !isAppIdentityReady || !currentUser || !userProfile || !userRole) return;

    if (!shouldShowWelcomeToastForNavigation({
      hasSeenWelcomeToast: !!userProfile.has_seen_welcome_toast,
      navigationType,
    })) {
      setHasHandledWelcomeToast(true);

      if (userProfile.should_show_welcome_toast) {
        void updateUserProfile({ should_show_welcome_toast: false });
      }
      return;
    }

    const userName = getWelcomeUserName({
      email: currentUser.email,
      metadataFullName: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
      profileFirstName: userProfile.first_name,
    });
    const welcomeToast = buildWelcomeToastModel({
      profile: userProfile,
      restoredInitialView,
      userName,
    });

    setHasHandledWelcomeToast(true);

    if (Object.keys(welcomeToast.profileUpdates).length > 0) {
      void updateUserProfile(welcomeToast.profileUpdates);
    }

    setTimeout(() => {
      if (welcomeToast.action === 'dashboard') {
        toast({
          title: welcomeToast.title,
          description: welcomeToast.description,
          duration: 5000,
          action: (
            <ToastAction
              altText="Go Home"
              onClick={() => setActiveView('dashboard')}
            >
              Home
            </ToastAction>
          )
        });
        return;
      }

      toast({
        title: welcomeToast.title,
        description: welcomeToast.description,
        variant: welcomeToast.variant,
        duration: 5000
      });
    }, 0);
  }, [currentUser, hasHandledWelcomeToast, hasResolvedInitialView, isAppIdentityReady, navigationType, restoredInitialView, updateUserProfile, userProfile, userRole]);

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

    // This is same-page state, so keep it out of Next navigation. In Firefox,
    // router.replace() can remount the app shell when Add Expense becomes active.
    const currentQuery = lastSyncedQueryRef.current;
    const params = new URLSearchParams(currentQuery);
    params.set('view', activeView);
    const nextQuery = params.toString();
    if (nextQuery !== currentQuery && typeof window !== 'undefined') {
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}?${nextQuery}${window.location.hash}`
      );
      lastSyncedQueryRef.current = nextQuery;
    }

    // Save to Convex (debounced)
    const timeoutId = setTimeout(async () => {
      try {
        await updateUserProfile({ last_active_view: activeView });
      } catch (err) {
        console.error('Error saving last active view:', err);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [activeView, currentUser, hasResolvedInitialView, isAppIdentityReady, updateUserProfile, userRole]);

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

  const handleOpenProfileMenu = useCallback(() => {
    window.dispatchEvent(new CustomEvent("settleease:open-profile-menu"));
  }, []);

  useSettleEaseShortcuts({
    activeView,
    isReady: isAppIdentityReady && hasResolvedInitialView,
    onNavigate: handleSetActiveView,
    onShowShortcuts: () => setShowShortcuts(true),
    onOpenProfileMenu: handleOpenProfileMenu,
  });

  const peopleMap = useMemo(() => people.reduce((acc, person) => { acc[person.id] = person.name; return acc; }, {} as Record<string, string>), [people]);

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

  const shouldShowPageSkeleton =
    isLoadingAuth ||
    (isOAuthCallback && !hasResolvedInitialView) ||
    (!!currentUser && (!isAppIdentityReady || !hasResolvedInitialView));
  const isWindowsExperienceActive =
    isAppIdentityReady &&
    !!userProfile?.windows_experience_enabled &&
    activeView !== 'settings';
  const {
    renderedView: renderedActiveView,
    isTransitioning: isWindowsExperienceTransitioning,
  } = useWindowsExperienceNavigation({
    activeView,
    enabled: isWindowsExperienceActive,
  });
  const visiblePageSkeleton = useWindowsExperienceLoadingDelay(
    isWindowsExperienceActive,
    shouldShowPageSkeleton || isWindowsExperienceTransitioning,
    `page-shell:${activeView}`,
  );
  const visibleLoadingPeople = useWindowsExperienceLoadingDelay(
    isWindowsExperienceActive,
    shouldShowPageSkeleton || isLoadingPeople,
    "people",
  );
  const visibleLoadingExpenses = useWindowsExperienceLoadingDelay(
    isWindowsExperienceActive,
    shouldShowPageSkeleton || isLoadingExpenses,
    "expenses",
  );
  const visibleLoadingCategories = useWindowsExperienceLoadingDelay(
    isWindowsExperienceActive,
    shouldShowPageSkeleton || isLoadingCategories,
    "categories",
  );
  const visibleLoadingSettlements = useWindowsExperienceLoadingDelay(
    isWindowsExperienceActive,
    shouldShowPageSkeleton || isLoadingSettlements,
    "settlements",
  );
  const visibleLoadingOverrides = useWindowsExperienceLoadingDelay(
    isWindowsExperienceActive,
    shouldShowPageSkeleton || isLoadingOverrides,
    "overrides",
  );
  const forcedDataFetchedAtLeastOnce = shouldShowPageSkeleton ? false : isDataFetchedAtLeastOnce;
  const visibleDataFetchedAtLeastOnce = visiblePageSkeleton ? false : forcedDataFetchedAtLeastOnce;
  const windowsExperienceResetKey = isWindowsExperienceActive
    ? `windows:${currentUser?.id || "unknown"}:${activeView}:${renderedActiveView}:${isWindowsExperienceTransitioning}`
    : `normal:${currentUser?.id || "unknown"}:${activeView}`;

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

  // Show auth immediately when there is no stored session/OAuth callback to recover.
  if (!currentUser && (!isLoadingAuth || !hasRecoverableAuthSession)) {
    return <AuthForm supabase={supabaseClient} />;
  }

  // Show the app shell during identity loading, with the active page's own skeleton.
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
      <WindowsExperienceProvider enabled={isWindowsExperienceActive} surface={activeView}>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar
          activeView={activeView}
          setActiveView={handleSetActiveView}
          handleLogout={handleLogout}
          currentUserEmail={currentUser?.email || null}
          currentUserName={getDisplayName()}
          userRole={userRole}
          onEditName={handleEditName}
          onShowShortcuts={() => setShowShortcuts(true)}
          isProfileLoading={visiblePageSkeleton || !isAppIdentityReady}
          isDevelopmentEnvironment={isDevelopmentEnvironment}
        />
        <SidebarInset className="min-w-0 overflow-x-hidden">
          <div className="flex h-full min-w-0 flex-col overflow-x-hidden">
            <MobileTopBar />
            <main className="no-scrollbar flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto bg-background p-3 sm:p-4 md:p-6 pb-24 md:pb-6">
              <div className="relative min-h-full w-full min-w-0 bg-background">
                <WindowsExperienceFreezeLayer />
                {isLoadingData && isDataFetchedAtLeastOnce && !visiblePageSkeleton && (
                  <div className="sr-only" aria-live="polite">Syncing data...</div>
                )}
                {renderedActiveView === 'dashboard' && (
                  <SettleEaseErrorBoundary
                    componentName="Home"
                    size="large"
                    resetKey={windowsExperienceResetKey}
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <WindowsExperienceCrashGate componentName="Home">
                      <DashboardView
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
                        isLoadingPeople={visibleLoadingPeople}
                        isLoadingExpenses={visibleLoadingExpenses}
                        isLoadingCategories={visibleLoadingCategories}
                        isLoadingSettlements={visibleLoadingSettlements}
                        isLoadingOverrides={visibleLoadingOverrides}
                        isDataFetchedAtLeastOnce={visibleDataFetchedAtLeastOnce}
                      />
                    </WindowsExperienceCrashGate>
                  </SettleEaseErrorBoundary>
                )}
                {renderedActiveView === 'analytics' && (
                  <SettleEaseErrorBoundary
                    componentName="Analytics"
                    size="large"
                    resetKey={windowsExperienceResetKey}
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <WindowsExperienceCrashGate componentName="Analytics">
                      <AnalyticsTab
                        expenses={expenses}
                        people={people}
                        peopleMap={peopleMap}
                        dynamicCategories={categories}
                        getCategoryIconFromName={getCategoryIconFromName}
                        settlementPayments={settlementPayments}
                        isLoadingPeople={visibleLoadingPeople}
                        isLoadingExpenses={visibleLoadingExpenses}
                        isLoadingCategories={visibleLoadingCategories}
                        isLoadingSettlements={visibleLoadingSettlements}
                        isDataFetchedAtLeastOnce={visibleDataFetchedAtLeastOnce}
                      />
                    </WindowsExperienceCrashGate>
                  </SettleEaseErrorBoundary>
                )}
                {renderedActiveView === 'health' && (
                  <SettleEaseErrorBoundary
                    componentName="Health"
                    size="large"
                    resetKey={windowsExperienceResetKey}
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <WindowsExperienceCrashGate componentName="Health">
                      <HealthTab
                        expenses={expenses}
                        people={people}
                        peopleMap={peopleMap}
                        dynamicCategories={categories}
                        getCategoryIconFromName={getCategoryIconFromName}
                        isLoadingPeople={visibleLoadingPeople}
                        isLoadingExpenses={visibleLoadingExpenses}
                        isLoadingCategories={visibleLoadingCategories}
                        isDataFetchedAtLeastOnce={visibleDataFetchedAtLeastOnce}
                      />
                    </WindowsExperienceCrashGate>
                  </SettleEaseErrorBoundary>
                )}
                {(userRole === 'admin' || visiblePageSkeleton) && renderedActiveView === 'addExpense' && (
                  <SettleEaseErrorBoundary
                    componentName="Add Expense"
                    size="large"
                    resetKey={windowsExperienceResetKey}
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <WindowsExperienceCrashGate componentName="Add Expense">
                      <AddExpenseTab
                        people={people}
                        onExpenseAdded={handleExpenseAddedAndRedirect}
                        dynamicCategories={categories}
                        isLoadingPeople={visibleLoadingPeople}
                        isLoadingCategories={visibleLoadingCategories}
                        isDataFetchedAtLeastOnce={visibleDataFetchedAtLeastOnce}
                      />
                    </WindowsExperienceCrashGate>
                  </SettleEaseErrorBoundary>
                )}
                {(userRole === 'admin' || visiblePageSkeleton) && renderedActiveView === 'editExpenses' && (
                  <SettleEaseErrorBoundary
                    componentName="Edit Expenses"
                    size="large"
                    resetKey={windowsExperienceResetKey}
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <WindowsExperienceCrashGate componentName="Edit Expenses">
                      <EditExpensesTab
                        people={people}
                        expenses={expenses}
                        onActionComplete={handleExpenseAddedAndRedirect}
                        dynamicCategories={categories}
                        isLoadingPeople={visibleLoadingPeople}
                        isLoadingExpenses={visibleLoadingExpenses}
                        isLoadingCategories={visibleLoadingCategories}
                        isDataFetchedAtLeastOnce={visibleDataFetchedAtLeastOnce}
                      />
                    </WindowsExperienceCrashGate>
                  </SettleEaseErrorBoundary>
                )}
                {(userRole === 'admin' || visiblePageSkeleton) && renderedActiveView === 'managePeople' && (
                  <SettleEaseErrorBoundary
                    componentName="Manage People"
                    size="large"
                    resetKey={windowsExperienceResetKey}
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <WindowsExperienceCrashGate componentName="Manage People">
                      <ManagePeopleTab
                        people={people}
                        isLoadingPeople={visibleLoadingPeople}
                        isDataFetchedAtLeastOnce={visibleDataFetchedAtLeastOnce}
                      />
                    </WindowsExperienceCrashGate>
                  </SettleEaseErrorBoundary>
                )}
                {(userRole === 'admin' || visiblePageSkeleton) && renderedActiveView === 'manageCategories' && (
                  <SettleEaseErrorBoundary
                    componentName="Manage Categories"
                    size="large"
                    resetKey={windowsExperienceResetKey}
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <WindowsExperienceCrashGate componentName="Manage Categories">
                      <ManageCategoriesTab
                        categories={categories}
                        onCategoriesUpdate={handleActionComplete}
                        isLoadingCategories={visibleLoadingCategories}
                        isDataFetchedAtLeastOnce={visibleDataFetchedAtLeastOnce}
                      />
                    </WindowsExperienceCrashGate>
                  </SettleEaseErrorBoundary>
                )}
                {(userRole === 'admin' || visiblePageSkeleton) && renderedActiveView === 'manageSettlements' && (
                  <SettleEaseErrorBoundary
                    componentName="Manage Settlements"
                    size="large"
                    resetKey={windowsExperienceResetKey}
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <WindowsExperienceCrashGate componentName="Manage Settlements">
                      <ManageSettlementsTab
                        expenses={expenses}
                        people={people}
                        peopleMap={peopleMap}
                        settlementPayments={settlementPayments}
                        manualOverrides={manualOverrides}
                        currentUserId={currentUser?.id || ''}
                        onActionComplete={handleActionComplete}
                        isLoadingPeople={visibleLoadingPeople}
                        isLoadingExpenses={visibleLoadingExpenses}
                        isLoadingSettlements={visibleLoadingSettlements}
                        isLoadingOverrides={visibleLoadingOverrides}
                        isDataFetchedAtLeastOnce={visibleDataFetchedAtLeastOnce}
                        userRole={userRole}
                      />
                    </WindowsExperienceCrashGate>
                  </SettleEaseErrorBoundary>
                )}
                {(userRole === 'admin' || visiblePageSkeleton) && renderedActiveView === 'exportExpense' && (
                  <SettleEaseErrorBoundary
                    componentName="Export Expense"
                    size="large"
                    resetKey={windowsExperienceResetKey}
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <WindowsExperienceCrashGate componentName="Export Expense">
                      {visiblePageSkeleton ? (
                        <ExportExpenseSkeleton />
                      ) : (
                        <ExportExpenseTab
                          expenses={expenses}
                          settlementPayments={settlementPayments}
                          people={people}
                          categories={categories}
                          manualOverrides={manualOverrides}
                          peopleMap={peopleMap}
                          currentUserId={currentUser?.id}
                          getCategoryIconFromName={getCategoryIconFromName}
                        />
                      )}
                    </WindowsExperienceCrashGate>
                  </SettleEaseErrorBoundary>
                )}
                {(userRole === 'admin' || visiblePageSkeleton) && renderedActiveView === 'scanReceipt' && (
                  <SettleEaseErrorBoundary
                    componentName="Smart Scan"
                    size="large"
                    resetKey={windowsExperienceResetKey}
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    <WindowsExperienceCrashGate componentName="Smart Scan">
                      <ScanReceiptTab
                        people={people}
                        onExpenseAdded={handleExpenseAddedAndRedirect}
                        dynamicCategories={categories}
                        isLoadingPeople={visibleLoadingPeople}
                        isLoadingCategories={visibleLoadingCategories}
                        isDataFetchedAtLeastOnce={visibleDataFetchedAtLeastOnce}
                      />
                    </WindowsExperienceCrashGate>
                  </SettleEaseErrorBoundary>
                )}
                {(userRole === 'admin' || visiblePageSkeleton) && renderedActiveView === 'settings' && (
                  <SettleEaseErrorBoundary
                    componentName="Settings"
                    size="large"
                    resetKey={windowsExperienceResetKey}
                    onNavigateHome={() => setActiveView('dashboard')}
                  >
                    {visiblePageSkeleton ? (
                      <SettingsTabSkeleton />
                    ) : (
                      <SettingsTab
                        onNavigate={handleSetActiveView}
                        onEditProfileName={() => {
                          setIsNameModalEditMode(true);
                          setShowNameModal(true);
                        }}
                        onUpdateUserProfile={updateUserProfile}
                        people={people}
                        expenses={expenses}
                        categories={categories}
                        settlementPayments={settlementPayments}
                        manualOverrides={manualOverrides}
                        currentUserId={currentUser?.id}
                        currentUserEmail={currentUser?.email ?? null}
                        displayName={getDisplayName()}
                        userRole={userRole}
                        userProfile={userProfile}
                        isDevelopmentEnvironment={isDevelopmentEnvironment}
                      />
                    )}
                  </SettleEaseErrorBoundary>
                )}
              </div>
            </main>
            <MobileBottomNav
              activeView={activeView}
              setActiveView={handleSetActiveView}
              userRole={userRole}
              isLoading={visiblePageSkeleton || !isAppIdentityReady}
            />
          </div>
        </SidebarInset>
      </SidebarProvider >
      </WindowsExperienceProvider>
      <KeyboardShortcutsModal isOpen={showShortcuts} onOpenChange={setShowShortcuts} />
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
