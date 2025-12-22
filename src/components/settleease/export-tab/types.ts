import type { Expense, SettlementPayment, Person, Category } from "@/lib/settleease/types";
import React from "react";

export interface ExportExpenseTabProps {
    expenses: Expense[];
    settlementPayments: SettlementPayment[];
    people: Person[];
    categories: Category[];
    peopleMap: Record<string, string>;
    getCategoryIconFromName?: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

export type ActivityItem = {
    type: 'expense';
    id: string;
    date: string;
    data: Expense;
} | {
    type: 'settlement';
    id: string;
    date: string;
    data: SettlementPayment;
};

export type DatePreset = 'last7days' | 'last30days' | 'last3months' | 'thisYear' | 'allTime' | 'custom';

export type ExportMode = 'summary' | 'activityFeed';

export interface DatePresetConfig {
    id: DatePreset;
    label: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    getRange: () => { start: Date; end: Date };
}

export interface ExpenseStats {
    expenseCount: number;
    totalExpenseAmount: number;
    settlementCount: number;
    totalSettlementAmount: number;
}
