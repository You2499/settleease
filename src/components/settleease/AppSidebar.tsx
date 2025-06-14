
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

// Google Gemini SVG Icon from Wikimedia Commons
const GeminiIcon = () => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 1024 1024"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block align-middle"
  >
    <path fill="url(#paint0_linear_13_98_new)" d="M608.896 1024c-91.947 0-182.229-35.05-250.261-100.487-70.232-67.642-111.787-158.925-111.787-258.048V256c0-99.122 41.555-190.405 111.787-258.048C426.667 29.927 516.949-5.123 608.896 0c91.947 0 182.229 35.05 250.261 100.487C929.39 168.13 970.945 259.412 970.945 358.535v122.093h-124.01V358.535c0-63.862-20.89-120.027-58.486-160.587-37.596-40.56-87.187-62.592-157.332-62.592-70.146 0-119.737 22.032-157.332 62.592-37.596 40.56-58.486 96.725-58.486 160.587V665.46c0 63.862 20.89 120.027 58.486 160.587 37.596 40.56 87.187 62.592 157.332 62.592 70.146 0 119.737-22.032 157.332-62.592 37.596-40.56 58.486-96.725 58.486-160.587V543.147h124.01v122.313c0 99.122-41.555 190.405-111.787 258.048-68.031 65.437-158.314 100.487-250.261 100.487Z"/>
    <path fill="url(#paint1_linear_13_98_new)" d="M300.16 398.507c-23.263-14.684-36.642-39.851-36.642-66.729V209.685c0-26.878 13.379-52.045 36.642-66.729C323.423 128.272 352.292 121 381.36 121h165.523L381.36 0H257.344C158.56 0 68.277 35.05 0 100.487 22.032 74.771 49.187 55.08 79.42 42.018c30.232-12.858 63.13-19.456 97.094-19.456h50.537v142.808c0 43.997-18.051 84.344-48.283 113.45-30.232 29.106-69.616 44.977-111.99 44.977H22.032l102.4 102.4h102.4c29.068 0 57.937-7.168 81.2-21.856Z"/>
    <path fill="url(#paint2_linear_13_98_new)" d="M166.487 726.187c30.232 12.858 63.13 19.456 97.094 19.456h50.537v142.808c0 43.997-18.051 84.344-48.283 113.45-30.232 29.106-69.616 44.977-111.99 44.977H22.032l102.4 102.4h102.4c29.068 0 57.937-7.168 81.2-21.856 23.263-14.684 36.642-39.851 36.642-66.729V822.016c0-26.878-13.379-52.045-36.642-66.729-23.263-14.684-52.132-21.856-81.2-21.856H100.487L0 835.834V623.53c41.555 67.642 111.787 102.656 209.685 102.656l102.4-102.4-102.4-102.4-33.258 34.645Z"/>
    <defs>
        <linearGradient id="paint0_linear_13_98_new" x1="422.49" x2="1007.83" y1="30.336" y2="978.082" gradientUnits="userSpaceOnUse">
            <stop stop-color="#6E95FC"/>
            <stop offset=".25" stop-color="#5FA0FF"/>
            <stop offset=".5" stop-color="#51ABFF"/>
            <stop offset=".75" stop-color="#42B5FF"/>
            <stop offset="1" stop-color="#34BEFF"/>
        </linearGradient>
        <linearGradient id="paint1_linear_13_98_new" x1="32.256" x2="490.368" y1="203.349" y2="210.155" gradientUnits="userSpaceOnUse">
            <stop stop-color="#8AB4F8"/>
            <stop offset="1" stop-color="#A7C5FC"/>
        </linearGradient>
        <linearGradient id="paint2_linear_13_98_new" x1="29.44" x2="484.245" y1="846.421" y2="839.982" gradientUnits="userSpaceOnUse">
            <stop stop-color="#1A73E8"/>
            <stop offset="1" stop-color="#2A85FC"/>
        </linearGradient>
    </defs>
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

