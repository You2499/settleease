"use client";

import React, { useState } from 'react';
import {
  Users, CreditCard, FilePenLine, ListChecks, LogOut, UserCog, ShieldCheck, Home, Handshake, HandCoins, BarChartBig, Settings, Sun, Moon, Edit3, ScanLine, ChevronDown, ChevronRight, Keyboard, Heart, AlertTriangle
} from 'lucide-react';
import { useTheme } from "next-themes";
import packageJson from '../../../package.json';

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion } from "./SkeletonLayouts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ActiveView, UserRole } from '@/lib/settleease';
import ShortcutHint from './ShortcutHint';

interface AppSidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  handleLogout: () => void;
  currentUserEmail?: string | null;
  currentUserName?: string;
  userRole: UserRole;
  onEditName?: () => void;
  onShowShortcuts?: () => void;
  isProfileLoading?: boolean;
  isDevelopmentEnvironment?: boolean;
}

const sidebarShortcutHintClass =
  "ml-auto !overflow-visible group-data-[state=collapsed]:absolute group-data-[state=collapsed]:left-4 group-data-[state=collapsed]:top-[-0.35rem] group-data-[state=collapsed]:z-50 group-data-[state=collapsed]:ml-0 group-data-[state=collapsed]:scale-[0.68] group-data-[state=collapsed]:border-foreground/15 group-data-[state=collapsed]:bg-background group-data-[state=collapsed]:px-1 group-data-[state=collapsed]:shadow-md";

function getUserInitials(name?: string | null, email?: string | null) {
  const source = (name || email || 'SettleEase').trim();
  if (!source) return 'SE';

  if (source.includes('@')) {
    return source.charAt(0).toUpperCase();
  }

  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'SE';
}

