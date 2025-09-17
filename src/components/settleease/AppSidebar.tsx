"use client";

import React from 'react';
import {
  Users, CreditCard, FilePenLine, ListChecks, LogOut, UserCog, ShieldCheck, LayoutDashboard, Handshake, HandCoins, BarChartBig, Settings, Sun, Moon, Bug, Edit3, ToggleLeft, ChevronDown, ChevronRight, TrendingUp, Database, Wrench
} from 'lucide-react';
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ActiveView, UserRole } from '@/lib/settleease';

// Google Gemini SVG Icon
const GeminiIcon = () => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block align-middle"
  >
    <path d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z" fill="url(#prefix__paint0_radial_980_20147)" />
    <defs>
      <radialGradient id="prefix__paint0_radial_980_20147" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(16.1326 5.4553 -43.70045 129.2322 1.588 6.503)">
        <stop offset=".067" stopColor="#9168C0" />
        <stop offset=".343" stopColor="#5684D1" />
        <stop offset=".672" stopColor="#1BA1E3" />
      </radialGradient>
    </defs>
  </svg>
);


interface AppSidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  handleLogout: () => void;
  currentUserEmail?: string | null;
  currentUserName?: string;
  userRole: UserRole;
  onEditName?: () => void;
  isFeatureEnabled?: (featureName: string) => boolean;
  featureFlags?: any[]; // Add this to trigger re-renders
}

