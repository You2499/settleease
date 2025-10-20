"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FixedCalendarProps {
    selected?: Date;
    onSelect?: (date: Date | undefined) => void;
    className?: string;
}

export function FixedCalendar({ selected, onSelect, className }: FixedCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState<Date>(selected || new Date());

    // Update current month when selected date changes
    React.useEffect(() => {
        if (selected) {
            setCurrentMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
        }
    }, [selected]);

    // Generate calendar grid - same logic as heatmap calendar
    const generateCalendarGrid = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // Get first day of month and how many days in month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // Get the day of week for first day (0 = Sunday)
        const startDayOfWeek = firstDay.getDay();

        // Create array of all days to display (including previous/next month days)
        const days: (Date | null)[] = [];

        // Add empty cells for days before the first day of month
        for (let i = 0; i < startDayOfWeek; i++) {
            const prevDate = new Date(year, month, -startDayOfWeek + i + 1);
            days.push(prevDate);
        }

        // Add all days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        // Add days from next month to complete the grid (6 weeks = 42 days)
        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            days.push(new Date(year, month + 1, day));
        }

        return days;
    };

    const calendarDays = generateCalendarGrid();

    // Navigation functions
    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const handleDateSelect = (date: Date) => {
        onSelect?.(date);
    };

    return (
        <div className={cn("p-3 border rounded-lg bg-background", className)}>
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPreviousMonth}
                    className="h-7 w-7 p-0"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-sm font-medium">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextMonth}
                    className="h-7 w-7 p-0"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                    <div key={day} className="text-center text-xs font-normal text-muted-foreground h-6 flex items-center justify-center w-8">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                    if (!date) return <div key={index} className="h-8 w-8" />;

                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isSelected = selected && date.toDateString() === selected.toDateString();

                    return (
                        <button
                            key={index}
                            onClick={() => handleDateSelect(date)}
                            className={cn(
                                "h-8 w-8 p-0 font-normal rounded-md transition-colors cursor-pointer",
                                "flex items-center justify-center text-xs",
                                "hover:bg-muted hover:text-foreground",
                                "focus:outline-none focus:bg-muted focus:text-foreground",
                                "active:bg-muted/80",
                                !isCurrentMonth && "text-muted-foreground/40 opacity-50",
                                isToday && !isSelected && "bg-muted/60 text-foreground font-medium",
                                isSelected && "bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                            )}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}