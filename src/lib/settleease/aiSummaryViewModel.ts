import { formatCurrency } from "./utils";

const EPSILON = 0.01;

export interface SummaryMetricCard {
  label: string;
  value: string;
}

export interface SettlementProgressSummary {
  alreadySettled: number;
  remaining: number;
  totalSettlement: number;
  percentSettled: number;
}

export interface PaymentActionRow {
  from: string;
  to: string;
  amount: number;
  status: string;
}

export interface BalanceBarRow {
  name: string;
  amount: number;
  direction: "Receives" | "Pays";
  width: number;
}

export interface CategoryBarRow {
  name: string;
  amount: number;
  share: number;
}

function toAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function percentage(value: number, total: number): number {
  if (Math.abs(total) <= EPSILON) return 0;
  return Math.min(100, Math.max(0, Number(((value / total) * 100).toFixed(1))));
}

export function buildSummaryMetricCards(payload: any): SummaryMetricCard[] {
  const totals = payload?.analysis?.totals || {};
  return [
    {
      label: "Included Spend",
      value: formatCurrency(totals.includedSpend),
    },
    {
      label: "Already Settled",
      value: formatCurrency(totals.amountAlreadySettled),
    },
    {
      label: "Remaining",
      value: formatCurrency(totals.remainingSimplifiedSettlementAmount),
    },
    {
      label: "Manual Overrides",
      value: String(totals.activeManualOverrides ?? 0),
    },
  ];
}

export function buildSettlementProgress(payload: any): SettlementProgressSummary {
  const alreadySettled = toAmount(payload?.analysis?.totals?.amountAlreadySettled);
  const remaining = toAmount(payload?.analysis?.totals?.remainingSimplifiedSettlementAmount);
  const totalSettlement = alreadySettled + remaining;

  return {
    alreadySettled,
    remaining,
    totalSettlement,
    percentSettled: percentage(alreadySettled, totalSettlement),
  };
}

export function buildPaymentRows(payload: any): PaymentActionRow[] {
  return (payload?.analysis?.settlement?.recommendedPaymentOrder || []).map((payment: any) => ({
    from: payment.from || "Not available in input data",
    to: payment.to || "Not available in input data",
    amount: toAmount(payment.outstanding_amount),
    status: toAmount(payment.already_settled_amount) > EPSILON ? "Partially settled" : "Outstanding",
  }));
}

export function buildBalanceBars(payload: any): BalanceBarRow[] {
  const creditors = (payload?.analysis?.balances?.rankedCreditors || []).map((person: any) => ({
    name: person.name,
    amount: toAmount(person.amount),
    direction: "Receives" as const,
  }));
  const debtors = (payload?.analysis?.balances?.rankedDebtors || []).map((person: any) => ({
    name: person.name,
    amount: toAmount(person.amount),
    direction: "Pays" as const,
  }));
  const rows = [...creditors, ...debtors].sort((a, b) => b.amount - a.amount).slice(0, 6);
  const maxAmount = Math.max(...rows.map((row) => row.amount), 0);

  return rows.map((row) => ({
    ...row,
    width: maxAmount > EPSILON ? percentage(row.amount, maxAmount) : 0,
  }));
}

export function buildCategoryBars(payload: any): CategoryBarRow[] {
  return (payload?.analysis?.spending?.topCategories || []).slice(0, 5).map((category: any) => ({
    name: category.name || "Not available in input data",
    amount: toAmount(category.total_spent),
    share: toAmount(category.share_of_included_spend),
  }));
}

export function getDataQualityMessages(payload: any): string[] {
  const integrity = payload?.analysis?.integrity;
  const warnings = Array.isArray(integrity?.warningList) ? integrity.warningList : [];

  if (warnings.length > 0) {
    return warnings;
  }

  const conservationPasses = integrity?.conservationCheck?.passes;
  const expenseConsistencyPasses = integrity?.expenseConsistency?.passes;

  if (conservationPasses === false || expenseConsistencyPasses === false) {
    return ["Data quality checks did not pass, but no detailed warning was available in input data."];
  }

  return ["No material data-quality issues detected."];
}
