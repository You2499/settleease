import { calculateNetBalances, calculateSimplifiedTransactions } from "@/lib/settleease/settlementCalculations";
import {
  getItemLineTotal,
  getItemParticipantIds,
} from "@/lib/settleease/itemwiseCalculations";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  Expense,
  ManualSettlementOverride,
  Person,
  SettlementPayment,
} from "@/lib/settleease/types";
import type { ReportRedactionMap, ReportRedactionValue } from "@/lib/settleease/aiRedaction";
import { DATE_PRESETS } from "../constants";
import type {
  AuditActivityGroup,
  AuditActivityItem,
  AuditBalanceRow,
  AuditCalculationLine,
  AuditCategoryRow,
  AuditCounterpartyBalance,
  AuditDataQuality,
  AuditExpenseItemProof,
  AuditExpenseProof,
  AuditHistoricalSettlementEffect,
  AuditManualOverrideProof,
  AuditPairwiseExpenseContribution,
  AuditParticipantEffect,
  AuditPersonAmount,
  AuditPersonalExpenseProof,
  AuditSettlementLedgerRow,
  AuditTransactionProof,
  DatePreset,
  ExportDateRange,
  AuditGroupReportModel,
  AuditPersonalReportModel,
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
  redacted?: boolean;
  redactions?: ReportRedactionMap;
}

interface BuildGroupSummaryReportModelParams extends BuildBaseReportModelParams {
  categories: { name: string; icon_name?: string | null }[];
}

interface BuildPersonalStatementReportModelParams extends BuildBaseReportModelParams {
  selectedPersonId: string | null;
  categories?: { name: string; icon_name?: string | null }[];
}

