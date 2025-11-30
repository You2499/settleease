"use client";

import React from 'react';
import { LayoutDashboard, CreditCard, BarChartBig, Activity, Menu } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { ActiveView, UserRole } from '@/lib/settleease';
import { useSidebar } from "@/components/ui/sidebar";

interface MobileBottomNavProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    userRole: UserRole;
}

export default function MobileBottomNav({ activeView, setActiveView, userRole }: MobileBottomNavProps) {
    const { toggleSidebar } = useSidebar();

    const navItems = [
        { view: 'dashboard', label: 'Home', icon: LayoutDashboard },
        { view: 'analytics', label: 'Analytics', icon: BarChartBig },
        { view: 'addExpense', label: 'Add', icon: CreditCard, adminOnly: true },
        { view: 'status', label: 'Status', icon: Activity },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    if (item.adminOnly && userRole !== 'admin') return null;

                    const isActive = activeView === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => setActiveView(item.view as ActiveView)}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    );
                })}

                {/* Menu Button to open Sidebar for other options */}
                <button
                    onClick={toggleSidebar}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                >
                    <Menu className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </div>
        </div>
    );
}