const AppSidebar = React.memo(function AppSidebar({ activeView, setActiveView, handleLogout, currentUserEmail, currentUserName, userRole, onEditName, onShowShortcuts, isProfileLoading = false, isDevelopmentEnvironment = false }: AppSidebarProps) {
  const { isMobile, setOpenMobile, state } = useSidebar();
  const { setTheme } = useTheme();
  const RoleIcon = userRole === 'admin' ? UserCog : ShieldCheck;
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  
  // Collapsible section states
  const [expensesOpen, setExpensesOpen] = useState(true);
  const [dataOpen, setDataOpen] = useState(true);

  const isCollapsed = state === 'collapsed';
  const shouldShowAdminNav = userRole === 'admin' && !isProfileLoading;
  const displayUserName = currentUserName || currentUserEmail || '';
  const userInitials = getUserInitials(currentUserName, currentUserEmail);
  const roleLabel = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Member';

  React.useEffect(() => {
    const handleOpenProfileMenu = () => {
      if (!isProfileLoading && displayUserName && !isLoggingOut) {
        setDropdownOpen(true);
      }
    };

    window.addEventListener("settleease:open-profile-menu", handleOpenProfileMenu);
    return () => window.removeEventListener("settleease:open-profile-menu", handleOpenProfileMenu);
  }, [displayUserName, isLoggingOut, isProfileLoading]);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await handleLogout();
  };

  const handleNavigation = (view: ActiveView) => {
    if (isProfileLoading) return;
    setActiveView(view);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const renderProfileMenuContent = (side: "top" | "right" = "top") => (
    <DropdownMenuContent side={side} align="end" className="w-52">
      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Profile</DropdownMenuLabel>
      {onEditName && (
        <DropdownMenuItem onClick={onEditName}>
          <Edit3 className="mr-2 h-4 w-4" /> Edit Name
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Theme</DropdownMenuLabel>
      <DropdownMenuItem onClick={() => setTheme("light")}>
        <Sun className="mr-2 h-4 w-4" /> Light
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("dark")}>
        <Moon className="mr-2 h-4 w-4" /> Dark
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => onShowShortcuts?.()}>
        <Keyboard className="mr-2 h-4 w-4" /> Shortcuts
        <DropdownMenuShortcut>
          <ShortcutHint
            shortcutId="action.shortcuts"
            alwaysVisible
            className="border-0 bg-transparent px-0 py-0 shadow-none"
          />
        </DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {isDevelopmentEnvironment ? (
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Auth disabled locally
        </DropdownMenuLabel>
      ) : (
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void handleLogoutClick();
          }}
          disabled={isLoggingOut}
          className={`transition-all duration-200 ${isLoggingOut
            ? 'bg-gray-100 hover:bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
            : 'text-destructive focus:bg-destructive/10 focus:text-destructive'
          }`}
        >
          <LogOut className={`mr-2 h-4 w-4 transition-opacity duration-200 ${isLoggingOut ? 'opacity-50' : 'opacity-100'}`} />
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  );

  return (
    <>
      <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} side="left" variant="sidebar">
        {!isMobile && (
          <SidebarHeader className="flex flex-row items-center justify-center p-3 border-b">
            <div className="flex items-center gap-2">
              <HandCoins className="h-6 w-6 text-primary flex-shrink-0" />
              <h2 className="text-lg font-bold text-primary group-data-[state=collapsed]:hidden">SettleEase</h2>
            </div>
          </SidebarHeader>
        )}
        <SidebarContent className="p-2">
          <SidebarMenu className="space-y-1">
            {/* Home */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => handleNavigation('dashboard')}
                isActive={activeView === 'dashboard'}
                tooltip={{ content: "Home", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                className="relative justify-start h-8"
              >
                <Home className="h-4 w-4" />
                <span className="min-w-0 flex-1 group-data-[state=collapsed]:hidden">Home</span>
                <ShortcutHint shortcutId="nav.dashboard" className={sidebarShortcutHintClass} compact />
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Insights Section */}
            <div className="px-2 py-1 mt-4 group-data-[state=collapsed]:hidden">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Insights</p>
            </div>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => handleNavigation('health')}
                isActive={activeView === 'health'}
                tooltip={{ content: "Health", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                className="relative justify-start h-8"
              >
                <Heart className="h-4 w-4" />
                <span className="min-w-0 flex-1 group-data-[state=collapsed]:hidden">Health</span>
                <ShortcutHint shortcutId="nav.health" className={sidebarShortcutHintClass} compact />
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => handleNavigation('analytics')}
                isActive={activeView === 'analytics'}
                tooltip={{ content: "Analytics", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                className="relative justify-start h-8"
              >
                <BarChartBig className="h-4 w-4" />
                <span className="min-w-0 flex-1 group-data-[state=collapsed]:hidden">Analytics</span>
                <ShortcutHint shortcutId="nav.analytics" className={sidebarShortcutHintClass} compact />
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Admin Only Sections */}
            {isProfileLoading && (
              <LoadingRegion label="Loading navigation" className="space-y-1">
                <div className="px-2 py-1 mt-4 group-data-[state=collapsed]:hidden">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-3 rounded" />
                  </div>
                </div>
                {[0, 1, 2, 3].map((item) => (
                  <SidebarMenuItem key={`expenses-${item}`}>
                    <div className="flex h-8 items-center gap-2 px-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-28 group-data-[state=collapsed]:hidden" />
                    </div>
                  </SidebarMenuItem>
                ))}
                <div className="px-2 py-1 mt-4 group-data-[state=collapsed]:hidden">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-3 rounded" />
                  </div>
                </div>
                {[0, 1].map((item) => (
                  <SidebarMenuItem key={`data-${item}`}>
                    <div className="flex h-8 items-center gap-2 px-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-24 group-data-[state=collapsed]:hidden" />
                    </div>
                  </SidebarMenuItem>
                ))}
                <div className="px-2 py-1 mt-4 group-data-[state=collapsed]:hidden">
                  <Skeleton className="h-3 w-16" />
                </div>
                <SidebarMenuItem>
                  <div className="flex h-8 items-center gap-2 px-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-20 group-data-[state=collapsed]:hidden" />
                  </div>
                </SidebarMenuItem>
              </LoadingRegion>
            )}

            {shouldShowAdminNav && (
              <>
                {/* Expenses Section - Collapsible */}
                {!isCollapsed ? (
                  <Collapsible open={expensesOpen} onOpenChange={setExpensesOpen} className="mt-4">
                    <CollapsibleTrigger asChild>
                      <div className="px-2 py-1 flex items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses</p>
                        {expensesOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('addExpense')}
                          isActive={activeView === 'addExpense'}
                          className="relative justify-start h-8"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span className="min-w-0 flex-1">Add Expense</span>
                          <ShortcutHint shortcutId="nav.addExpense" className={sidebarShortcutHintClass} compact />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('scanReceipt')}
                          isActive={activeView === 'scanReceipt'}
                          className="relative justify-start h-8"
                        >
                          <ScanLine className="h-4 w-4" />
                          <span className="min-w-0 flex-1">Smart Scan</span>
                          <ShortcutHint shortcutId="nav.scanReceipt" className={sidebarShortcutHintClass} compact />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('editExpenses')}
                          isActive={activeView === 'editExpenses'}
                          className="relative justify-start h-8"
                        >
                          <FilePenLine className="h-4 w-4" />
                          <span className="min-w-0 flex-1">Edit Expenses</span>
                          <ShortcutHint shortcutId="nav.editExpenses" className={sidebarShortcutHintClass} compact />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('manageSettlements')}
                          isActive={activeView === 'manageSettlements'}
                          className="relative justify-start h-8"
                        >
                          <Handshake className="h-4 w-4" />
                          <span className="min-w-0 flex-1">Settlements</span>
                          <ShortcutHint shortcutId="nav.manageSettlements" className={sidebarShortcutHintClass} compact />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  // Collapsed state - show icons with tooltips
                  <>
                    <div className="px-2 py-1 mt-4" />
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('addExpense')}
                        isActive={activeView === 'addExpense'}
                        tooltip={{ content: "Add Expense", side: "right", align: "center" }}
                        className="relative justify-start h-8"
                      >
                        <CreditCard className="h-4 w-4" />
                        <ShortcutHint shortcutId="nav.addExpense" className={sidebarShortcutHintClass} compact />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('scanReceipt')}
                        isActive={activeView === 'scanReceipt'}
                        tooltip={{ content: "Smart Scan", side: "right", align: "center" }}
                        className="relative justify-start h-8"
                      >
                        <ScanLine className="h-4 w-4" />
                        <ShortcutHint shortcutId="nav.scanReceipt" className={sidebarShortcutHintClass} compact />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('editExpenses')}
                        isActive={activeView === 'editExpenses'}
                        tooltip={{ content: "Edit Expenses", side: "right", align: "center" }}
                        className="relative justify-start h-8"
                      >
                        <FilePenLine className="h-4 w-4" />
                        <ShortcutHint shortcutId="nav.editExpenses" className={sidebarShortcutHintClass} compact />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('manageSettlements')}
                        isActive={activeView === 'manageSettlements'}
                        tooltip={{ content: "Settlements", side: "right", align: "center" }}
                        className="relative justify-start h-8"
                      >
                        <Handshake className="h-4 w-4" />
                        <ShortcutHint shortcutId="nav.manageSettlements" className={sidebarShortcutHintClass} compact />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}

                {/* Data Section - Collapsible */}
                {!isCollapsed ? (
                  <Collapsible open={dataOpen} onOpenChange={setDataOpen} className="mt-4">
                    <CollapsibleTrigger asChild>
                      <div className="px-2 py-1 flex items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</p>
                        {dataOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('managePeople')}
                          isActive={activeView === 'managePeople'}
                          className="relative justify-start h-8"
                        >
                          <Users className="h-4 w-4" />
                          <span className="min-w-0 flex-1">People</span>
                          <ShortcutHint shortcutId="nav.managePeople" className={sidebarShortcutHintClass} compact />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('manageCategories')}
                          isActive={activeView === 'manageCategories'}
                          className="relative justify-start h-8"
                        >
                          <ListChecks className="h-4 w-4" />
                          <span className="min-w-0 flex-1">Categories</span>
                          <ShortcutHint shortcutId="nav.manageCategories" className={sidebarShortcutHintClass} compact />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  // Collapsed state
                  <>
                    <div className="px-2 py-1 mt-4" />
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('managePeople')}
                        isActive={activeView === 'managePeople'}
                        tooltip={{ content: "People", side: "right", align: "center" }}
                        className="relative justify-start h-8"
                      >
                        <Users className="h-4 w-4" />
                        <ShortcutHint shortcutId="nav.managePeople" className={sidebarShortcutHintClass} compact />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('manageCategories')}
                        isActive={activeView === 'manageCategories'}
                        tooltip={{ content: "Categories", side: "right", align: "center" }}
                        className="relative justify-start h-8"
                      >
                        <ListChecks className="h-4 w-4" />
                        <ShortcutHint shortcutId="nav.manageCategories" className={sidebarShortcutHintClass} compact />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}

                {/* Settings */}
                <div className="px-2 py-1 mt-4 group-data-[state=collapsed]:hidden">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System</p>
                </div>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => handleNavigation('settings')}
                    isActive={activeView === 'settings'}
                    tooltip={{ content: "Settings", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                    className="relative justify-start h-8"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="min-w-0 flex-1 group-data-[state=collapsed]:hidden">Settings</span>
                    <ShortcutHint shortcutId="nav.settings" className={sidebarShortcutHintClass} compact />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border bg-sidebar/95 px-2 py-2">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              {isDevelopmentEnvironment && (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200"
                  title="Development environment"
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
              )}
              {isProfileLoading ? (
                <Skeleton className="h-8 w-8 rounded-md" />
              ) : displayUserName ? (
                <>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground text-xs font-medium text-sidebar"
                    title={displayUserName}
                    aria-label={`${displayUserName}, ${roleLabel}`}
                  >
                    {userInitials}
                  </div>
                  <DropdownMenu open={dropdownOpen} onOpenChange={(open) => !isLoggingOut && setDropdownOpen(open)}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-8 w-8 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring"
                        aria-label="Open profile menu"
                        disabled={isLoggingOut}
                      >
                        <Settings className="h-4 w-4" />
                        <ShortcutHint
                          shortcutId="action.profileMenu"
                          className="pointer-events-none absolute -right-2 -top-1 scale-75 border-sidebar-border bg-sidebar px-1"
                          compact
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    {renderProfileMenuContent("right")}
                  </DropdownMenu>
                </>
              ) : null}
              <span className="text-[10px] leading-none text-muted-foreground">v{packageJson.version}</span>
            </div>
          ) : (
          <div className="space-y-2">
            {isDevelopmentEnvironment && (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      Development
                    </p>
                    <p className="truncate text-[11px] leading-4 text-amber-900/70 dark:text-amber-50/70">
                      Dev database - Auth disabled
                    </p>
                  </div>
                </div>
              </div>
            )}
            {isProfileLoading ? (
              <LoadingRegion label="Loading profile" className="rounded-md border border-sidebar-border bg-sidebar-accent/35 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32 max-w-full" />
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-3 w-3 rounded" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </LoadingRegion>
            ) : displayUserName && (
              <DropdownMenu open={dropdownOpen} onOpenChange={(open) => !isLoggingOut && setDropdownOpen(open)}>
                <div className="flex w-full items-center gap-2 overflow-hidden rounded-md border border-sidebar-border bg-sidebar-accent/35 px-2.5 py-2 text-left shadow-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-foreground text-xs font-medium text-sidebar">
                    {userInitials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-5" title={displayUserName}>
                      {displayUserName}
                    </span>
                    <span className="flex items-center gap-1 text-xs leading-4 text-muted-foreground">
                      <RoleIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{roleLabel}</span>
                    </span>
                  </span>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring"
                      aria-label="Open profile menu"
                      disabled={isLoggingOut}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <ShortcutHint
                        shortcutId="action.profileMenu"
                        className="pointer-events-none absolute -right-1 -top-1 scale-75 border-sidebar-border bg-sidebar px-1"
                        compact
                      />
                    </Button>
                  </DropdownMenuTrigger>
                </div>
                {renderProfileMenuContent()}
              </DropdownMenu>
            )}
            <div className="flex items-center justify-between border-t border-sidebar-border/70 pt-2 text-[11px] leading-4 text-muted-foreground">
              <span>SettleEase</span>
              <span>v{packageJson.version}</span>
            </div>
          </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  );
});

export default AppSidebar;
