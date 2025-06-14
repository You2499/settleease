
"use client";

import React from 'react';
import {
  Users, CreditCard, FilePenLine, ListChecks, LogOut, UserCog, ShieldCheck, LayoutDashboard, Handshake, HandCoins, BarChartBig
} from 'lucide-react';

import { Button } from "@/components/ui/button";
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
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block align-middle" // Added class for better alignment control if needed
  >
    <path
      d="M6.08333 12.8333C5.275 12.8333 4.5 12.5208 3.875 11.8958C3.25 11.2708 2.9375 10.5 2.9375 9.625V4.375C2.9375 3.5 3.25 2.72917 3.875 2.10417C4.5 1.47917 5.275 1.16667 6.08333 1.16667C6.89167 1.16667 7.65417 1.47917 8.27917 2.10417C8.90417 2.72917 9.21667 3.5 9.21667 4.375V5.52083H8.05V4.375C8.05 3.8125 7.87917 3.34375 7.5375 2.96875C7.19583 2.59375 6.76667 2.40625 6.08333 2.40625C5.4 2.40625 4.9625 2.59375 4.625 2.96875C4.2875 3.34375 4.11667 3.8125 4.11667 4.375V9.625C4.11667 10.1875 4.2875 10.6562 4.625 11.0312C4.9625 11.4062 5.4 11.5937 6.08333 11.5937C6.76667 11.5937 7.19583 11.4062 7.5375 11.0312C7.87917 10.6562 8.05 10.1875 8.05 9.625V8.47917H9.21667V9.625C9.21667 10.5 8.90417 11.2708 8.27917 11.8958C7.65417 12.5208 6.89167 12.8333 6.08333 12.8333ZM11.0625 8.69271V7.30729L12.8333 6.41667V5.25L10.5 6.16667V1H9.33333V6.16667L7 5.25V6.41667L8.77083 7.30729V8.69271L7 9.58333V10.75L9.33333 9.83333V13H10.5V9.83333L12.8333 10.75V9.58333L11.0625 8.69271Z"
      fill="currentColor"
    />
  </svg>
);


interface AppSidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  handleLogout: () => void;
  currentUserEmail?: string | null;
  userRole: UserRole;
}

export default function AppSidebar({ activeView, setActiveView, handleLogout, currentUserEmail, userRole }: AppSidebarProps) {
  const { isMobile } = useSidebar();
  const RoleIcon = userRole === 'admin' ? UserCog : ShieldCheck;

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} side="left" variant="sidebar">
      <SidebarHeader className="flex flex-row items-center justify-start p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 h-10">
          <HandCoins className="h-8 w-8 text-sidebar-primary flex-shrink-0" />
          <h2 className="text-2xl font-bold text-sidebar-primary group-data-[state=collapsed]:hidden">SettleEase</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setActiveView('dashboard')}
              isActive={activeView === 'dashboard'}
              tooltip={{ content: "Dashboard", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
              className="justify-start"
            >
              <LayoutDashboard />
              <span className="group-data-[state=collapsed]:hidden">Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setActiveView('analytics')}
              isActive={activeView === 'analytics'}
              tooltip={{ content: "Analytics", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
              className="justify-start"
            >
              <BarChartBig />
              <span className="group-data-[state=collapsed]:hidden">Analytics</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {userRole === 'admin' && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveView('addExpense')}
                  isActive={activeView === 'addExpense'}
                  tooltip={{ content: "Add Expense", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                  className="justify-start"
                >
                  <CreditCard />
                  <span className="group-data-[state=collapsed]:hidden">Add Expense</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveView('editExpenses')}
                  isActive={activeView === 'editExpenses'}
                  tooltip={{ content: "Edit Expenses", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                  className="justify-start"
                >
                  <FilePenLine />
                  <span className="group-data-[state=collapsed]:hidden">Edit Expenses</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveView('managePeople')}
                  isActive={activeView === 'managePeople'}
                  tooltip={{ content: "Manage People", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                  className="justify-start"
                >
                  <Users />
                  <span className="group-data-[state=collapsed]:hidden">Manage People</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveView('manageCategories')}
                  isActive={activeView === 'manageCategories'}
                  tooltip={{ content: "Manage Categories", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                  className="justify-start"
                >
                  <ListChecks />
                  <span className="group-data-[state=collapsed]:hidden">Manage Categories</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveView('manageSettlements')}
                  isActive={activeView === 'manageSettlements'}
                  tooltip={{ content: "Manage Settlements", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
                  className="justify-start"
                >
                  <Handshake />
                  <span className="group-data-[state=collapsed]:hidden">Manage Settlements</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border group-data-[state=collapsed]:hidden">
         {currentUserEmail && (
          <div className="mb-2 space-y-0.5">
            <p className="text-xs text-sidebar-foreground/70 truncate" title={currentUserEmail}>
              Logged in as: {currentUserEmail}
            </p>
            {userRole && (
              <p className="text-xs text-sidebar-foreground/70 flex items-center" title={`Role: ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`}>
                Role: <RoleIcon className="ml-1 mr-0.5 h-3.5 w-3.5" /> {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </p>
            )}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout} className="w-full my-2">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
        <p className="text-center text-xs text-sidebar-foreground/60 flex items-center justify-center gap-1">
          <span>Made by Gagan Gupta with</span>
          <GeminiIcon />
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}

