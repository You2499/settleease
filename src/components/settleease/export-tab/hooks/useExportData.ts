"use client";

import { useMemo } from "react";
import type { Expense, SettlementPayment, Category } from "@/lib/settleease/types";
import type { ActivityItem, DatePreset, ExpenseStats } from "../types";

interface UseExportDataProps {
    expenses: Expense[];
    settlementPayments: SettlementPayment[];
    categories: Category[];
    selectedPreset: DatePreset | null;
    startDate: Date | undefined;
    endDate: Date | undefined;
}

interface UseExportDataReturn {
    isDateRangeSelected: boolean;
    reportExpenses: Expense[];
    filteredSettlements: SettlementPayment[];
    historicalExpenses: Expense[];
    historicalSettlements: SettlementPayment[];
    allActivities: ActivityItem[];
    groupedActivities: Record<string, ActivityItem[]>;
    stats: ExpenseStats;
}

export function useExportData({
    expenses,
    settlementPayments,
    categories,
    selectedPreset,
    startDate,
    endDate,
}: UseExportDataProps): UseExportDataReturn {
    // Check if date range is selected
    const isDateRangeSelected = selectedPreset !== null && startDate !== undefined && endDate !== undefined;

    // Filter non-excluded expenses for the report within date range
    const reportExpenses = useMemo(() => {
        if (!isDateRangeSelected) return [];
        return expenses.filter(expense => {
            if (expense.exclude_from_settlement) return false;
            const expenseDate = new Date(expense.created_at || 0);
            return expenseDate >= startDate! && expenseDate <= endDate!;
        });
    }, [expenses, isDateRangeSelected, startDate, endDate]);

    // Filter settlements within date range
    const filteredSettlements = useMemo(() => {
        if (!isDateRangeSelected) return [];
        return settlementPayments.filter(settlement => {
            const settlementDate = new Date(settlement.settled_at);
            return settlementDate >= startDate! && settlementDate <= endDate!;
        });
    }, [settlementPayments, isDateRangeSelected, startDate, endDate]);

    // Filter expenses BEFORE the selected date range (historical)
    const historicalExpenses = useMemo(() => {
        if (!isDateRangeSelected) return [];
        return expenses.filter(expense => {
            if (expense.exclude_from_settlement) return false;
            const expenseDate = new Date(expense.created_at || 0);
            return expenseDate < startDate!;
        });
    }, [expenses, isDateRangeSelected, startDate]);

    // Filter settlements BEFORE the selected date range (historical)
    const historicalSettlements = useMemo(() => {
        if (!isDateRangeSelected) return [];
        return settlementPayments.filter(settlement => {
            const settlementDate = new Date(settlement.settled_at);
            return settlementDate < startDate!;
        });
    }, [settlementPayments, isDateRangeSelected, startDate]);

    // Combine and sort all activities
    const allActivities: ActivityItem[] = useMemo(() => [
        ...reportExpenses.map(expense => ({
            type: 'expense' as const,
            id: expense.id,
            date: expense.created_at || new Date().toISOString(),
            data: expense,
        })),
        ...filteredSettlements.map(settlement => ({
            type: 'settlement' as const,
            id: settlement.id,
            date: settlement.settled_at,
            data: settlement,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [reportExpenses, filteredSettlements]);

    // Create a category rank lookup map
    const categoryRankMap = useMemo(() => {
        const map: Record<string, number> = {};
        categories.forEach(cat => {
            map[cat.name] = cat.rank ?? 999;
        });
        return map;
    }, [categories]);

    // Group activities by date and sort by category rank within each date
    const groupedActivities = useMemo(() => {
        const grouped = allActivities.reduce((acc, activity) => {
            const date = new Date(activity.date).toLocaleDateString('default', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!acc[date]) acc[date] = [];
            acc[date].push(activity);
            return acc;
        }, {} as Record<string, ActivityItem[]>);

        // Sort activities within each date by category rank
        Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) => {
                if (a.type === 'expense' && b.type === 'settlement') return -1;
                if (a.type === 'settlement' && b.type === 'expense') return 1;

                if (a.type === 'expense' && b.type === 'expense') {
                    const rankA = categoryRankMap[a.data.category] ?? 999;
                    const rankB = categoryRankMap[b.data.category] ?? 999;
                    return rankA - rankB;
                }

                return 0;
            });
        });

        return grouped;
    }, [allActivities, categoryRankMap]);

    // Summary statistics
    const stats = useMemo(() => {
        const totalExpenseAmount = reportExpenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0);
        const totalSettlementAmount = filteredSettlements.reduce((sum, set) => sum + Number(set.amount_settled), 0);

        return {
            expenseCount: reportExpenses.length,
            totalExpenseAmount,
            settlementCount: filteredSettlements.length,
            totalSettlementAmount,
        };
    }, [reportExpenses, filteredSettlements]);

    return {
        isDateRangeSelected,
        reportExpenses,
        filteredSettlements,
        historicalExpenses,
        historicalSettlements,
        allActivities,
        groupedActivities,
        stats,
    };
}
