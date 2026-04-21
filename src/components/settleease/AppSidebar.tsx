"use client";

import React, { useState } from 'react';
import {
  Users, CreditCard, FilePenLine, ListChecks, LogOut, UserCog, ShieldCheck, LayoutDashboard, Handshake, HandCoins, BarChartBig, Settings, Sun, Moon, Edit3, ScanLine, ChevronDown, ChevronRight, Keyboard, Activity
} from 'lucide-react';
import { useTheme } from "next-themes";
import packageJson from '../../../package.json';

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

interface AppSidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  handleLogout: () => void;
  currentUserEmail?: string | null;
  currentUserName?: string;
  userRole: UserRole;
  onEditName?: () => void;
  isProfileLoading?: boolean;
}

const AppSidebar = React.memo(function AppSidebar({ activeView, setActiveView, handleLogout, currentUserEmail, currentUserName, userRole, onEditName, isProfileLoading = false }: AppSidebarProps) {
  const { isMobile, setOpenMobile, state } = useSidebar();
  const { setTheme } = useTheme();
  const RoleIcon = userRole === 'admin' ? UserCog : ShieldCheck;
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  
  // Collapsible section states
  const [expensesOpen, setExpensesOpen] = useState(true);
  const [dataOpen, setDataOpen] = useState(true);

  const isCollapsed = state === 'collapsed';
  const shouldShowAdminNav = userRole === 'admin' && !isProfileLoading;

  const handleLogoutClick = async (e: React.MouseEvent) => {
    e.preventDefault();
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
            {/* Dashboard */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => handleNavigation('dashboard')}
                isActive={activeView === 'dashboard'}
                tooltip={{ content: "Dashboard", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                className="justify-start h-8"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="group-data-[state=collapsed]:hidden">Dashboard</span>
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
                className="justify-start h-8"
              >
                <Activity className="h-4 w-4" />
                <span className="group-data-[state=collapsed]:hidden">Health</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => handleNavigation('analytics')}
                isActive={activeView === 'analytics'}
                tooltip={{ content: "Analytics", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                className="justify-start h-8"
              >
                <BarChartBig className="h-4 w-4" />
                <span className="group-data-[state=collapsed]:hidden">Analytics</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Admin Only Sections */}
            {isProfileLoading && (
              <>
                <div className="px-2 py-1 mt-4 group-data-[state=collapsed]:hidden">
                  <Skeleton className="h-3 w-20" />
                </div>
                {[0, 1, 2, 3].map((item) => (
                  <SidebarMenuItem key={item}>
                    <div className="flex h-8 items-center gap-2 px-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-28 group-data-[state=collapsed]:hidden" />
                    </div>
                  </SidebarMenuItem>
                ))}
              </>
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
                          className="justify-start h-8"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span>Add Expense</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('scanReceipt')}
                          isActive={activeView === 'scanReceipt'}
                          className="justify-start h-8"
                        >
                          <ScanLine className="h-4 w-4" />
                          <span>Smart Scan</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('editExpenses')}
                          isActive={activeView === 'editExpenses'}
                          className="justify-start h-8"
                        >
                          <FilePenLine className="h-4 w-4" />
                          <span>Edit Expenses</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('manageSettlements')}
                          isActive={activeView === 'manageSettlements'}
                          className="justify-start h-8"
                        >
                          <Handshake className="h-4 w-4" />
                          <span>Settlements</span>
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
                        className="justify-start h-8"
                      >
                        <CreditCard className="h-4 w-4" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('scanReceipt')}
                        isActive={activeView === 'scanReceipt'}
                        tooltip={{ content: "Smart Scan", side: "right", align: "center" }}
                        className="justify-start h-8"
                      >
                        <ScanLine className="h-4 w-4" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('editExpenses')}
                        isActive={activeView === 'editExpenses'}
                        tooltip={{ content: "Edit Expenses", side: "right", align: "center" }}
                        className="justify-start h-8"
                      >
                        <FilePenLine className="h-4 w-4" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('manageSettlements')}
                        isActive={activeView === 'manageSettlements'}
                        tooltip={{ content: "Settlements", side: "right", align: "center" }}
                        className="justify-start h-8"
                      >
                        <Handshake className="h-4 w-4" />
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
                          className="justify-start h-8"
                        >
                          <Users className="h-4 w-4" />
                          <span>People</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('manageCategories')}
                          isActive={activeView === 'manageCategories'}
                          className="justify-start h-8"
                        >
                          <ListChecks className="h-4 w-4" />
                          <span>Categories</span>
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
                        className="justify-start h-8"
                      >
                        <Users className="h-4 w-4" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('manageCategories')}
                        isActive={activeView === 'manageCategories'}
                        tooltip={{ content: "Categories", side: "right", align: "center" }}
                        className="justify-start h-8"
                      >
                        <ListChecks className="h-4 w-4" />
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
                    className="justify-start h-8"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="group-data-[state=collapsed]:hidden">Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t group-data-[state=collapsed]:hidden">
          <div className="p-2">
            {isProfileLoading ? (
              <div className="bg-sidebar-accent/50 rounded p-2 mb-2">
                <Skeleton className="h-4 w-36 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            ) : (currentUserName || currentUserEmail) && (
              <div className="bg-sidebar-accent/50 rounded p-2 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-medium truncate" title={currentUserName || currentUserEmail || ''}>
                      {currentUserName || currentUserEmail}
                    </p>
                    {userRole && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <RoleIcon className="h-3 w-3" />
                        <span>{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
                      </div>
                    )}
                  </div>
                  <DropdownMenu open={dropdownOpen} onOpenChange={(open) => !isLoggingOut && setDropdownOpen(open)}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Profile</DropdownMenuLabel>
                      {onEditName && (
                        <DropdownMenuItem onClick={onEditName}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit Name
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Theme</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setTheme("light")}>
                        <Sun className="mr-2 h-4 w-4" /> Light
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("dark")}>
                        <Moon className="mr-2 h-4 w-4" /> Dark
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowShortcuts(true)}>
                        <Keyboard className="mr-2 h-4 w-4" /> Shortcuts
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          handleLogoutClick(e as any);
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
            <div className="text-center border-t pt-2">
              <p className="text-xs text-muted-foreground">Made by Gagan Gupta</p>
              <p className="text-xs text-muted-foreground/70">SettleEase v{packageJson.version}</p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <KeyboardShortcutsModal isOpen={showShortcuts} onOpenChange={setShowShortcuts} />
    </>
  );
});

export default AppSidebar;
