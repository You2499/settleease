"use client";

import { calculateNetBalances, calculateSimplifiedTransactions } from "@/lib/settleease/settlementCalculations";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  Expense,
  ManualSettlementOverride,
  Person,
  SettlementPayment,
} from "@/lib/settleease/types";
import { DATE_PRESETS } from "../constants";
import type {
  DatePreset,
  ExportBalanceRow,
  ExportCategoryRow,
  ExportDataQuality,
  ExportDateRange,
  ExportExpenseItemRow,
  ExportExpenseLedgerRow,
  ExportManualOverrideRow,
  ExportPaymentAction,
  ExportPersonAmount,
  ExportSettlementLedgerRow,
  ExportSplitMethodRow,
  GroupSummaryReportModel,
  PersonalCounterpartyRow,
  PersonalExpenseLedgerRow,
  PersonalStatementReportModel,
} from "../types";

const EPSILON = 0.01;
const UNCATEGORIZED = "Uncategorized";

interface BuildBaseReportModelParams {
  people: Person[];
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  manualOverrides: ManualSettlementOverride[];
  peopleMap: Record<string, string>;
  dateRange: ExportDateRange;
  reportName?: string;
  generatedAt?: Date;
}

interface BuildGroupSummaryReportModelParams extends BuildBaseReportModelParams {
  categories: { name: string; icon_name?: string | null }[];
}

interface BuildPersonalStatementReportModelParams extends BuildBaseReportModelParams {
  selectedPersonId: string | null;
  redacted?: boolean;
}