function toReportAmount(value: number | string | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function roundReportAmount(value: number): number {
  return Number(value.toFixed(2));
}

function compareReportText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function safeReportDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatReportDate(value: string | Date | null | undefined): string {
  const date = safeReportDate(value);
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatReportDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function idToName(people: Person[], peopleMap: Record<string, string>, id: string): string {
  return peopleMap[id] || people.find((person) => person.id === id)?.name || "Unknown person";
}

function compareAmountDescThenName<T extends { amount: number; name?: string; person?: string; description?: string }>(
  a: T,
  b: T
): number {
  const amountDelta = b.amount - a.amount;
  if (Math.abs(amountDelta) > EPSILON) return amountDelta;
  return compareReportText(a.name || a.person || a.description || "", b.name || b.person || b.description || "");
}

function isInDateRange(value: string | Date | null | undefined, dateRange: ExportDateRange): boolean {
  if (dateRange.isAllTime) return true;
  const date = safeReportDate(value);
  if (!date || !dateRange.startDate || !dateRange.endDate) return false;

  const start = new Date(dateRange.startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(dateRange.endDate);
  end.setHours(23, 59, 59, 999);

  return date >= start && date <= end;
}

function isBeforeDateRange(value: string | Date | null | undefined, dateRange: ExportDateRange): boolean {
  if (dateRange.isAllTime || !dateRange.startDate) return false;
  const date = safeReportDate(value);
  if (!date) return false;

  const start = new Date(dateRange.startDate);
  start.setHours(0, 0, 0, 0);
  return date < start;
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
      ? `${formatReportDate(startDate)} - ${formatReportDate(endDate)}`
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

function isSensitiveText(value: string): boolean {
  return /alcohol|cigarettes?|beer|wine|liquor|cocktail|drink|drinks|vape|tobacco|smoke|cannabis|weed|gambl|casino|betting|adult|condom|contraceptive|pharmacy|medicine|medical|doctor|clinic|hospital|therapy|personal hygiene|sanitary|private gift|dating|nightlife|strip/i.test(value);
}

function getCategoryIconName(
  categoryName: string | null | undefined,
  categories: { name: string; icon_name?: string | null }[] = []
): string | null {
  if (!categoryName) return null;
  return categories.find((category) => category.name === categoryName)?.icon_name || null;
}

function getTotalPaid(expense: Expense, personId: string): number {
  return (expense.paid_by || [])
    .filter((payment) => payment.personId === personId)
    .reduce((sum, payment) => sum + toReportAmount(payment.amount), 0);
}

function getShareAmount(expense: Expense, personId: string): number {
  return toReportAmount(expense.shares?.find((share) => share.personId === personId)?.amount);
}

function getCelebrationAmount(expense: Expense, personId: string): number {
  return expense.celebration_contribution?.personId === personId
    ? toReportAmount(expense.celebration_contribution.amount)
    : 0;
}

function getTotalObligation(expense: Expense, personId: string): number {
  return getShareAmount(expense, personId) + getCelebrationAmount(expense, personId);
}

function isPersonInExpense(expense: Expense, personId: string): boolean {
  return getTotalPaid(expense, personId) > EPSILON || getTotalObligation(expense, personId) > EPSILON;
}

function getPaidByRows(
  expense: Expense,
  people: Person[],
  peopleMap: Record<string, string>
): AuditPersonAmount[] {
  return (expense.paid_by || [])
    .map((payment) => ({
      person: idToName(people, peopleMap, payment.personId),
      amount: roundReportAmount(toReportAmount(payment.amount)),
    }))
    .filter((row) => Math.abs(row.amount) > EPSILON)
    .sort((a, b) => compareReportText(a.person, b.person));
}

function getShareRows(
  expense: Expense,
  people: Person[],
  peopleMap: Record<string, string>
): AuditPersonAmount[] {
  return (expense.shares || [])
    .map((share) => ({
      person: idToName(people, peopleMap, share.personId),
      amount: roundReportAmount(toReportAmount(share.amount)),
    }))
    .filter((row) => Math.abs(row.amount) > EPSILON)
    .sort((a, b) => compareReportText(a.person, b.person));
}

function getItemRows(
  expense: Expense,
  people: Person[],
  peopleMap: Record<string, string>,
  redacted = false,
  redaction?: ReportRedactionValue
): AuditExpenseItemProof[] {
  if (expense.split_method !== "itemwise" || !Array.isArray(expense.items)) return [];

  return expense.items
    .map((item, index) => {
      const shouldRedact = redacted && isSensitiveText(`${item.name} ${item.categoryName || ""}`);
      const itemRedaction = redaction?.items?.[item.id];
      return {
        name: redacted && itemRedaction?.name
          ? itemRedaction.name
          : shouldRedact
            ? `Item ${index + 1}`
            : item.name || `Item ${index + 1}`,
        category: redacted && itemRedaction?.category
          ? itemRedaction.category
          : shouldRedact
            ? "General"
            : item.categoryName || expense.category || UNCATEGORIZED,
        sharedBy: getItemParticipantIds(item).map((id) => idToName(people, peopleMap, id)).sort(compareReportText),
        amount: roundReportAmount(toReportAmount(getItemLineTotal(item))),
        quantity: item.quantity,
        unitPrice: item.unitPrice !== undefined ? roundReportAmount(toReportAmount(item.unitPrice)) : undefined,
      };
    })
    .sort(compareAmountDescThenName);
}

function buildParticipantEffects(
  expense: Expense,
  people: Person[],
  peopleMap: Record<string, string>
): AuditParticipantEffect[] {
  return people
    .map((person) => {
      const paid = getTotalPaid(expense, person.id);
      const share = getShareAmount(expense, person.id);
      const celebrationContribution = getCelebrationAmount(expense, person.id);
      return {
        person: idToName(people, peopleMap, person.id),
        paid: roundReportAmount(paid),
        share: roundReportAmount(share),
        celebrationContribution: roundReportAmount(celebrationContribution),
        netEffect: roundReportAmount(paid - share - celebrationContribution),
      };
    })
    .filter(
      (effect) =>
        Math.abs(effect.paid) > EPSILON ||
        Math.abs(effect.share) > EPSILON ||
        Math.abs(effect.celebrationContribution) > EPSILON ||
        Math.abs(effect.netEffect) > EPSILON
    )
    .sort((a, b) => compareReportText(a.person, b.person));
}

function buildExpenseProof(
  expense: Expense,
  people: Person[],
  peopleMap: Record<string, string>,
  categories: { name: string; icon_name?: string | null }[] = [],
  redacted = false,
  redactions: ReportRedactionMap = {}
): AuditExpenseProof {
  const redaction = redactions[expense.id];
  const isSensitive = redacted && isSensitiveText(`${expense.description} ${expense.category}`);
  const category = redacted && redaction?.category
    ? redaction.category
    : isSensitive
      ? "General"
      : expense.category || UNCATEGORIZED;
  const date = safeReportDate(expense.created_at);

  return {
    description: redacted && redaction?.description
      ? redaction.description
      : isSensitive
        ? "Misc expense"
        : expense.description || "Untitled expense",
    category,
    categoryIconName: getCategoryIconName(category, categories),
    date: formatReportDate(expense.created_at),
    sortTime: date?.getTime() || 0,
    splitMethod: expense.split_method,
    amount: roundReportAmount(toReportAmount(expense.total_amount)),
    excluded: Boolean(expense.exclude_from_settlement),
    paidBy: getPaidByRows(expense, people, peopleMap),
    shares: getShareRows(expense, people, peopleMap),
    items: getItemRows(expense, people, peopleMap, redacted, redaction),
    celebrationContribution: expense.celebration_contribution
      ? {
          person: idToName(people, peopleMap, expense.celebration_contribution.personId),
          amount: roundReportAmount(toReportAmount(expense.celebration_contribution.amount)),
        }
      : null,
    participantEffects: buildParticipantEffects(expense, people, peopleMap),
  };
}

function buildSettlementLedgerRow(
  settlement: SettlementPayment,
  people: Person[],
  peopleMap: Record<string, string>
): AuditSettlementLedgerRow {
  const date = safeReportDate(settlement.settled_at);
  return {
    debtor: idToName(people, peopleMap, settlement.debtor_id),
    creditor: idToName(people, peopleMap, settlement.creditor_id),
    amount: roundReportAmount(toReportAmount(settlement.amount_settled)),
    date: formatReportDate(settlement.settled_at),
    sortTime: date?.getTime() || 0,
    notes: settlement.notes || null,
  };
}

function buildManualOverrideProof(
  override: ManualSettlementOverride,
  people: Person[],
  peopleMap: Record<string, string>,
  netBalances?: Record<string, number>
): AuditManualOverrideProof {
  let status: AuditManualOverrideProof["status"] = override.is_active ? "Active" : "Inactive";

  if (override.is_active && netBalances) {
    const debtorBalance = netBalances[override.debtor_id] || 0;
    const creditorBalance = netBalances[override.creditor_id] || 0;
    if (!(debtorBalance < -EPSILON && creditorBalance > EPSILON)) {
      status = "Not applied";
    }
  }

  return {
    debtor: idToName(people, peopleMap, override.debtor_id),
    creditor: idToName(people, peopleMap, override.creditor_id),
    amount: roundReportAmount(toReportAmount(override.amount)),
    notes: override.notes || null,
    status,
  };
}

function buildDataQuality(
  people: Person[],
  expenses: Expense[],
  settlements: SettlementPayment[],
  manualOverrides: ManualSettlementOverride[],
  dateRange: ExportDateRange
): AuditDataQuality {
  const knownPeople = new Set(people.map((person) => person.id));
  const warnings: string[] = [];

  expenses.forEach((expense) => {
    const label = expense.description || "Untitled expense";
    const totalAmount = toReportAmount(expense.total_amount);
    const paidTotal = (expense.paid_by || []).reduce((sum, payment) => sum + toReportAmount(payment.amount), 0);
    const shareTotal = (expense.shares || []).reduce((sum, share) => sum + toReportAmount(share.amount), 0);
    const celebrationAmount = toReportAmount(expense.celebration_contribution?.amount);

    if (!Number.isFinite(Number(expense.total_amount)) || totalAmount < 0) {
      warnings.push(`Expense "${label}" has an invalid total amount.`);
    }

    if (!safeReportDate(expense.created_at)) {
      warnings.push(`Expense "${label}" has an invalid or missing date.`);
    }

    if (Math.abs(paidTotal - totalAmount) > EPSILON) {
      warnings.push(`Expense "${label}" has paid total ${roundReportAmount(paidTotal)} but bill total ${roundReportAmount(totalAmount)}.`);
    }

    if (!expense.exclude_from_settlement && Math.abs(shareTotal + celebrationAmount - totalAmount) > EPSILON) {
      warnings.push(`Expense "${label}" has allocated shares ${roundReportAmount(shareTotal + celebrationAmount)} but bill total ${roundReportAmount(totalAmount)}.`);
    }

    (expense.paid_by || []).forEach((payment) => {
      if (!knownPeople.has(payment.personId)) warnings.push(`Expense "${label}" references an unknown payer.`);
      if (!Number.isFinite(Number(payment.amount)) || toReportAmount(payment.amount) < 0) {
        warnings.push(`Expense "${label}" has an invalid payer amount.`);
      }
    });

    (expense.shares || []).forEach((share) => {
      if (!knownPeople.has(share.personId)) warnings.push(`Expense "${label}" references an unknown participant share.`);
      if (!Number.isFinite(Number(share.amount)) || toReportAmount(share.amount) < 0) {
        warnings.push(`Expense "${label}" has an invalid share amount.`);
      }
    });

    if (expense.celebration_contribution) {
      if (!knownPeople.has(expense.celebration_contribution.personId)) {
        warnings.push(`Expense "${label}" references an unknown celebration contributor.`);
      }
      if (!Number.isFinite(Number(expense.celebration_contribution.amount)) || toReportAmount(expense.celebration_contribution.amount) < 0) {
        warnings.push(`Expense "${label}" has an invalid celebration contribution.`);
      }
    }

    (expense.items || []).forEach((item) => {
      if (!Number.isFinite(Number(getItemLineTotal(item))) || toReportAmount(getItemLineTotal(item)) < 0) {
        warnings.push(`Expense "${label}" item "${item.name || "Untitled item"}" has an invalid amount.`);
      }
      getItemParticipantIds(item).forEach((personId) => {
        if (!knownPeople.has(personId)) {
          warnings.push(`Expense "${label}" item "${item.name || "Untitled item"}" references an unknown participant.`);
        }
      });
    });
  });

  settlements.forEach((settlement) => {
    if (!knownPeople.has(settlement.debtor_id)) warnings.push("Settlement payment references an unknown payer.");
    if (!knownPeople.has(settlement.creditor_id)) warnings.push("Settlement payment references an unknown receiver.");
    if (!safeReportDate(settlement.settled_at)) warnings.push("Settlement payment has an invalid or missing date.");
    if (!Number.isFinite(Number(settlement.amount_settled)) || toReportAmount(settlement.amount_settled) < 0) {
      warnings.push("Settlement payment has an invalid amount.");
    }
  });

  const netBalances = calculateNetBalances(
    people,
    expenses.filter((expense) => !expense.exclude_from_settlement && isInDateRange(expense.created_at, dateRange)),
    settlements.filter((settlement) => isInDateRange(settlement.settled_at, dateRange))
  );

  manualOverrides.forEach((override) => {
    if (!knownPeople.has(override.debtor_id)) warnings.push("Manual override references an unknown payer.");
    if (!knownPeople.has(override.creditor_id)) warnings.push("Manual override references an unknown receiver.");
    if (!Number.isFinite(Number(override.amount)) || toReportAmount(override.amount) < 0) {
      warnings.push("Manual override has an invalid amount.");
    }
    if (override.is_active) {
      const debtorBalance = netBalances[override.debtor_id] || 0;
      const creditorBalance = netBalances[override.creditor_id] || 0;
      if (!(debtorBalance < -EPSILON && creditorBalance > EPSILON)) {
        warnings.push("Active manual override cannot apply because payer or receiver balance is no longer eligible.");
      }
    }
  });

  const uniqueWarnings = [...new Set(warnings)].sort(compareReportText);

  return {
    passes: uniqueWarnings.length === 0,
    checkedExpenses: expenses.length,
    warnings: uniqueWarnings,
  };
}

function buildCategoryRows(
  includedExpenses: Expense[],
  categories: { name: string; icon_name?: string | null }[] = []
): AuditCategoryRow[] {
  const totals = new Map<string, number>();

  includedExpenses.forEach((expense) => {
    if (expense.split_method === "itemwise" && expense.items?.length) {
      expense.items.forEach((item) => {
        const category = item.categoryName || expense.category || UNCATEGORIZED;
        totals.set(category, (totals.get(category) || 0) + toReportAmount(getItemLineTotal(item)));
      });
      return;
    }

    const category = expense.category || UNCATEGORIZED;
    totals.set(category, (totals.get(category) || 0) + toReportAmount(expense.total_amount));
  });

  const total = [...totals.values()].reduce((sum, amount) => sum + amount, 0);

  return [...totals.entries()]
    .map(([name, amount]) => ({
      name,
      iconName: getCategoryIconName(name, categories),
      amount: roundReportAmount(amount),
      share: total > EPSILON ? roundReportAmount((amount / total) * 100) : 0,
    }))
    .sort(compareAmountDescThenName);
}

function buildBalanceRows(
  people: Person[],
  peopleMap: Record<string, string>,
  netBalances: Record<string, number>
): AuditBalanceRow[] {
  return people
    .map((person) => {
      const balance = roundReportAmount(netBalances[person.id] || 0);
      return {
        name: idToName(people, peopleMap, person.id),
        amount: Math.abs(balance),
        direction: Math.abs(balance) <= EPSILON ? "Settled" as const : balance > 0 ? "Receives" as const : "Pays" as const,
      };
    })
    .sort((a, b) => {
      const unsettledDelta = Number(b.direction !== "Settled") - Number(a.direction !== "Settled");
      if (unsettledDelta !== 0) return unsettledDelta;
      const amountDelta = b.amount - a.amount;
      if (Math.abs(amountDelta) > EPSILON) return amountDelta;
      return compareReportText(a.name, b.name);
    });
}

function buildActivityGroups(
  expenses: AuditExpenseProof[],
  settlements: AuditSettlementLedgerRow[]
): AuditActivityGroup[] {
  const groups = new Map<string, AuditActivityGroup>();

  function addItem(date: string, sortTime: number, item: AuditActivityItem) {
    const existing = groups.get(date) || { date, sortTime, items: [] };
    existing.sortTime = Math.max(existing.sortTime, sortTime);
    existing.items.push(item);
    groups.set(date, existing);
  }

  expenses.forEach((expense) => {
    addItem(expense.date, expense.sortTime, {
      type: "expense",
      title: expense.description,
      subtitle: `${expense.category} • ${expense.splitMethod}${expense.excluded ? " • Excluded" : ""}`,
      amount: expense.amount,
      badge: expense.excluded ? "Excluded expense" : "Included expense",
      tone: expense.excluded ? "warning" : "neutral",
    });
  });

  settlements.forEach((settlement) => {
    addItem(settlement.date, settlement.sortTime, {
      type: "settlement",
      title: `${settlement.debtor} paid ${settlement.creditor}`,
      subtitle: settlement.notes || "Settlement payment",
      amount: settlement.amount,
      badge: "Settlement",
      tone: "positive",
    });
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => {
        if (a.type !== b.type) return a.type === "expense" ? -1 : 1;
        const amountDelta = b.amount - a.amount;
        if (Math.abs(amountDelta) > EPSILON) return amountDelta;
        return compareReportText(a.title, b.title);
      }),
    }))
    .sort((a, b) => b.sortTime - a.sortTime);
}

function buildPairwiseExpenseContribution(
  expense: Expense,
  participantId: string
): AuditPairwiseExpenseContribution {
  return {
    description: expense.description || "Untitled expense",
    category: expense.category || UNCATEGORIZED,
    date: formatReportDate(expense.created_at),
    amount: roundReportAmount(getTotalObligation(expense, participantId)),
  };
}

function buildTransactionProofs({
  people,
  peopleMap,
  includedExpenses,
  currentSettlements,
  historicalExpenses,
  historicalSettlements,
  manualOverrides,
}: {
  people: Person[];
  peopleMap: Record<string, string>;
  includedExpenses: Expense[];
  currentSettlements: SettlementPayment[];
  historicalExpenses: Expense[];
  historicalSettlements: SettlementPayment[];
  manualOverrides: ManualSettlementOverride[];
}): AuditTransactionProof[] {
  const activeOverrides = manualOverrides.filter((override) => override.is_active);
  const currentNetBalances = calculateNetBalances(people, includedExpenses, currentSettlements);
  const transactions = calculateSimplifiedTransactions(people, includedExpenses, currentSettlements, manualOverrides);

  return transactions
    .filter((transaction) => toReportAmount(transaction.amount) > EPSILON)
    .map((transaction) => {
      const debtor = idToName(people, peopleMap, transaction.from);
      const creditor = idToName(people, peopleMap, transaction.to);

      const contributingExpenses = includedExpenses
        .filter((expense) => getTotalPaid(expense, transaction.to) > EPSILON && getTotalObligation(expense, transaction.from) > EPSILON)
        .map((expense) => buildPairwiseExpenseContribution(expense, transaction.from))
        .sort(compareAmountDescThenName);

      const offsetExpenses = includedExpenses
        .filter((expense) => getTotalPaid(expense, transaction.from) > EPSILON && getTotalObligation(expense, transaction.to) > EPSILON)
        .map((expense) => buildPairwiseExpenseContribution(expense, transaction.to))
        .sort(compareAmountDescThenName);

      const historicalDebtorOwes = historicalExpenses
        .filter((expense) => getTotalPaid(expense, transaction.to) > EPSILON && getTotalObligation(expense, transaction.from) > EPSILON)
        .reduce((sum, expense) => sum + getTotalObligation(expense, transaction.from), 0);
      const historicalCreditorOwes = historicalExpenses
        .filter((expense) => getTotalPaid(expense, transaction.from) > EPSILON && getTotalObligation(expense, transaction.to) > EPSILON)
        .reduce((sum, expense) => sum + getTotalObligation(expense, transaction.to), 0);

      const historicalSettlementRows: AuditHistoricalSettlementEffect[] = historicalSettlements
        .filter(
          (settlement) =>
            (settlement.debtor_id === transaction.from && settlement.creditor_id === transaction.to) ||
            (settlement.debtor_id === transaction.to && settlement.creditor_id === transaction.from)
        )
        .map((settlement) => {
          const forward = settlement.debtor_id === transaction.from && settlement.creditor_id === transaction.to;
          const amount = roundReportAmount(toReportAmount(settlement.amount_settled));
          return {
            date: formatReportDate(settlement.settled_at),
            direction: `${idToName(people, peopleMap, settlement.debtor_id)} paid ${idToName(people, peopleMap, settlement.creditor_id)}`,
            amount,
            effect: forward ? -amount : amount,
          };
        });

      const settlementEffect = historicalSettlementRows.reduce((sum, settlement) => sum + settlement.effect, 0);
      const priorBalance = roundReportAmount(historicalDebtorOwes - historicalCreditorOwes + settlementEffect);
      const manualOverride = activeOverrides.find(
        (override) => override.debtor_id === transaction.from && override.creditor_id === transaction.to
      );
      const manualOverrideProof = manualOverride
        ? buildManualOverrideProof(manualOverride, people, peopleMap, currentNetBalances)
        : null;

      const debtorPeriodNet = roundReportAmount(Math.abs(Math.min(currentNetBalances[transaction.from] || 0, 0)));
      const creditorPeriodNet = roundReportAmount(Math.max(currentNetBalances[transaction.to] || 0, 0));
      const currentDebtorOwes = contributingExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const currentCreditorOwes = offsetExpenses.reduce((sum, expense) => sum + expense.amount, 0);

      const calculationLines: AuditCalculationLine[] = [
        ...(Math.abs(priorBalance) > EPSILON ? [{ label: "Prior carried pair balance", amount: priorBalance }] : []),
        { label: `${debtor} direct shares covered by ${creditor}`, amount: roundReportAmount(currentDebtorOwes) },
        { label: `${creditor} direct shares covered by ${debtor}`, amount: -roundReportAmount(currentCreditorOwes) },
        { label: `${debtor} total net payable across group`, amount: debtorPeriodNet },
        { label: `${creditor} total net receivable across group`, amount: creditorPeriodNet },
        { label: "Optimized settlement output", amount: roundReportAmount(transaction.amount), emphasis: true },
      ];

      return {
        debtor,
        creditor,
        amount: roundReportAmount(transaction.amount),
        status: manualOverrideProof ? "Manual path" : "Optimized outstanding payment",
        contributingExpenses,
        offsetExpenses,
        priorBalance,
        historicalSettlements: historicalSettlementRows,
        manualOverride: manualOverrideProof,
        calculationLines,
      };
    })
    .sort(compareAmountDescThenName);
}

function calculateCounterpartyBalances(
  selectedPersonId: string,
  people: Person[],
  expenses: Expense[],
  settlements: SettlementPayment[],
  peopleMap: Record<string, string>
): AuditCounterpartyBalance[] {
  const balances = new Map<string, number>();
  people.forEach((person) => {
    if (person.id !== selectedPersonId) balances.set(person.id, 0);
  });

  expenses.forEach((expense) => {
    const totalPaidInExpense = (expense.paid_by || []).reduce((sum, payment) => sum + toReportAmount(payment.amount), 0);
    if (totalPaidInExpense <= EPSILON) return;

    const selectedPaid = getTotalPaid(expense, selectedPersonId);
    const selectedObligation = getTotalObligation(expense, selectedPersonId);

    people.forEach((otherPerson) => {
      if (otherPerson.id === selectedPersonId) return;
      const otherPaid = getTotalPaid(expense, otherPerson.id);
      const otherObligation = getTotalObligation(expense, otherPerson.id);
      const otherOwesSelected = (selectedPaid / totalPaidInExpense) * otherObligation;
      const selectedOwesOther = (otherPaid / totalPaidInExpense) * selectedObligation;
      balances.set(otherPerson.id, (balances.get(otherPerson.id) || 0) + otherOwesSelected - selectedOwesOther);
    });
  });

  settlements.forEach((settlement) => {
    const amount = toReportAmount(settlement.amount_settled);
    if (settlement.debtor_id === selectedPersonId) {
      balances.set(settlement.creditor_id, (balances.get(settlement.creditor_id) || 0) + amount);
    } else if (settlement.creditor_id === selectedPersonId) {
      balances.set(settlement.debtor_id, (balances.get(settlement.debtor_id) || 0) - amount);
    }
  });

  return [...balances.entries()]
    .filter(([, amount]) => Math.abs(amount) > EPSILON)
    .map(([personId, amount]) => ({
      name: idToName(people, peopleMap, personId),
      amount: roundReportAmount(Math.abs(amount)),
      direction: amount > 0 ? "Owes you" as const : "You owe" as const,
    }))
    .sort(compareAmountDescThenName);
}

function buildPersonalExpenseProof(
  expense: Expense,
  selectedPersonId: string,
  people: Person[],
  peopleMap: Record<string, string>,
  categories: { name: string; icon_name?: string | null }[],
  redacted: boolean,
  redactions: ReportRedactionMap
): AuditPersonalExpenseProof {
  const proof = buildExpenseProof(expense, people, peopleMap, categories, redacted, redactions);
  const paidByPerson = roundReportAmount(getTotalPaid(expense, selectedPersonId));
  const shareForPerson = roundReportAmount(getTotalObligation(expense, selectedPersonId));

  return {
    ...proof,
    paidByPerson,
    shareForPerson,
    netEffectForPerson: roundReportAmount(paidByPerson - shareForPerson),
    counterpartyEffects: calculateCounterpartyBalances(selectedPersonId, people, [expense], [], peopleMap),
  };
}

export function buildGroupSummaryReportModel({
  people,
  expenses,
  settlementPayments,
  manualOverrides,
  peopleMap,
  categories,
  dateRange,
  reportName,
  generatedAt = new Date(),
  redacted = false,
  redactions = {},
}: BuildGroupSummaryReportModelParams): AuditGroupReportModel {
  const filteredExpenses = expenses.filter((expense) => isInDateRange(expense.created_at, dateRange));
  const includedExpenses = filteredExpenses.filter((expense) => !expense.exclude_from_settlement);
  const excludedExpenses = filteredExpenses.filter((expense) => expense.exclude_from_settlement);
  const currentSettlements = settlementPayments.filter((settlement) => isInDateRange(settlement.settled_at, dateRange));
  const historicalExpenses = expenses.filter((expense) => !expense.exclude_from_settlement && isBeforeDateRange(expense.created_at, dateRange));
  const historicalSettlements = settlementPayments.filter((settlement) => isBeforeDateRange(settlement.settled_at, dateRange));
  const netBalances = calculateNetBalances(people, includedExpenses, currentSettlements);
  const transactionProofs = buildTransactionProofs({
    people,
    peopleMap,
    includedExpenses,
    currentSettlements,
    historicalExpenses,
    historicalSettlements,
    manualOverrides,
  });

  const includedSpend = includedExpenses.reduce((sum, expense) => sum + toReportAmount(expense.total_amount), 0);
  const excludedSpend = excludedExpenses.reduce((sum, expense) => sum + toReportAmount(expense.total_amount), 0);
  const alreadySettled = currentSettlements.reduce((sum, settlement) => sum + toReportAmount(settlement.amount_settled), 0);
  const remaining = transactionProofs.reduce((sum, proof) => sum + proof.amount, 0);
  const expenseProofs = includedExpenses
    .map((expense) => buildExpenseProof(expense, people, peopleMap, categories, redacted, redactions))
    .sort((a, b) => b.sortTime - a.sortTime || b.amount - a.amount);
  const excludedProofs = excludedExpenses
    .map((expense) => buildExpenseProof(expense, people, peopleMap, categories, redacted, redactions))
    .sort((a, b) => b.sortTime - a.sortTime || b.amount - a.amount);
  const settlementRows = currentSettlements
    .map((settlement) => buildSettlementLedgerRow(settlement, people, peopleMap))
    .sort((a, b) => b.sortTime - a.sortTime || b.amount - a.amount);
  const reportTitle = reportName?.trim() || "SettleEase Group Summary";

  return {
    kind: "group",
    title: reportTitle,
    generatedAt: formatReportDateTime(generatedAt),
    dateRangeLabel: dateRange.label,
    redacted,
    participantCount: people.length,
    metrics: [
      { label: "Included Spend", value: formatCurrency(roundReportAmount(includedSpend)), tone: "neutral" },
      { label: "Excluded Spend", value: formatCurrency(roundReportAmount(excludedSpend)), tone: excludedSpend > EPSILON ? "warning" : "neutral" },
      { label: "Already Settled", value: formatCurrency(roundReportAmount(alreadySettled)), tone: "positive" },
      { label: "Remaining", value: formatCurrency(roundReportAmount(remaining)), tone: remaining > EPSILON ? "warning" : "positive" },
    ],
    includedExpenses: expenseProofs,
    excludedExpenses: excludedProofs,
    settlements: settlementRows,
    activityGroups: buildActivityGroups([...expenseProofs, ...excludedProofs], settlementRows),
    transactionProofs,
    balances: buildBalanceRows(people, peopleMap, netBalances),
    categories: buildCategoryRows(includedExpenses, categories),
    manualOverrides: manualOverrides
      .map((override) => buildManualOverrideProof(override, people, peopleMap, netBalances))
      .sort(compareAmountDescThenName),
    dataQuality: buildDataQuality(people, expenses, settlementPayments, manualOverrides, dateRange),
  };
}

export function buildPersonalStatementReportModel({
  people,
  expenses,
  settlementPayments,
  manualOverrides,
  peopleMap,
  categories = [],
  dateRange,
  reportName,
  selectedPersonId,
  redacted = false,
  generatedAt = new Date(),
  redactions = {},
}: BuildPersonalStatementReportModelParams): AuditPersonalReportModel {
  const selectedPerson = selectedPersonId
    ? people.find((person) => person.id === selectedPersonId)
    : people[0];
  const personId = selectedPerson?.id || "";
  const personName = selectedPerson?.name || "Select a participant";

  const filteredExpenses = expenses.filter((expense) => isInDateRange(expense.created_at, dateRange));
  const includedPersonalExpenses = filteredExpenses.filter((expense) => !expense.exclude_from_settlement && isPersonInExpense(expense, personId));
  const excludedPersonalExpenses = filteredExpenses.filter((expense) => expense.exclude_from_settlement && isPersonInExpense(expense, personId));
  const personalSettlements = settlementPayments.filter(
    (settlement) =>
      isInDateRange(settlement.settled_at, dateRange) &&
      (settlement.debtor_id === personId || settlement.creditor_id === personId)
  );

  const totalPaid = includedPersonalExpenses.reduce((sum, expense) => sum + getTotalPaid(expense, personId), 0);
  const totalShare = includedPersonalExpenses.reduce((sum, expense) => sum + getTotalObligation(expense, personId), 0);
  const settlementsSent = personalSettlements
    .filter((settlement) => settlement.debtor_id === personId)
    .reduce((sum, settlement) => sum + toReportAmount(settlement.amount_settled), 0);
  const settlementsReceived = personalSettlements
    .filter((settlement) => settlement.creditor_id === personId)
    .reduce((sum, settlement) => sum + toReportAmount(settlement.amount_settled), 0);
  const netPosition = totalPaid - totalShare + settlementsSent - settlementsReceived;

  const personalExpenseProofs = includedPersonalExpenses
    .map((expense) => buildPersonalExpenseProof(expense, personId, people, peopleMap, categories, redacted, redactions))
    .sort((a, b) => b.sortTime - a.sortTime || b.amount - a.amount);
  const excludedProofs = excludedPersonalExpenses
    .map((expense) => buildPersonalExpenseProof(expense, personId, people, peopleMap, categories, redacted, redactions))
    .sort((a, b) => b.sortTime - a.sortTime || b.amount - a.amount);
  const settlementRows = personalSettlements
    .map((settlement) => buildSettlementLedgerRow(settlement, people, peopleMap))
    .sort((a, b) => b.sortTime - a.sortTime || b.amount - a.amount);

  const counterparties = calculateCounterpartyBalances(personId, people, includedPersonalExpenses, personalSettlements, peopleMap);

  return {
    kind: "personal",
    title: reportName?.trim() || `${personName} Personal Statement`,
    personName,
    generatedAt: formatReportDateTime(generatedAt),
    dateRangeLabel: dateRange.label,
    redacted,
    metrics: [
      { label: "Total Paid", value: formatCurrency(roundReportAmount(totalPaid)), tone: "positive" },
      { label: "Total Share", value: formatCurrency(roundReportAmount(totalShare)), tone: "neutral" },
      { label: "Net Position", value: `${netPosition >= 0 ? "+" : ""}${formatCurrency(roundReportAmount(netPosition))}`, tone: netPosition >= 0 ? "positive" : "warning" },
      { label: "Settlements", value: `${formatCurrency(roundReportAmount(settlementsSent))} sent / ${formatCurrency(roundReportAmount(settlementsReceived))} received`, tone: "neutral" },
    ],
    expenses: personalExpenseProofs,
    excludedExpenses: excludedProofs,
    settlements: settlementRows,
    counterparties,
    finalBalances: counterparties,
    dataQuality: buildDataQuality(people, expenses, settlementPayments, manualOverrides, dateRange),
  };
}
