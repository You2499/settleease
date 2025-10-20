"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ANALYTICS_STYLES, createEmptyState } from '@/lib/settleease/analytics-styles';
import type { Expense } from '@/lib/settleease/types';

interface TransactionHeatmapCalendarProps {
    expenses: Expense[];
    analyticsViewMode: 'group' | 'personal';
    selectedPersonIdForAnalytics?: string | null;
    peopleMap: Record<string, string>;
}

interface DayData {
    date: Date;
    transactionCount: number;
    totalAmount: number;
    transactions: Array<{
        description: string;
        amount: number;
        category: string;
    }>;
}

export default function TransactionHeatmapCalendar({
    expenses,
    analyticsViewMode,
    selectedPersonIdForAnalytics,
    peopleMap
}: TransactionHeatmapCalendarProps) {
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

    // Process expenses to create day-wise transaction data
    const dayDataMap = useMemo(() => {
        const dataMap = new Map<string, DayData>();

        // Process expenses
        expenses.forEach(expense => {
            const expenseDate = new Date(expense.created_at || Date.now());
            const dateKey = expenseDate.toDateString();

            let amount = 0;
            let shouldInclude = false;

            if (analyticsViewMode === 'group') {
                amount = Number(expense.total_amount);
                shouldInclude = true;
            } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
                // For personal view, use the person's share amount
                const personShare = expense.shares.find(s => s.personId === selectedPersonIdForAnalytics);
                amount = Number(personShare?.amount || 0);
                shouldInclude = amount > 0.001;
            }

            if (shouldInclude) {
                if (!dataMap.has(dateKey)) {
                    dataMap.set(dateKey, {
                        date: expenseDate,
                        transactionCount: 0,
                        totalAmount: 0,
                        transactions: []
                    });
                }

                const dayData = dataMap.get(dateKey)!;
                dayData.transactionCount += 1;
                dayData.totalAmount += amount;
                dayData.transactions.push({
                    description: expense.description,
                    amount: amount,
                    category: expense.category || 'Uncategorized'
                });
            }
        });



        return dataMap;
    }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics, peopleMap]);

    // Calculate intensity levels for heatmap coloring
    const { maxTransactionCount } = useMemo(() => {
        let maxCount = 0;

        dayDataMap.forEach(dayData => {
            maxCount = Math.max(maxCount, dayData.transactionCount);
        });

        return { maxTransactionCount: maxCount };
    }, [dayDataMap]);

    // Get intensity level (0-4) based on transaction count
    const getIntensityLevel = (transactionCount: number): number => {
        if (transactionCount === 0) return 0;
        if (maxTransactionCount <= 1) return 4;

        const ratio = transactionCount / maxTransactionCount;
        if (ratio >= 0.8) return 4;
        if (ratio >= 0.6) return 3;
        if (ratio >= 0.4) return 2;
        return 1;
    };

    // Generate calendar grid
    const generateCalendarGrid = () => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();

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
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
    };

    // Calculate stats for the selected month
    const monthStats = useMemo(() => {
        const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

        let totalTransactions = 0;
        let totalAmount = 0;
        let activeDays = 0;

        dayDataMap.forEach(dayData => {
            if (dayData.date >= monthStart && dayData.date <= monthEnd) {
                totalTransactions += dayData.transactionCount;
                totalAmount += dayData.totalAmount;
                activeDays += 1;
            }
        });

        return { totalTransactions, totalAmount, activeDays };
    }, [dayDataMap, selectedMonth]);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <Card className={ANALYTICS_STYLES.card}>
            <CardHeader className={ANALYTICS_STYLES.header}>
                <CardTitle className={ANALYTICS_STYLES.title}>
                    <CalendarDays className={ANALYTICS_STYLES.icon} />
                    Expense Activity Heatmap
                </CardTitle>
                <div className={ANALYTICS_STYLES.subtitle}>
                    {analyticsViewMode === 'group'
                        ? 'Group expense activity by day (settlements excluded)'
                        : `${peopleMap[selectedPersonIdForAnalytics!] || 'Personal'} expense activity by day (settlements excluded)`
                    }
                </div>
            </CardHeader>
            <CardContent className={ANALYTICS_STYLES.chartContent}>
                {/* Month Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg mb-4">
                    <div className="text-center">
                        <div className="text-sm sm:text-lg font-semibold text-primary">
                            {monthStats.totalTransactions}
                        </div>
                        <div className="text-xs text-muted-foreground">Expenses</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm sm:text-lg font-semibold text-primary">
                            ${monthStats.totalAmount.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Amount</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm sm:text-lg font-semibold text-primary">
                            {monthStats.activeDays}
                        </div>
                        <div className="text-xs text-muted-foreground">Active Days</div>
                    </div>
                </div>

                {/* Calendar */}
                <div className="p-2 sm:p-3 border rounded-lg bg-background max-w-sm sm:max-w-md mx-auto">
                    {/* Calendar Header */}
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToPreviousMonth}
                            className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                        >
                            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <h3 className="text-xs sm:text-sm font-medium">
                            {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToNextMonth}
                            className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                        >
                            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                        {dayNames.map(day => (
                            <div key={day} className="text-center text-xs font-normal text-muted-foreground h-5 sm:h-6 flex items-center justify-center w-6 sm:w-8">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                        {calendarDays.map((date, index) => {
                            if (!date) return <div key={index} className="h-8 w-8" />;

                            const dateKey = date.toDateString();
                            const dayData = dayDataMap.get(dateKey);
                            const isCurrentMonth = date.getMonth() === selectedMonth.getMonth();
                            const isToday = date.toDateString() === new Date().toDateString();

                            const intensityLevel = dayData ? getIntensityLevel(dayData.transactionCount) : 0;

                            // Heatmap colors - from light to dark based on transaction density
                            const getHeatmapColor = (level: number) => {
                                if (!isCurrentMonth) return 'text-muted-foreground/40 opacity-50';

                                switch (level) {
                                    case 0: return 'hover:bg-muted hover:text-foreground focus:outline-none focus:bg-muted focus:text-foreground active:bg-muted/80';
                                    case 1: return 'bg-primary/20 hover:bg-primary/30 text-primary-foreground focus:outline-none focus:bg-primary/30 active:bg-primary/40';
                                    case 2: return 'bg-primary/40 hover:bg-primary/50 text-primary-foreground focus:outline-none focus:bg-primary/50 active:bg-primary/60';
                                    case 3: return 'bg-primary/60 hover:bg-primary/70 text-primary-foreground focus:outline-none focus:bg-primary/70 active:bg-primary/80';
                                    case 4: return 'bg-primary/80 hover:bg-primary/90 text-primary-foreground focus:outline-none focus:bg-primary/90 active:bg-primary';
                                    default: return 'hover:bg-muted hover:text-foreground focus:outline-none focus:bg-muted focus:text-foreground active:bg-muted/80';
                                }
                            };

                            return (
                                <div key={index} className="relative group">
                                    <button
                                        className={cn(
                                            "h-6 w-6 sm:h-8 sm:w-8 p-0 font-normal rounded-sm sm:rounded-md transition-colors cursor-pointer",
                                            "flex items-center justify-center text-xs",
                                            getHeatmapColor(intensityLevel),
                                            isToday && !dayData && "bg-muted/60 text-foreground font-medium",
                                            isToday && dayData && "font-medium"
                                        )}
                                    >
                                        {date.getDate()}
                                    </button>

                                    {/* Tooltip */}
                                    {dayData && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-md shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none min-w-[200px]">
                                            <div className="text-sm font-medium text-popover-foreground mb-1">
                                                {date.toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                            <div className="text-xs text-muted-foreground mb-2">
                                                {dayData.transactionCount} expense{dayData.transactionCount !== 1 ? 's' : ''} •
                                                ${dayData.totalAmount.toFixed(2)}
                                            </div>
                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                                {dayData.transactions.map((transaction, idx) => (
                                                    <div key={idx} className="text-xs">
                                                        <div className="font-medium text-popover-foreground truncate">
                                                            {transaction.description}
                                                        </div>
                                                        <div className="flex justify-between items-center text-muted-foreground">
                                                            <span className="truncate">{transaction.category}</span>
                                                            <span className="font-medium">${transaction.amount.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Tooltip arrow */}
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                    <span>Less</span>
                    <div className="flex space-x-1">
                        {[0, 1, 2, 3, 4].map(level => (
                            <div
                                key={level}
                                className={cn(
                                    "w-3 h-3 rounded-sm",
                                    level === 0 ? 'bg-muted' :
                                        level === 1 ? 'bg-primary/20' :
                                            level === 2 ? 'bg-primary/40' :
                                                level === 3 ? 'bg-primary/60' :
                                                    'bg-primary/80'
                                )}
                            />
                        ))}
                    </div>
                    <span>More</span>
                </div>

                {expenses.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        {createEmptyState("Expense Activity Heatmap", TrendingUp, "No expense data available")}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}