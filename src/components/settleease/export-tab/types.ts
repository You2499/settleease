import type {
    Expense,
    SettlementPayment,
    Person,
    Category,
    ManualSettlementOverride,
} from "@/lib/settleease/types";
import React from "react";

export interface ExportExpenseTabProps {
    expenses: Expense[];
    settlementPayments: SettlementPayment[];
    people: Person[];
    categories: Category[];
    manualOverrides: ManualSettlementOverride[];
    peopleMap: Record<string, string>;
    getCategoryIconFromName?: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

export type DatePreset = 'last7days' | 'last30days' | 'last3months' | 'thisYear' | 'allTime' | 'custom';

export type ExportMode = 'group' | 'personal';

export interface DatePresetConfig {
    id: DatePreset;
    label: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    getRange: () => { start: Date | undefined; end: Date | undefined };
}

export interface ExportDateRange {
    preset: DatePreset;
    label: string;
    startDate: Date | undefined;
    endDate: Date | undefined;
    isAllTime: boolean;
}

export interface ExportReportMetric {
    label: string;
    value: string;
    tone?: 'neutral' | 'positive' | 'warning';
}

export interface ExportPaymentAction {
    from: string;
    to: string;
    amount: number;
    status: string;
}

export interface ExportDataQuality {
    passes: boolean;
    checkedExpenses: number;
    warnings: string[];
}

export interface ExportBalanceRow {
    name: string;
    amount: number;
    direction: 'Receives' | 'Pays';
    share: number;
}

export interface ExportCategoryRow {
    name: string;
    amount: number;
    share: number;
}

export interface ExportSplitMethodRow {
    method: string;
    count: number;
    share: number;
}

export interface ExportPersonAmount {
    person: string;
    amount: number;
}

export interface ExportExpenseItemRow {
    name: string;
    category: string;
    sharedBy: string[];
    amount: number;
}

export interface ExportExpenseLedgerRow {
    description: string;
    category: string;
    date: string;
    splitMethod: string;
    amount: number;
    paidBy: ExportPersonAmount[];
    shares: ExportPersonAmount[];
    items: ExportExpenseItemRow[];
    celebrationContribution: ExportPersonAmount | null;
}

export interface ExportSettlementLedgerRow {
    debtor: string;
    creditor: string;
    amount: number;
    date: string;
    notes: string | null;
}

export interface ExportManualOverrideRow {
    debtor: string;
    creditor: string;
    amount: number;
    notes: string | null;
}

export interface GroupSummaryReportModel {
    kind: 'group';
    title: string;
    generatedAt: string;
    dateRangeLabel: string;
    participantCount: number;
    metrics: ExportReportMetric[];
    paymentActions: ExportPaymentAction[];
    balances: ExportBalanceRow[];
    settledParticipantCount: number;
    categories: ExportCategoryRow[];
    topExpenses: Pick<ExportExpenseLedgerRow, 'description' | 'category' | 'amount' | 'splitMethod'>[];
    splitMethods: ExportSplitMethodRow[];
    manualOverrides: ExportManualOverrideRow[];
    dataQuality: ExportDataQuality;
    expenses: ExportExpenseLedgerRow[];
    settlements: ExportSettlementLedgerRow[];
}

export interface PersonalCounterpartyRow {
    name: string;
    amount: number;
    direction: 'Owes you' | 'You owe';
}

export interface PersonalExpenseLedgerRow extends ExportExpenseLedgerRow {
    paidByPerson: number;
    shareForPerson: number;
    netEffect: number;
}

export interface PersonalStatementReportModel {
    kind: 'personal';
    title: string;
    personName: string;
    generatedAt: string;
    dateRangeLabel: string;
    redacted: boolean;
    metrics: ExportReportMetric[];
    counterparties: PersonalCounterpartyRow[];
    expenses: PersonalExpenseLedgerRow[];
    settlements: ExportSettlementLedgerRow[];
    dataQuality: ExportDataQuality;
}

export type ExportReportModel = GroupSummaryReportModel | PersonalStatementReportModel;
