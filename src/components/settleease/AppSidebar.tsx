
"use client";

import React from 'react';
import {
  Users, CreditCard, FilePenLine, ListChecks, LogOut, UserCog, ShieldCheck, LayoutDashboard
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
          <svg className="h-8 w-8 text-sidebar-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="1.5"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm-3.5-9.793l-.707.707L12 13.707l4.207-4.207-.707-.707L12 12.293l-3.5-3.5z" fillRule="evenodd" clipRule="evenodd"></path><path d="M6.001 16.999a5.5 5.5 0 0 1 9.365-4.034 5.5 5.5 0 0 1-1.166 8.033A5.482 5.482 0 0 1 12 20.999a5.482 5.482 0 0 1-2.599-0.698A5.501 5.501 0 0 1 6 17m6-1.001a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"></path><path d="M17.999 16.999a5.5 5.5 0 0 0-9.365-4.034 5.5 5.5 0 0 0 1.166 8.033A5.482 5.482 0 0 0 12 20.999a5.482 5.482 0 0 0 2.599-0.698A5.501 5.501 0 0 0 18 17m-6-1.001a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"></path></g></svg>
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
      </SidebarFooter>
    </Sidebar>
  );
}

