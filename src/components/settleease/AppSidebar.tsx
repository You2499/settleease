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
import { useFeatureInteractions } from '@/hooks/useFeatureInteractions';

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
  lastUpdated?: Date | null; // Add this to trigger re-renders on feature changes
}

const AppSidebar = React.memo(function AppSidebar({ activeView, setActiveView, handleLogout, currentUserEmail, currentUserName, userRole, onEditName, isFeatureEnabled, featureFlags, lastUpdated }: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { setTheme } = useTheme();
  const RoleIcon = userRole === 'admin' ? UserCog : ShieldCheck;
  const { markFeatureClicked, shouldShowIndicator } = useFeatureInteractions();

  // State for collapsible sections
  const [isInsightsOpen, setIsInsightsOpen] = React.useState(true);
  const [isExpenseManagementOpen, setIsExpenseManagementOpen] = React.useState(true);
  const [isDataManagementOpen, setIsDataManagementOpen] = React.useState(false);
  const [isSystemOpen, setIsSystemOpen] = React.useState(false);

  const handleNavigation = (view: ActiveView) => {
    // Track feature clicks for analytics and activityFeed
    if (view === 'analytics' || view === 'activityFeed') {
      markFeatureClicked(view);
    }

    setActiveView(view);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} side="left" variant="sidebar">
      {!isMobile && (
        <SidebarHeader className="flex flex-row items-center justify-center p-4 border-b">
          <div className="flex items-center gap-2 h-10">
            <HandCoins className="h-8 w-8 text-primary flex-shrink-0" />
            <h2 className="text-2xl font-bold text-primary group-data-[state=collapsed]:hidden">SettleEase</h2>
          </div>
        </SidebarHeader>
      )}
      <SidebarContent className="p-4">
        <SidebarMenu className="space-y-2">
          {/* Dashboard - Always visible */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => handleNavigation('dashboard')}
              isActive={activeView === 'dashboard'}
              tooltip={{ content: "Dashboard", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
              className="justify-start h-10 font-medium"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="group-data-[state=collapsed]:hidden">Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Insights & Analytics Section */}
        <SidebarGroup className="mt-6">
          <Collapsible open={isInsightsOpen} onOpenChange={setIsInsightsOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="group/collapsible w-full flex items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2 py-2 text-sm font-medium transition-colors group-data-[state=collapsed]:hidden">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Insights</span>
                </div>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="mt-1">
                <SidebarMenu className="space-y-1">
                  {isFeatureEnabled?.('analytics') && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavigation('analytics')}
                        isActive={activeView === 'analytics'}
                        tooltip={{ content: "Analytics", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                        className="justify-start ml-4 h-9 relative"
                      >
                        <BarChartBig className="h-4 w-4" />
                        <span className="group-data-[state=collapsed]:hidden">Analytics</span>
                        {shouldShowIndicator('analytics') && (
                          <div className="absolute -top-1 -right-1 group-data-[state=collapsed]:hidden">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
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
                        className="justify-start ml-4 h-9 relative"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span className="group-data-[state=collapsed]:hidden">Activity Feed</span>
                        {shouldShowIndicator('activityFeed') && (
                          <div className="absolute -top-1 -right-1 group-data-[state=collapsed]:hidden">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
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
            <SidebarGroup className="mt-6">
              <Collapsible open={isExpenseManagementOpen} onOpenChange={setIsExpenseManagementOpen}>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="group/collapsible w-full flex items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2 py-2 text-sm font-medium transition-colors group-data-[state=collapsed]:hidden">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Expenses</span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent className="mt-1">
                    <SidebarMenu className="space-y-1">
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('addExpense')}
                          isActive={activeView === 'addExpense'}
                          tooltip={{ content: "Add Expense", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-4 h-9"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span className="group-data-[state=collapsed]:hidden">Add Expense</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('editExpenses')}
                          isActive={activeView === 'editExpenses'}
                          tooltip={{ content: "Edit Expenses", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-4 h-9"
                        >
                          <FilePenLine className="h-4 w-4" />
                          <span className="group-data-[state=collapsed]:hidden">Edit Expenses</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('manageSettlements')}
                          isActive={activeView === 'manageSettlements'}
                          tooltip={{ content: "Manage Settlements", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-4 h-9"
                        >
                          <Handshake className="h-4 w-4" />
                          <span className="group-data-[state=collapsed]:hidden">Settlements</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            {/* Data Management Section */}
            <SidebarGroup className="mt-6">
              <Collapsible open={isDataManagementOpen} onOpenChange={setIsDataManagementOpen}>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="group/collapsible w-full flex items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2 py-2 text-sm font-medium transition-colors group-data-[state=collapsed]:hidden">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>Data</span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent className="mt-1">
                    <SidebarMenu className="space-y-1">
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('managePeople')}
                          isActive={activeView === 'managePeople'}
                          tooltip={{ content: "Manage People", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-4 h-9"
                        >
                          <Users className="h-4 w-4" />
                          <span className="group-data-[state=collapsed]:hidden">People</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('manageCategories')}
                          isActive={activeView === 'manageCategories'}
                          tooltip={{ content: "Manage Categories", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-4 h-9"
                        >
                          <ListChecks className="h-4 w-4" />
                          <span className="group-data-[state=collapsed]:hidden">Categories</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            {/* System & Tools Section */}
            <SidebarGroup className="mt-6">
              <Collapsible open={isSystemOpen} onOpenChange={setIsSystemOpen}>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="group/collapsible w-full flex items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2 py-2 text-sm font-medium transition-colors group-data-[state=collapsed]:hidden">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      <span>System</span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent className="mt-1">
                    <SidebarMenu className="space-y-1">
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('featureRollout')}
                          isActive={activeView === 'featureRollout'}
                          tooltip={{ content: "Feature Rollout", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-4 h-9"
                        >
                          <ToggleLeft className="h-4 w-4" />
                          <span className="group-data-[state=collapsed]:hidden">Features</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleNavigation('testErrorBoundary')}
                          isActive={activeView === 'testErrorBoundary'}
                          tooltip={{ content: "Test Error Boundary", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                          className="justify-start ml-4 h-9"
                        >
                          <Bug className="h-4 w-4" />
                          <span className="group-data-[state=collapsed]:hidden">Debug</span>
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
      <SidebarFooter className="border-t group-data-[state=collapsed]:hidden">
        <div className="p-4 space-y-4">
          {(currentUserName || currentUserEmail) && (
            <div className="bg-sidebar-accent/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-grow overflow-hidden">
                  <p className="text-sm font-medium truncate" title={currentUserName || currentUserEmail || ''}>
                    {currentUserName || currentUserEmail}
                  </p>
                  {userRole && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground" title={`Role: ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`}>
                      <RoleIcon className="h-3 w-3 shrink-0" />
                      <span>{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 shrink-0">
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

          <div className="text-center border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Made by Gagan Gupta
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
});

export default AppSidebar;

