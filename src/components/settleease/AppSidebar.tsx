"use client";

import React from 'react';
import {
  Users, CreditCard, FilePenLine, ListChecks, LogOut, UserCog, ShieldCheck, LayoutDashboard, Handshake, HandCoins, BarChartBig, Settings, Sun, Moon, Bug, Edit3
} from 'lucide-react';
import { useTheme } from "next-themes";
import packageJson from '../../../package.json';

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
  useSidebar,
} from "@/components/ui/sidebar";
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
}

const AppSidebar = React.memo(function AppSidebar({ activeView, setActiveView, handleLogout, currentUserEmail, currentUserName, userRole, onEditName }: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { setTheme } = useTheme();
  const RoleIcon = userRole === 'admin' ? UserCog : ShieldCheck;

  const handleNavigation = (view: ActiveView) => {
    setActiveView(view);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
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
          {userRole === 'admin' && (
            <>
              {/* Expenses Section */}
              <div className="px-2 py-1 mt-4 group-data-[state=collapsed]:hidden">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses</p>
              </div>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleNavigation('addExpense')}
                  isActive={activeView === 'addExpense'}
                  tooltip={{ content: "Add Expense", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                  className="justify-start h-8"
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
                  className="justify-start h-8"
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
                  className="justify-start h-8"
                >
                  <Handshake className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Settlements</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Data Section */}
              <div className="px-2 py-1 mt-4 group-data-[state=collapsed]:hidden">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</p>
              </div>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleNavigation('managePeople')}
                  isActive={activeView === 'managePeople'}
                  tooltip={{ content: "Manage People", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                  className="justify-start h-8"
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
                  className="justify-start h-8"
                >
                  <ListChecks className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Categories</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* System Section */}
              <div className="px-2 py-1 mt-4 group-data-[state=collapsed]:hidden">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System</p>
              </div>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleNavigation('testErrorBoundary')}
                  isActive={activeView === 'testErrorBoundary'}
                  tooltip={{ content: "Test Error Boundary", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                  className="justify-start h-8"
                >
                  <Bug className="h-4 w-4" />
                  <span className="group-data-[state=collapsed]:hidden">Debug</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t group-data-[state=collapsed]:hidden">
        <div className="p-2">
          {(currentUserName || currentUserEmail) && (
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
                <DropdownMenu>
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
                    <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="mr-2 h-4 w-4" /> Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="mr-2 h-4 w-4" /> Dark
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
          <div className="text-center border-t pt-2">
            <p className="text-xs text-muted-foreground">Made by Gagan Gupta</p>
            <p className="text-xs text-muted-foreground/70">v{packageJson.version}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
});

export default AppSidebar;