const AppSidebar = React.memo(function AppSidebar({ activeView, setActiveView, handleLogout, currentUserEmail, currentUserName, userRole, onEditName, isFeatureEnabled, featureFlags }: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { setTheme } = useTheme();
  const RoleIcon = userRole === 'admin' ? UserCog : ShieldCheck;

  // State for collapsible sections
  const [isInsightsOpen, setIsInsightsOpen] = React.useState(true);
  const [isExpenseManagementOpen, setIsExpenseManagementOpen] = React.useState(true);
  const [isDataManagementOpen, setIsDataManagementOpen] = React.useState(false);
  const [isSystemOpen, setIsSystemOpen] = React.useState(false);

  const handleNavigation = (view: ActiveView) => {
    setActiveView(view);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} side="left" variant="sidebar">
      {!isMobile && (
        <SidebarHeader className="flex flex-row items-center justify-center p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 h-10">
            <HandCoins className="h-8 w-8 text-sidebar-primary flex-shrink-0" />
            <h2 className="text-2xl font-bold text-sidebar-primary group-data-[state=collapsed]:hidden">SettleEase</h2>
          </div>
        </SidebarHeader>
      )}
      <SidebarContent className="p-3 space-y-3">
        <SidebarMenu>
          {/* Dashboard - Always visible */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => handleNavigation('dashboard')}
              isActive={activeView === 'dashboard'}
              tooltip={{ content: "Dashboard", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
              className="justify-start bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30 border border-slate-200 dark:border-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 data-[active=true]:bg-slate-200 dark:data-[active=true]:bg-slate-800 rounded-lg transition-all duration-200 font-semibold"
            >
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                <LayoutDashboard className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              <span className="group-data-[state=collapsed]:hidden text-slate-900 dark:text-slate-100">Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Insights & Analytics Section */}
        <SidebarGroup>
          <Collapsible open={isInsightsOpen} onOpenChange={setIsInsightsOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="group/collapsible w-full flex items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 group-data-[state=collapsed]:hidden bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-md">
                    <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-blue-900 dark:text-blue-100">Insights</span>
                </div>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 text-blue-600 dark:text-blue-400" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="mt-2">
                <SidebarMenu>
                  {isFeatureEnabled?.('analytics') && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('analytics')}
                        isActive={activeView === 'analytics'}
                        tooltip={{ content: "Analytics", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                        className="justify-start ml-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 data-[active=true]:bg-blue-100 dark:data-[active=true]:bg-blue-900/50 data-[active=true]:text-blue-900 dark:data-[active=true]:text-blue-100 rounded-lg transition-all duration-200"
                      >
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/50 rounded">
                          <BarChartBig className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="group-data-[state=collapsed]:hidden font-medium">Analytics</span>
                        {isFeatureEnabled?.('analytics') && (
                          <div className="ml-auto flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-medium">
                              ACTIVE
                            </span>
                          </div>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {isFeatureEnabled?.('activityFeed') && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('activityFeed')}
                        isActive={activeView === 'activityFeed'}
                        tooltip={{ content: "Activity Feed", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                        className="justify-start ml-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 data-[active=true]:bg-blue-100 dark:data-[active=true]:bg-blue-900/50 data-[active=true]:text-blue-900 dark:data-[active=true]:text-blue-100 rounded-lg transition-all duration-200"
                      >
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/50 rounded">
                          <Edit3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="group-data-[state=collapsed]:hidden font-medium">Activity Feed</span>
                        {isFeatureEnabled?.('activityFeed') && (
                          <div className="ml-auto flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-medium">
                              ACTIVE
                            </span>
                          </div>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Admin Only Sections */}
        {userRole === 'admin' && (
          <>
            {/* Expense Management Section */}
            <SidebarGroup>
              <Collapsible open={isExpenseManagementOpen} onOpenChange={setIsExpenseManagementOpen}>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="group/collapsible w-full flex items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 group-data-[state=collapsed]:hidden bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-100 dark:border-emerald-800/30">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-md">
                        <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-emerald-900 dark:text-emerald-100">Expenses</span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 text-emerald-600 dark:text-emerald-400" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent className="mt-2">
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('addExpense')}
                          isActive={activeView === 'addExpense'}
                          tooltip={{ content: "Add Expense", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 data-[active=true]:bg-emerald-100 dark:data-[active=true]:bg-emerald-900/50 data-[active=true]:text-emerald-900 dark:data-[active=true]:text-emerald-100 rounded-lg transition-all duration-200"
                        >
                          <div className="p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded">
                            <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="group-data-[state=collapsed]:hidden font-medium">Add Expense</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('editExpenses')}
                          isActive={activeView === 'editExpenses'}
                          tooltip={{ content: "Edit Expenses", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 data-[active=true]:bg-emerald-100 dark:data-[active=true]:bg-emerald-900/50 data-[active=true]:text-emerald-900 dark:data-[active=true]:text-emerald-100 rounded-lg transition-all duration-200"
                        >
                          <div className="p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded">
                            <FilePenLine className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="group-data-[state=collapsed]:hidden font-medium">Edit Expenses</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('manageSettlements')}
                          isActive={activeView === 'manageSettlements'}
                          tooltip={{ content: "Manage Settlements", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 data-[active=true]:bg-emerald-100 dark:data-[active=true]:bg-emerald-900/50 data-[active=true]:text-emerald-900 dark:data-[active=true]:text-emerald-100 rounded-lg transition-all duration-200"
                        >
                          <div className="p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded">
                            <Handshake className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="group-data-[state=collapsed]:hidden font-medium">Settlements</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            {/* Data Management Section */}
            <SidebarGroup>
              <Collapsible open={isDataManagementOpen} onOpenChange={setIsDataManagementOpen}>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="group/collapsible w-full flex items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 group-data-[state=collapsed]:hidden bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border border-purple-100 dark:border-purple-800/30">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-md">
                        <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-purple-900 dark:text-purple-100">Data</span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 text-purple-600 dark:text-purple-400" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent className="mt-2">
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('managePeople')}
                          isActive={activeView === 'managePeople'}
                          tooltip={{ content: "Manage People", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-2 hover:bg-purple-50 dark:hover:bg-purple-950/30 data-[active=true]:bg-purple-100 dark:data-[active=true]:bg-purple-900/50 data-[active=true]:text-purple-900 dark:data-[active=true]:text-purple-100 rounded-lg transition-all duration-200"
                        >
                          <div className="p-1 bg-purple-100 dark:bg-purple-900/50 rounded">
                            <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="group-data-[state=collapsed]:hidden font-medium">People</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('manageCategories')}
                          isActive={activeView === 'manageCategories'}
                          tooltip={{ content: "Manage Categories", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-2 hover:bg-purple-50 dark:hover:bg-purple-950/30 data-[active=true]:bg-purple-100 dark:data-[active=true]:bg-purple-900/50 data-[active=true]:text-purple-900 dark:data-[active=true]:text-purple-100 rounded-lg transition-all duration-200"
                        >
                          <div className="p-1 bg-purple-100 dark:bg-purple-900/50 rounded">
                            <ListChecks className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="group-data-[state=collapsed]:hidden font-medium">Categories</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            {/* System & Tools Section */}
            <SidebarGroup>
              <Collapsible open={isSystemOpen} onOpenChange={setIsSystemOpen}>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="group/collapsible w-full flex items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 group-data-[state=collapsed]:hidden bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-100 dark:border-orange-800/30">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-md">
                        <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-orange-900 dark:text-orange-100">System</span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 text-orange-600 dark:text-orange-400" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent className="mt-2">
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('featureRollout')}
                          isActive={activeView === 'featureRollout'}
                          tooltip={{ content: "Feature Rollout", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-2 hover:bg-orange-50 dark:hover:bg-orange-950/30 data-[active=true]:bg-orange-100 dark:data-[active=true]:bg-orange-900/50 data-[active=true]:text-orange-900 dark:data-[active=true]:text-orange-100 rounded-lg transition-all duration-200"
                        >
                          <div className="p-1 bg-orange-100 dark:bg-orange-900/50 rounded">
                            <ToggleLeft className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <span className="group-data-[state=collapsed]:hidden font-medium">Features</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('testErrorBoundary')}
                          isActive={activeView === 'testErrorBoundary'}
                          tooltip={{ content: "Test Error Boundary", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-2 hover:bg-orange-50 dark:hover:bg-orange-950/30 data-[active=true]:bg-orange-100 dark:data-[active=true]:bg-orange-900/50 data-[active=true]:text-orange-900 dark:data-[active=true]:text-orange-100 rounded-lg transition-all duration-200"
                        >
                          <div className="p-1 bg-orange-100 dark:bg-orange-900/50 rounded">
                            <Bug className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <span className="group-data-[state=collapsed]:hidden font-medium">Debug</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="flex flex-col border-t border-sidebar-border/30 group-data-[state=collapsed]:hidden bg-gradient-to-t from-sidebar-background/50 to-transparent">
        <div className="p-3 space-y-3">
          {(currentUserName || currentUserEmail) && (
            <div className="bg-sidebar-accent/30 rounded-lg p-3 border border-sidebar-border/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-grow overflow-hidden">
                  <p className="text-sm text-sidebar-foreground font-medium truncate" title={currentUserName || currentUserEmail || ''}>
                    {currentUserName || currentUserEmail}
                  </p>
                  {userRole && (
                    <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70" title={`Role: ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`}>
                      <div className="p-1 bg-sidebar-accent/50 rounded">
                        <RoleIcon className="h-3 w-3 shrink-0" />
                      </div>
                      <span className="font-medium">{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8 ml-2 shrink-0 rounded-lg">
                      <Settings className="h-4 w-4" />
                      <span className="sr-only">Settings & Actions</span>
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
                    <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="mr-2 h-4 w-4" /> Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="mr-2 h-4 w-4" /> Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Settings className="mr-2 h-4 w-4" /> System
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          <div className="text-center border-t border-sidebar-border/20 pt-3">
            <p className="text-[11px] text-sidebar-foreground/50 flex items-center justify-center gap-1">
              <span>Made with ❤️ by Gagan Gupta</span>
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
});

export default AppSidebar;

