import type {
  Category,
  Expense,
  ManualSettlementOverride,
  Person,
  SettlementPayment,
} from "@/lib/settleease/types";
import type React from "react";

export interface ExportExpenseTabProps {
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  people: Person[];
  categories: Category[];
  manualOverrides: ManualSettlementOverride[];
  peopleMap: Record<string, string>;
  getCategoryIconFromName?: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

export type DatePreset = "last7days" | "last30days" | "last3months" | "thisYear" | "allTime" | "custom";

export type ExportMode = "group" | "personal";

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

export interface AuditReportMetric {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warning";
}

export interface AuditPersonAmount {
  person: string;
  amount: number;
}

export interface AuditExpenseItemProof {
  name: string;
  category: string;
  sharedBy: string[];
  amount: number;
}

export interface AuditParticipantEffect {
  person: string;
  paid: number;
  share: number;
  celebrationContribution: number;
  netEffect: number;
}

export interface AuditExpenseProof {
  description: string;
  category: string;
  categoryIconName: string | null;
  date: string;
  sortTime: number;
  splitMethod: string;
  amount: number;
  excluded: boolean;
  paidBy: AuditPersonAmount[];
  shares: AuditPersonAmount[];
  items: AuditExpenseItemProof[];
  celebrationContribution: AuditPersonAmount | null;
  participantEffects: AuditParticipantEffect[];
}

export interface AuditSettlementLedgerRow {
  debtor: string;
  creditor: string;
  amount: number;
  date: string;
  sortTime: number;
  notes: string | null;
}

export interface AuditManualOverrideProof {
  debtor: string;
  creditor: string;
  amount: number;
  notes: string | null;
  status: "Active" | "Inactive" | "Not applied";
}

export interface AuditDataQuality {
  passes: boolean;
  checkedExpenses: number;
  warnings: string[];
}

export interface AuditActivityItem {
  type: "expense" | "settlement";
  title: string;
  subtitle: string;
  amount: number;
  badge: string;
  tone: "neutral" | "positive" | "warning";
}

export interface AuditActivityGroup {
  date: string;
  sortTime: number;
  items: AuditActivityItem[];
}

export interface AuditCategoryRow {
  name: string;
  iconName: string | null;
  amount: number;
  share: number;
}

export interface AuditBalanceRow {
  name: string;
  amount: number;
  direction: "Receives" | "Pays" | "Settled";
}

export interface AuditPairwiseExpenseContribution {
  description: string;
  category: string;
  date: string;
  amount: number;
}

export interface AuditHistoricalSettlementEffect {
  date: string;
  direction: string;
  amount: number;
  effect: number;
}

export interface AuditCalculationLine {
  label: string;
  amount: number;
  emphasis?: boolean;
}

export interface AuditTransactionProof {
  debtor: string;
  creditor: string;
  amount: number;
  status: string;
  contributingExpenses: AuditPairwiseExpenseContribution[];
  offsetExpenses: AuditPairwiseExpenseContribution[];
  priorBalance: number;
  historicalSettlements: AuditHistoricalSettlementEffect[];
  manualOverride: AuditManualOverrideProof | null;
  calculationLines: AuditCalculationLine[];
}

export interface AuditCounterpartyBalance {
  name: string;
  amount: number;
  direction: "Owes you" | "You owe";
}

export interface AuditPersonalExpenseProof extends AuditExpenseProof {
  paidByPerson: number;
  shareForPerson: number;
  netEffectForPerson: number;
  counterpartyEffects: AuditCounterpartyBalance[];
}

export interface AuditBaseReportModel {
  kind: ExportMode;
  title: string;
  generatedAt: string;
  dateRangeLabel: string;
  redacted: boolean;
  metrics: AuditReportMetric[];
  dataQuality: AuditDataQuality;
}

export interface AuditGroupReportModel extends AuditBaseReportModel {
  kind: "group";
  participantCount: number;
  includedExpenses: AuditExpenseProof[];
  excludedExpenses: AuditExpenseProof[];
  settlements: AuditSettlementLedgerRow[];
  activityGroups: AuditActivityGroup[];
  transactionProofs: AuditTransactionProof[];
  balances: AuditBalanceRow[];
  categories: AuditCategoryRow[];
  manualOverrides: AuditManualOverrideProof[];
}

export interface AuditPersonalReportModel extends AuditBaseReportModel {
  kind: "personal";
  personName: string;
  redacted: boolean;
  expenses: AuditPersonalExpenseProof[];
  excludedExpenses: AuditPersonalExpenseProof[];
  settlements: AuditSettlementLedgerRow[];
  counterparties: AuditCounterpartyBalance[];
  finalBalances: AuditCounterpartyBalance[];
}

export type ExportReportModel = AuditGroupReportModel | AuditPersonalReportModel;
