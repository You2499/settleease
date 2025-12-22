"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExportMode } from "../types";

interface ExportModeToggleProps {
    exportMode: ExportMode;
    onModeChange: (mode: ExportMode) => void;
}

export function ExportModeToggle({ exportMode, onModeChange }: ExportModeToggleProps) {
    return (
        <div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <FileDown className="h-4 w-4" />
                Export Type
            </p>
            <div className="flex gap-2">
                <Button
                    variant={exportMode === 'summary' ? "default" : "outline"}
                    size="sm"
                    onClick={() => onModeChange('summary')}
                    className={cn(
                        "flex-1 h-auto py-3 flex flex-col items-center gap-1",
                        exportMode === 'summary' && "ring-2 ring-primary ring-offset-2"
                    )}
                >
                    <CalendarDays className="h-5 w-5" />
                    <span className="text-xs font-medium">Summary Report</span>
                    <span className="text-[10px] text-muted-foreground">Date-filtered overview</span>
                </Button>
                <Button
                    variant={exportMode === 'activityFeed' ? "default" : "outline"}
                    size="sm"
                    onClick={() => onModeChange('activityFeed')}
                    className={cn(
                        "flex-1 h-auto py-3 flex flex-col items-center gap-1",
                        exportMode === 'activityFeed' && "ring-2 ring-primary ring-offset-2"
                    )}
                >
                    <Users className="h-5 w-5" />
                    <span className="text-xs font-medium">Activity Feed</span>
                    <span className="text-[10px] text-muted-foreground">Full audit trail</span>
                </Button>
            </div>
        </div>
    );
}
