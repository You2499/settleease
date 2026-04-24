"use client";

import React from 'react';
import { Home, BarChartBig, Heart, ScanLine } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { ActiveView } from '@/lib/settleease';
import type { UserRole } from '@/lib/settleease';
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion } from "./SkeletonLayouts";

interface MobileBottomNavProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    userRole?: UserRole | null;
    isLoading?: boolean;
}

export default function MobileBottomNav({ activeView, setActiveView, userRole, isLoading = false }: MobileBottomNavProps) {
    const navItems = [
        { view: 'dashboard', label: 'Home', icon: Home },
        { view: 'health', label: 'Health', icon: Heart },
        ...(userRole === 'admin' ? [{ view: 'scanReceipt', label: 'Smart Scan', icon: ScanLine }] : []),
        { view: 'analytics', label: 'Analytics', icon: BarChartBig },
    ];

    if (isLoading) {
        return (
            <LoadingRegion
                label="Loading mobile navigation"
                className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.05)]"
            >
                <div className="grid h-16 grid-cols-4 items-center px-1">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="flex min-w-0 flex-col items-center justify-center gap-1 px-1">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-2.5 w-10" />
                        </div>
                    ))}
                </div>
            </LoadingRegion>
        );
    }

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            <div
                className="grid h-16 items-center px-1"
                style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
            >
                {navItems.map((item) => {
                    const isActive = activeView === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => setActiveView(item.view as ActiveView)}
                            className={cn(
                                "flex min-w-0 flex-col items-center justify-center gap-1 px-1 active:scale-95 transition-transform",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                            aria-label={item.label}
                        >
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span className="truncate text-[9px] font-medium leading-none">{item.label}</span>
                        </button>
                    );
                })}

            </div>
        </div>
    );
}