function toAmount(value: number | string | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareAmountDescThenName<T extends { amount: number; name: string }>(a: T, b: T): number {
  const amountDelta = b.amount - a.amount;
  if (Math.abs(amountDelta) > EPSILON) return amountDelta;
  return compareText(a.name, b.name);
}

function safeDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | Date | null | undefined): string {
  const date = safeDate(value);
  if (!date) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function idToName(people: Person[], peopleMap: Record<string, string>, id: string): string {
  return peopleMap[id] || people.find((person) => person.id === id)?.name || "Unknown";
}

function isInDateRange(value: string | Date | null | undefined, dateRange: ExportDateRange): boolean {
  if (dateRange.isAllTime) return true;
  const date = safeDate(value);
  if (!date || !dateRange.startDate || !dateRange.endDate) return false;

  const start = new Date(dateRange.startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(dateRange.endDate);
  end.setHours(23, 59, 59, 999);

  return date >= start && date <= end;
}

export function buildExportDateRange(
  preset: DatePreset,
  startDate: Date | undefined,
  endDate: Date | undefined
): ExportDateRange {
  const presetConfig = DATE_PRESETS.find((item) => item.id === preset);
  const isAllTime = preset === "allTime";
  const label = isAllTime
    ? "All Time"
    : startDate && endDate
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : presetConfig?.label || "Custom Range";

  return {
    preset,
    label,
    startDate: isAllTime ? undefined : startDate,
    endDate: isAllTime ? undefined : endDate,
    isAllTime,
  };
}

export function sanitizeReportFileName(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);

  return cleaned || "SettleEase_Report";
}

function getFilteredExpenses(expenses: Expense[], dateRange: ExportDateRange): Expense[] {
  return expenses.filter((expense) => isInDateRange(expense.created_at, dateRange));
}

function getFilteredSettlements(
  settlementPayments: SettlementPayment[],
  dateRange: ExportDateRange
): SettlementPayment[] {
  return settlementPayments.filter((settlement) => isInDateRange(settlement.settled_at, dateRange));
}

function getPaidByRows(
  expense: Expense,
  people: Person[],
  peopleMap: Record<string, string>
): ExportPersonAmount[] {
  return (Array.isArray(expense.paid_by) ? expense.paid_by : [])
    .map((payment) => ({
      person: idToName(people, peopleMap, payment.personId),
      amount: roundAmount(toAmount(payment.amount)),
    }))
    .sort((a, b) => compareText(a.person, b.person));
}

function getShareRows(
  expense: Expense,
  people: Person[],
  peopleMap: Record<string, string>
): ExportPersonAmount[] {
  return (Array.isArray(expense.shares) ? expense.shares : [])
    .map((share) => ({
      person: idToName(people, peopleMap, share.personId),
      amount: roundAmount(toAmount(share.amount)),
    }))
    .sort((a, b) => compareText(a.person, b.person));
}

function getItemRows(
  expense: Expense,
  people: Person[],
  peopleMap: Record<string, string>,
  redacted = false
): ExportExpenseItemRow[] {
  if (expense.split_method !== "itemwise" || !Array.isArray(expense.items)) return [];

  return expense.items
    .map((item, index) => {
      const label = redacted && isSensitiveText(`${item.name} ${item.categoryName || ""}`)
        ? `Item ${index + 1}`
        : item.name || `Item ${index + 1}`;

      return {
        name: label,
        category: redacted && isSensitiveText(item.categoryName || "") ? "General" : item.categoryName || expense.category || UNCATEGORIZED,
        sharedBy: [...item.sharedBy].map((id) => idToName(people, peopleMap, id)).sort(compareText),
        amount: roundAmount(toAmount(item.price)),
      };
    })
    .sort((a, b) => {
      const amountDelta = b.amount - a.amount;
      if (Math.abs(amountDelta) > EPSILON) return amountDelta;
      return compareText(a.name, b.name);
    });
}

function expenseToLedgerRow(
  expense: Expense,
  people: Person[],
  peopleMap: Record<string, string>,
  redacted = false
): ExportExpenseLedgerRow {
  const isSensitive = redacted && isSensitiveText(`${expense.description} ${expense.category}`);
  return {
    description: isSensitive ? "Misc expense" : expense.description || "Untitled expense",
    category: isSensitive ? "General" : expense.category || UNCATEGORIZED,
    date: formatDate(expense.created_at),
    splitMethod: expense.split_method,
    amount: roundAmount(toAmount(expense.total_amount)),
    paidBy: getPaidByRows(expense, people, peopleMap),
    shares: getShareRows(expense, people, peopleMap),
    items: getItemRows(expense, people, peopleMap, redacted),
    celebrationContribution: expense.celebration_contribution
      ? {
          person: idToName(people, peopleMap, expense.celebration_contribution.personId),
          amount: roundAmount(toAmount(expense.celebration_contribution.amount)),
        }
      : null,
  };
}

function settlementToLedgerRow(
  settlement: SettlementPayment,
  people: Person[],
  peopleMap: Record<string, string>
): ExportSettlementLedgerRow {
  return {
    debtor: idToName(people, peopleMap, settlement.debtor_id),
    creditor: idToName(people, peopleMap, settlement.creditor_id),
    amount: roundAmount(toAmount(settlement.amount_settled)),
    date: formatDate(settlement.settled_at),
    notes: settlement.notes || null,
  };
}

function overrideToRow(
  override: ManualSettlementOverride,
  people: Person[],
  peopleMap: Record<string, string>
): ExportManualOverrideRow {
  return {
    debtor: idToName(people, peopleMap, override.debtor_id),
    creditor: idToName(people, peopleMap, override.creditor_id),
    amount: roundAmount(toAmount(override.amount)),
    notes: override.notes || null,
  };
}

function getTotalObligation(expense: Expense, personId: string): number {
  const share = expense.shares?.find((item) => item.personId === personId)?.amount || 0;
  const celebration = expense.celebration_contribution?.personId === personId
    ? expense.celebration_contribution.amount
    : 0;
  return toAmount(share) + toAmount(celebration);
}

function getTotalPaid(expense: Expense, personId: string): number {
  return (expense.paid_by || [])
    .filter((payment) => payment.personId === personId)
    .reduce((sum, payment) => sum + toAmount(payment.amount), 0);
}

function isPersonInExpense(expense: Expense, personId: string): boolean {
  return (
    getTotalPaid(expense, personId) > EPSILON ||
    getTotalObligation(expense, personId) > EPSILON
  );
}

function isSensitiveText(value: string): boolean {
  return /alcohol|cigarettes?|beer|wine|liquor|drink|drinks|vape|tobacco|smoke/i.test(value);
}

function buildDataQuality(
  people: Person[],
  expenses: Expense[],
  settlements: SettlementPayment[]
): ExportDataQuality {
  const knownPeople = new Set(people.map((person) => person.id));
  const warnings: string[] = [];

  expenses.forEach((expense) => {
    const label = expense.description || "Untitled expense";
    const totalAmount = toAmount(expense.total_amount);
    const paidTotal = (expense.paid_by || []).reduce((sum, payment) => sum + toAmount(payment.amount), 0);
    const shareTotal = (expense.shares || []).reduce((sum, share) => sum + toAmount(share.amount), 0);
    const celebrationAmount = toAmount(expense.celebration_contribution?.amount);

    if (Math.abs(paidTotal - totalAmount) > EPSILON) {
      warnings.push(
        `Expense "${label}" has paid total ${roundAmount(paidTotal)} but bill total ${roundAmount(totalAmount)}.`
      );
    }

    if (!expense.exclude_from_settlement && Math.abs(shareTotal + celebrationAmount - totalAmount) > EPSILON) {
      warnings.push(
        `Expense "${label}" has allocated shares ${roundAmount(shareTotal + celebrationAmount)} but bill total ${roundAmount(totalAmount)}.`
      );
    }

    (expense.paid_by || []).forEach((payment) => {
      if (!knownPeople.has(payment.personId)) {
        warnings.push(`Expense "${label}" references an unknown payer.`);
      }
    });

    (expense.shares || []).forEach((share) => {
      if (!knownPeople.has(share.personId)) {
        warnings.push(`Expense "${label}" references an unknown participant share.`);
      }
    });

    if (
      expense.celebration_contribution &&
      !knownPeople.has(expense.celebration_contribution.personId)
    ) {
      warnings.push(`Expense "${label}" references an unknown celebration contributor.`);
    }

    (expense.items || []).forEach((item) => {
      item.sharedBy.forEach((personId) => {
        if (!knownPeople.has(personId)) {
          warnings.push(`Expense "${label}" item "${item.name}" references an unknown participant.`);
        }
      });
    });
  });

  settlements.forEach((settlement) => {
    if (!knownPeople.has(settlement.debtor_id)) {
      warnings.push("Settlement payment references an unknown payer.");
    }
    if (!knownPeople.has(settlement.creditor_id)) {
      warnings.push("Settlement payment references an unknown receiver.");
    }
  });

  const uniqueWarnings = [...new Set(warnings)].sort(compareText);

  return {
    passes: uniqueWarnings.length === 0,
    checkedExpenses: expenses.length,
    warnings: uniqueWarnings,
  };
}

function getCategoryRows(includedExpenses: Expense[]): ExportCategoryRow[] {
  const totals = new Map<string, number>();

  includedExpenses.forEach((expense) => {
    if (expense.split_method === "itemwise" && expense.items?.length) {
      expense.items.forEach((item) => {
        const category = item.categoryName || expense.category || UNCATEGORIZED;
        totals.set(category, (totals.get(category) || 0) + toAmount(item.price));
      });
      return;
    }

    const category = expense.category || UNCATEGORIZED;
    totals.set(category, (totals.get(category) || 0) + toAmount(expense.total_amount));
  });

  const totalSpend = [...totals.values()].reduce((sum, amount) => sum + amount, 0);

  return [...totals.entries()]
    .map(([name, amount]) => ({
      name,
      amount: roundAmount(amount),
      share: totalSpend > EPSILON ? roundAmount((amount / totalSpend) * 100) : 0,
    }))
    .sort(compareAmountDescThenName)
    .slice(0, 8);
}

function getSplitMethodRows(includedExpenses: Expense[]): ExportSplitMethodRow[] {
  const counts: Record<string, number> = { equal: 0, unequal: 0, itemwise: 0 };
  includedExpenses.forEach((expense) => {
    counts[expense.split_method] = (counts[expense.split_method] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([method, count]) => ({
      method,
      count,
      share: includedExpenses.length > 0 ? roundAmount((count / includedExpenses.length) * 100) : 0,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => {
      const countDelta = b.count - a.count;
      if (countDelta !== 0) return countDelta;
      return compareText(a.method, b.method);
    });
}

function buildBalanceRows(netBalances: Record<string, number>, people: Person[], peopleMap: Record<string, string>): ExportBalanceRow[] {
  const rows = Object.entries(netBalances)
    .filter(([, balance]) => Math.abs(balance) > EPSILON)
    .map(([personId, balance]) => ({
      name: idToName(people, peopleMap, personId),
      amount: roundAmount(Math.abs(balance)),
      direction: balance > 0 ? "Receives" as const : "Pays" as const,
      share: 0,
    }))
    .sort(compareAmountDescThenName);

  const maxAmount = Math.max(...rows.map((row) => row.amount), 0);
  return rows.map((row) => ({
    ...row,
    share: maxAmount > EPSILON ? roundAmount((row.amount / maxAmount) * 100) : 0,
  }));
}

function buildPaymentActions(
  people: Person[],
  peopleMap: Record<string, string>,
  includedExpenses: Expense[],
  settlements: SettlementPayment[],
  manualOverrides: ManualSettlementOverride[]
): ExportPaymentAction[] {
  const activeOverrides = manualOverrides.filter((override) => override.is_active);
  const overridePairs = new Set(activeOverrides.map((override) => `${override.debtor_id}::${override.creditor_id}`));
  const settledPairs = new Set(settlements.map((settlement) => `${settlement.debtor_id}::${settlement.creditor_id}`));

  return calculateSimplifiedTransactions(people, includedExpenses, settlements, manualOverrides)
    .filter((transaction) => toAmount(transaction.amount) > EPSILON)
    .map((transaction) => {
      const pairKey = `${transaction.from}::${transaction.to}`;
      return {
        from: idToName(people, peopleMap, transaction.from),
        to: idToName(people, peopleMap, transaction.to),
        amount: roundAmount(transaction.amount),
        status: overridePairs.has(pairKey)
          ? "Manual path"
          : settledPairs.has(pairKey)
            ? "After settlements"
            : "Outstanding",
      };
    })
    .sort((a, b) => {
      const amountDelta = b.amount - a.amount;
      if (Math.abs(amountDelta) > EPSILON) return amountDelta;
      const fromComparison = compareText(a.from, b.from);
      if (fromComparison !== 0) return fromComparison;
      return compareText(a.to, b.to);
    });
}

function calculateCounterpartyBalances(
  selectedPersonId: string,
  people: Person[],
  expenses: Expense[],
  settlements: SettlementPayment[]
): PersonalCounterpartyRow[] {
  const balances = new Map<string, number>();
  people.forEach((person) => {
    if (person.id !== selectedPersonId) balances.set(person.id, 0);
  });

  expenses.forEach((expense) => {
    const totalPaidInExpense = (expense.paid_by || []).reduce(
      (sum, payment) => sum + toAmount(payment.amount),
      0
    );
    if (totalPaidInExpense <= EPSILON) return;

    const selectedPaid = getTotalPaid(expense, selectedPersonId);
    const selectedObligation = getTotalObligation(expense, selectedPersonId);

    people.forEach((otherPerson) => {
      if (otherPerson.id === selectedPersonId) return;
      const otherPaid = getTotalPaid(expense, otherPerson.id);
      const otherObligation = getTotalObligation(expense, otherPerson.id);
      const otherOwesSelected = (selectedPaid / totalPaidInExpense) * otherObligation;
      const selectedOwesOther = (otherPaid / totalPaidInExpense) * selectedObligation;
      const net = otherOwesSelected - selectedOwesOther;
      balances.set(otherPerson.id, (balances.get(otherPerson.id) || 0) + net);
    });
  });

  settlements.forEach((settlement) => {
    if (settlement.debtor_id === selectedPersonId) {
      balances.set(
        settlement.creditor_id,
        (balances.get(settlement.creditor_id) || 0) + toAmount(settlement.amount_settled)
      );
    } else if (settlement.creditor_id === selectedPersonId) {
      balances.set(
        settlement.debtor_id,
        (balances.get(settlement.debtor_id) || 0) - toAmount(settlement.amount_settled)
      );
    }
  });

  return [...balances.entries()]
    .filter(([, amount]) => Math.abs(amount) > EPSILON)
    .map(([personId, amount]) => ({
      name: people.find((person) => person.id === personId)?.name || "Unknown",
      amount: roundAmount(Math.abs(amount)),
      direction: amount > 0 ? "Owes you" as const : "You owe" as const,
    }))
    .sort(compareAmountDescThenName);
}

export function buildGroupSummaryReportModel({
  people,
  expenses,
  settlementPayments,
  manualOverrides,
  peopleMap,
  dateRange,
  reportName,
  generatedAt = new Date(),
}: BuildGroupSummaryReportModelParams): GroupSummaryReportModel {
  const filteredExpenses = getFilteredExpenses(expenses, dateRange);
  const includedExpenses = filteredExpenses.filter((expense) => !expense.exclude_from_settlement);
  const excludedExpenses = filteredExpenses.filter((expense) => expense.exclude_from_settlement);
  const settlements = getFilteredSettlements(settlementPayments, dateRange);
  const activeManualOverrides = manualOverrides.filter((override) => override.is_active);
  const paymentActions = buildPaymentActions(people, peopleMap, includedExpenses, settlements, manualOverrides);
  const netBalances = calculateNetBalances(people, includedExpenses, settlements);
  const balances = buildBalanceRows(netBalances, people, peopleMap);
  const includedSpend = includedExpenses.reduce((sum, expense) => sum + toAmount(expense.total_amount), 0);
  const excludedSpend = excludedExpenses.reduce((sum, expense) => sum + toAmount(expense.total_amount), 0);
  const alreadySettled = settlements.reduce((sum, settlement) => sum + toAmount(settlement.amount_settled), 0);
  const remainingToSettle = paymentActions.reduce((sum, action) => sum + action.amount, 0);

  const expensesLedger = includedExpenses
    .map((expense) => expenseToLedgerRow(expense, people, peopleMap))
    .sort((a, b) => {
      const amountDelta = b.amount - a.amount;
      if (Math.abs(amountDelta) > EPSILON) return amountDelta;
      return compareText(a.description, b.description);
    });

  return {
    kind: "group",
    title: reportName?.trim() || "SettleEase Group Summary",
    generatedAt: formatDateTime(generatedAt),
    dateRangeLabel: dateRange.label,
    participantCount: people.length,
    metrics: [
      { label: "Included Spend", value: formatCurrency(roundAmount(includedSpend)), tone: "neutral" },
      { label: "Excluded Spend", value: formatCurrency(roundAmount(excludedSpend)), tone: excludedSpend > EPSILON ? "warning" : "neutral" },
      { label: "Already Settled", value: formatCurrency(roundAmount(alreadySettled)), tone: "positive" },
      { label: "Remaining", value: formatCurrency(roundAmount(remainingToSettle)), tone: remainingToSettle > EPSILON ? "warning" : "positive" },
    ],
    paymentActions,
    balances,
    settledParticipantCount: people.filter((person) => Math.abs(netBalances[person.id] || 0) <= EPSILON).length,
    categories: getCategoryRows(includedExpenses),
    topExpenses: expensesLedger.slice(0, 6).map((expense) => ({
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      splitMethod: expense.splitMethod,
    })),
    splitMethods: getSplitMethodRows(includedExpenses),
    manualOverrides: activeManualOverrides
      .map((override) => overrideToRow(override, people, peopleMap))
      .sort((a, b) => {
        const amountDelta = b.amount - a.amount;
        if (Math.abs(amountDelta) > EPSILON) return amountDelta;
        return compareText(a.debtor, b.debtor);
      }),
    dataQuality: buildDataQuality(people, filteredExpenses, settlements),
    expenses: expensesLedger,
    settlements: settlements
      .map((settlement) => settlementToLedgerRow(settlement, people, peopleMap))
      .sort((a, b) => compareText(b.date, a.date)),
  };
}

export function buildPersonalStatementReportModel({
  people,
  expenses,
  settlementPayments,
  manualOverrides: _manualOverrides,
  peopleMap,
  dateRange,
  reportName,
  selectedPersonId,
  redacted = false,
  generatedAt = new Date(),
}: BuildPersonalStatementReportModelParams): PersonalStatementReportModel {
  const selectedPerson = selectedPersonId
    ? people.find((person) => person.id === selectedPersonId)
    : people[0];
  const personId = selectedPerson?.id || "";
  const personName = selectedPerson?.name || "Select a participant";
  const filteredExpenses = getFilteredExpenses(expenses, dateRange).filter(
    (expense) => !expense.exclude_from_settlement && isPersonInExpense(expense, personId)
  );
  const settlements = getFilteredSettlements(settlementPayments, dateRange).filter(
    (settlement) => settlement.debtor_id === personId || settlement.creditor_id === personId
  );

  const totalPaid = filteredExpenses.reduce((sum, expense) => sum + getTotalPaid(expense, personId), 0);
  const totalShare = filteredExpenses.reduce((sum, expense) => sum + getTotalObligation(expense, personId), 0);
  const settlementsSent = settlements
    .filter((settlement) => settlement.debtor_id === personId)
    .reduce((sum, settlement) => sum + toAmount(settlement.amount_settled), 0);
  const settlementsReceived = settlements
    .filter((settlement) => settlement.creditor_id === personId)
    .reduce((sum, settlement) => sum + toAmount(settlement.amount_settled), 0);
  const netPosition = totalPaid - totalShare + settlementsSent - settlementsReceived;

  const personalExpenses: PersonalExpenseLedgerRow[] = filteredExpenses
    .map((expense) => {
      const ledgerRow = expenseToLedgerRow(expense, people, peopleMap, redacted);
      const paidByPerson = roundAmount(getTotalPaid(expense, personId));
      const shareForPerson = roundAmount(getTotalObligation(expense, personId));
      return {
        ...ledgerRow,
        paidByPerson,
        shareForPerson,
        netEffect: roundAmount(paidByPerson - shareForPerson),
      };
    })
    .sort((a, b) => {
      const dateComparison = compareText(b.date, a.date);
      if (dateComparison !== 0) return dateComparison;
      return compareText(a.description, b.description);
    });

  return {
    kind: "personal",
    title: reportName?.trim() || `${personName} Personal Statement`,
    personName,
    generatedAt: formatDateTime(generatedAt),
    dateRangeLabel: dateRange.label,
    redacted,
    metrics: [
      { label: "Total Paid", value: formatCurrency(roundAmount(totalPaid)), tone: "positive" },
      { label: "Total Share", value: formatCurrency(roundAmount(totalShare)), tone: "neutral" },
      { label: "Net Position", value: `${netPosition >= 0 ? "+" : ""}${formatCurrency(roundAmount(netPosition))}`, tone: netPosition >= 0 ? "positive" : "warning" },
      { label: "Settlements", value: `${formatCurrency(roundAmount(settlementsSent))} sent / ${formatCurrency(roundAmount(settlementsReceived))} received`, tone: "neutral" },
    ],
    counterparties: calculateCounterpartyBalances(personId, people, filteredExpenses, settlements),
    expenses: personalExpenses,
    settlements: settlements
      .map((settlement) => settlementToLedgerRow(settlement, people, peopleMap))
      .sort((a, b) => compareText(b.date, a.date)),
    dataQuality: buildDataQuality(people, filteredExpenses, settlements),
  };
}
