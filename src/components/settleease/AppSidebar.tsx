
"use client";

import React from 'react';
import {
  Users, CreditCard, FilePenLine, ListChecks, LogOut, UserCog, ShieldCheck, LayoutDashboard, Handshake, HandCoins
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
        <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
        <p className="text-center text-xs text-sidebar-foreground/60 mt-3">
          Made by Gagan Gupta.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
