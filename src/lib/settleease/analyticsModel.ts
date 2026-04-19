import { calculateNetBalances } from "./settlementCalculations";
import type { Expense, Person, SettlementPayment, Category } from "./types";

export type AnalyticsMode = "group" | "personal";
export type AnalyticsGranularity = "weekly" | "monthly";
export type AnalyticsDatePreset = "30d" | "90d" | "1y" | "all" | "custom";

export interface AnalyticsDateRange {
  preset?: AnalyticsDatePreset;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

export interface AnalyticsResolvedDateRange {
  preset: AnalyticsDatePreset;
  label: string;
  isAllTime: boolean;
  startDate: Date | null;
  endDate: Date | null;
}

export interface AnalyticsLedgerEvent {
  id: string;
  type: "expense" | "settlement";
  date: Date;
  dateKey: string;
  label: string;
  amount: number;
  balanceAfterEvent: number;
}

export interface AnalyticsChartPoint {
  key: string;
  label: string;
  value: number;
  sortValue: number;
}

export interface AnalyticsChartSeries {
  id: string;
  label: string;
  data: AnalyticsChartPoint[];
}

export interface AnalyticsDataQualityWarning {
  id: string;
  severity: "warning" | "error";
  message: string;
  expenseId?: string;
  settlementId?: string;
}

export interface AnalyticsNamedAmount {
  name: string;
  amount: number;
}

export interface AnalyticsSnapshot {
  totalSpend: number;
  expenseCount: number;
  averageExpense: number;
  participantCount: number;
  dateRangeLabel: string;
  topCategory: AnalyticsNamedAmount | null;
  largestExpense: {
    id: string;
    description: string;
    amount: number;
    dateLabel: string;
    excluded: boolean;
  } | null;
  currentNetBalance: number | null;
  totalOutstanding: number;
}

export interface AnalyticsTrustStrip {
  spendingExpenseCount: number;
  settlementExpenseCount: number;
  excludedExpenseCount: number;
  settlementPaymentCount: number;
  dataQualityWarningCount: number;
  balanceReconciled: boolean;
  balanceDelta: number;
}

export interface AnalyticsCategoryDatum {
  name: string;
  iconName: string;
  amount: number;
  share: number;
  expenseCount: number;
}

export interface AnalyticsSplitMethodDatum {
  method: Expense["split_method"];
  label: string;
  count: number;
  share: number;
}

export interface AnalyticsActivityDay {
  dateKey: string;
  label: string;
  sortValue: number;
  transactionCount: number;
  totalAmount: number;
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    excluded: boolean;
  }>;
}

export interface AnalyticsBalancePoint {
  key: string;
  dateKey: string;
  label: string;
  balance: number;
  sortValue: number;
  isBaseline?: boolean;
}

export interface AnalyticsPaidVsShareDatum {
  personId: string;
  name: string;
  paid: number;
  obligation: number;
  netBeforeSettlements: number;
  settlementsSent: number;
  settlementsReceived: number;
  netBalance: number;
}

export interface AnalyticsParticipantRow extends AnalyticsPaidVsShareDatum {
  expensesPaidCount: number;
  expensesSharedCount: number;
  averageObligation: number;
  topCategory: AnalyticsNamedAmount | null;
}

export interface AnalyticsCategoryRow {
  name: string;
  iconName: string;
  totalAmount: number;
  expenseCount: number;
  averageAmount: number;
  largestEntry: {
    description: string;
    amount: number;
    dateLabel: string;
  } | null;
  topPayer: AnalyticsNamedAmount | null;
}

export interface AnalyticsTopExpenseRow {
  id: string;
  description: string;
  amount: number;
  category: string;
  dateLabel: string;
  paidBy: string;
  excluded: boolean;
}

export interface AnalyticsModel {
  mode: AnalyticsMode;
  selectedPersonId: string | null;
  selectedPersonName: string | null;
  granularity: AnalyticsGranularity;
  dateRange: AnalyticsResolvedDateRange;
  snapshot: AnalyticsSnapshot;
  trust: AnalyticsTrustStrip;
  dataQualityWarnings: AnalyticsDataQualityWarning[];
  charts: {
    spendingTrend: AnalyticsChartPoint[];
    categoryTrend: {
      categories: string[];
      data: Array<Record<string, number | string>>;
    };
    dayOfWeek: AnalyticsChartPoint[];
    categoryBreakdown: AnalyticsCategoryDatum[];
    splitMethods: AnalyticsSplitMethodDatum[];
    expenseSizeDistribution: AnalyticsChartPoint[];
    averageByCategory: AnalyticsChartPoint[];
    activityHeatmap: AnalyticsActivityDay[];
    frequency: AnalyticsChartPoint[];
    velocity: AnalyticsChartPoint[];
    paidVsShare: AnalyticsPaidVsShareDatum[];
    balanceTimeline: AnalyticsBalancePoint[];
  };
  details: {
    topExpenses: AnalyticsTopExpenseRow[];
    categoryRows: AnalyticsCategoryRow[];
    participantRows: AnalyticsParticipantRow[];
  };
}

export interface AnalyticsModelInput {
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  people: Person[];
  peopleMap: Record<string, string>;
  categories: Category[];
  mode: AnalyticsMode;
  selectedPersonId?: string | null;
  dateRange?: AnalyticsDateRange;
  granularity?: AnalyticsGranularity;
  now?: Date;
}

const EPSILON = 0.01;
const UNCATEGORIZED = "Uncategorized";
const DAY_MS = 24 * 60 * 60 * 1000;

const analyticsCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const analyticsCompactCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatAnalyticsCurrency(amount: number): string {
  return analyticsCurrencyFormatter.format(roundAmount(amount));
}

export function formatAnalyticsCompactCurrency(amount: number): string {
  return analyticsCompactCurrencyFormatter.format(roundAmount(amount));
}

function toAmount(value: number | string | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

function safeDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function idToName(people: Person[], peopleMap: Record<string, string>, id: string): string {
  return peopleMap[id] || people.find((person) => person.id === id)?.name || "Unknown";
}

function getCategoryIconName(categories: Category[], categoryName: string): string {
  return categories.find((category) => category.name === categoryName)?.icon_name || "HelpCircle";
}

function resolveDateRange(range: AnalyticsDateRange | undefined, now: Date): AnalyticsResolvedDateRange {
  const explicitStart = safeDate(range?.startDate);
  const explicitEnd = safeDate(range?.endDate);
  const preset = range?.preset || (explicitStart || explicitEnd ? "custom" : "all");

  if (preset === "all") {
    return {
      preset,
      label: "All time",
      isAllTime: true,
      startDate: null,
      endDate: null,
    };
  }

  const endDate = endOfDay(explicitEnd || now);
  let startDate = explicitStart ? startOfDay(explicitStart) : startOfDay(now);

  if (!explicitStart) {
    if (preset === "30d") startDate = startOfDay(addDays(endDate, -29));
    if (preset === "90d") startDate = startOfDay(addDays(endDate, -89));
    if (preset === "1y") startDate = startOfDay(addDays(endDate, -364));
  }

  const labelByPreset: Record<AnalyticsDatePreset, string> = {
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "1y": "Last year",
    all: "All time",
    custom: `${formatFullDate(startDate)} - ${formatFullDate(endDate)}`,
  };

  return {
    preset,
    label: labelByPreset[preset],
    isAllTime: false,
    startDate,
    endDate,
  };
}

function isInDateRange(value: string | Date | null | undefined, range: AnalyticsResolvedDateRange): boolean {
  if (range.isAllTime) return true;
  const date = safeDate(value);
  if (!date || !range.startDate || !range.endDate) return false;
  return date >= range.startDate && date <= range.endDate;
}

function getTotalPaid(expense: Expense, personId: string): number {
  return (expense.paid_by || [])
    .filter((payment) => payment.personId === personId)
    .reduce((sum, payment) => sum + toAmount(payment.amount), 0);
}

function getShareAmount(expense: Expense, personId: string): number {
  return toAmount((expense.shares || []).find((share) => share.personId === personId)?.amount);
}

function getCelebrationAmount(expense: Expense, personId: string): number {
  return expense.celebration_contribution?.personId === personId
    ? toAmount(expense.celebration_contribution.amount)
    : 0;
}

function getTotalObligation(expense: Expense, personId: string): number {
  return getShareAmount(expense, personId) + getCelebrationAmount(expense, personId);
}

function isPersonInExpense(expense: Expense, personId: string): boolean {
  return getTotalPaid(expense, personId) > EPSILON || getTotalObligation(expense, personId) > EPSILON;
}

function getSpendingAmount(expense: Expense, mode: AnalyticsMode, selectedPersonId: string | null): number {
  if (mode === "group") return toAmount(expense.total_amount);
  if (!selectedPersonId) return 0;
  return getTotalObligation(expense, selectedPersonId);
}

interface CategoryAllocation {
  category: string;
  amount: number;
  expenseId: string;
  description: string;
  date: Date | null;
}

function getCategoryAllocations(
  expense: Expense,
  mode: AnalyticsMode,
  selectedPersonId: string | null
): CategoryAllocation[] {
  const allocations: CategoryAllocation[] = [];
  const fallbackCategory = expense.category || UNCATEGORIZED;
  const expenseDate = safeDate(expense.created_at);
  const totalAmount = toAmount(expense.total_amount);
  const celebrationAmount = toAmount(expense.celebration_contribution?.amount);

  if (expense.split_method === "itemwise" && Array.isArray(expense.items) && expense.items.length > 0) {
    const itemTotal = expense.items.reduce((sum, item) => sum + toAmount(item.price), 0);
    const amountToSplit = Math.max(0, totalAmount - celebrationAmount);
    const reductionFactor = itemTotal > EPSILON ? amountToSplit / itemTotal : amountToSplit === 0 ? 1 : 0;

    expense.items.forEach((item) => {
      const itemPrice = toAmount(item.price);
      if (itemPrice <= EPSILON) return;

      const category = item.categoryName || fallbackCategory;
      let amount = 0;

      if (mode === "group") {
        amount = itemPrice;
      } else if (selectedPersonId && (item.sharedBy || []).includes(selectedPersonId)) {
        const sharedByCount = Math.max(item.sharedBy.length, 1);
        amount = (itemPrice * reductionFactor) / sharedByCount;
      }

      if (amount > EPSILON) {
        allocations.push({
          category,
          amount,
          expenseId: expense.id,
          description: item.name || expense.description,
          date: expenseDate,
        });
      }
    });

    if (
      mode === "personal" &&
      selectedPersonId &&
      expense.celebration_contribution?.personId === selectedPersonId &&
      celebrationAmount > EPSILON
    ) {
      allocations.push({
        category: fallbackCategory,
        amount: celebrationAmount,
        expenseId: expense.id,
        description: `${expense.description} contribution`,
        date: expenseDate,
      });
    }

    return allocations;
  }

  const amount = mode === "group"
    ? totalAmount
    : selectedPersonId
      ? getTotalObligation(expense, selectedPersonId)
      : 0;

  if (amount > EPSILON) {
    allocations.push({
      category: fallbackCategory,
      amount,
      expenseId: expense.id,
      description: expense.description,
      date: expenseDate,
    });
  }

  return allocations;
}

function getPeriodStart(date: Date, granularity: AnalyticsGranularity): Date {
  if (granularity === "monthly") {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return startOfDay(addDays(date, diff));
}

function getPeriodKey(date: Date, granularity: AnalyticsGranularity): string {
  const start = getPeriodStart(date, granularity);
  if (granularity === "monthly") {
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  }
  return dateKey(start);
}

function getPeriodLabel(date: Date, granularity: AnalyticsGranularity): string {
  const start = getPeriodStart(date, granularity);
  return granularity === "monthly" ? formatMonth(start) : `Week of ${formatShortDate(start)}`;
}

function nextPeriod(date: Date, granularity: AnalyticsGranularity): Date {
  return granularity === "monthly" ? addMonths(date, 1) : addDays(date, 7);
}

function buildPeriodSkeleton(
  dates: Date[],
  range: AnalyticsResolvedDateRange,
  granularity: AnalyticsGranularity
): Array<{ key: string; label: string; sortValue: number }> {
  const validDates = dates.filter(Boolean).sort((a, b) => a.getTime() - b.getTime());
  if (validDates.length === 0 && range.isAllTime) return [];

  const start = getPeriodStart(range.isAllTime ? validDates[0] : range.startDate || validDates[0], granularity);
  const end = getPeriodStart(range.isAllTime ? validDates[validDates.length - 1] : range.endDate || validDates[validDates.length - 1], granularity);

  const periods: Array<{ key: string; label: string; sortValue: number }> = [];
  let cursor = start;
  while (cursor <= end) {
    periods.push({
      key: getPeriodKey(cursor, granularity),
      label: getPeriodLabel(cursor, granularity),
      sortValue: cursor.getTime(),
    });
    cursor = nextPeriod(cursor, granularity);
  }

  return periods;
}

function buildSpendingTrend(
  expenses: Expense[],
  mode: AnalyticsMode,
  selectedPersonId: string | null,
  range: AnalyticsResolvedDateRange,
  granularity: AnalyticsGranularity
): AnalyticsChartPoint[] {
  const datedExpenses = expenses
    .map((expense) => ({ expense, date: safeDate(expense.created_at) }))
    .filter((row): row is { expense: Expense; date: Date } => !!row.date);
  const periods = buildPeriodSkeleton(datedExpenses.map((row) => row.date), range, granularity);
  const totals = new Map(periods.map((period) => [period.key, 0]));

  datedExpenses.forEach(({ expense, date }) => {
    const amount = getSpendingAmount(expense, mode, selectedPersonId);
    if (amount <= EPSILON) return;
    const key = getPeriodKey(date, granularity);
    totals.set(key, (totals.get(key) || 0) + amount);
  });

  return periods.map((period) => ({
    ...period,
    value: roundAmount(totals.get(period.key) || 0),
  }));
}

function buildCategoryTrend(
  expenses: Expense[],
  mode: AnalyticsMode,
  selectedPersonId: string | null,
  range: AnalyticsResolvedDateRange,
  granularity: AnalyticsGranularity
) {
  const datedExpenses = expenses
    .map((expense) => ({ expense, date: safeDate(expense.created_at) }))
    .filter((row): row is { expense: Expense; date: Date } => !!row.date);
  const periods = buildPeriodSkeleton(datedExpenses.map((row) => row.date), range, granularity);
  const totalsByCategory = new Map<string, number>();
  const periodRows = new Map<string, Record<string, number | string>>();

  periods.forEach((period) => {
    periodRows.set(period.key, {
      key: period.key,
      label: period.label,
      sortValue: period.sortValue,
    });
  });

  datedExpenses.forEach(({ expense, date }) => {
    const key = getPeriodKey(date, granularity);
    const row = periodRows.get(key);
    if (!row) return;

    getCategoryAllocations(expense, mode, selectedPersonId).forEach((allocation) => {
      row[allocation.category] = toAmount(row[allocation.category] as number) + allocation.amount;
      totalsByCategory.set(allocation.category, (totalsByCategory.get(allocation.category) || 0) + allocation.amount);
    });
  });

  const categories = [...totalsByCategory.entries()]
    .filter(([, amount]) => amount > EPSILON)
    .sort((a, b) => b[1] - a[1] || compareText(a[0], b[0]))
    .slice(0, 5)
    .map(([category]) => category);

  const data = periods.map((period) => {
    const row = periodRows.get(period.key) || {};
    categories.forEach((category) => {
      row[category] = roundAmount(toAmount(row[category] as number));
    });
    return row;
  });

  return { categories, data };
}

function buildDailySeries(
  expenses: Expense[],
  range: AnalyticsResolvedDateRange,
  metric: (expense: Expense) => number,
  label: string
): AnalyticsChartPoint[] {
  const datedExpenses = expenses
    .map((expense) => ({ expense, date: safeDate(expense.created_at) }))
    .filter((row): row is { expense: Expense; date: Date } => !!row.date);
  if (datedExpenses.length === 0 && range.isAllTime) return [];

  const sortedDates = datedExpenses.map((row) => row.date).sort((a, b) => a.getTime() - b.getTime());
  const start = startOfDay(range.isAllTime ? sortedDates[0] : range.startDate || sortedDates[0]);
  const end = startOfDay(range.isAllTime ? sortedDates[sortedDates.length - 1] : range.endDate || sortedDates[sortedDates.length - 1]);
  const totals = new Map<string, number>();

  datedExpenses.forEach(({ expense, date }) => {
    const key = dateKey(date);
    totals.set(key, (totals.get(key) || 0) + metric(expense));
  });

  const data: AnalyticsChartPoint[] = [];
  let cursor = start;
  while (cursor <= end) {
    const key = dateKey(cursor);
    data.push({
      key,
      label: formatShortDate(cursor),
      value: roundAmount(totals.get(key) || 0),
      sortValue: cursor.getTime(),
    });
    cursor = addDays(cursor, 1);
  }

  return data.map((point) => ({ ...point, label: point.value > 0 ? point.label : label === "frequency" ? point.label : point.label }));
}

function buildVelocitySeries(expenses: Expense[], range: AnalyticsResolvedDateRange): AnalyticsChartPoint[] {
  const datedExpenses = expenses
    .map((expense) => ({ date: safeDate(expense.created_at) }))
    .filter((row): row is { date: Date } => !!row.date);
  const periods = buildPeriodSkeleton(datedExpenses.map((row) => row.date), range, "weekly");
  const counts = new Map(periods.map((period) => [period.key, 0]));

  datedExpenses.forEach(({ date }) => {
    const key = getPeriodKey(date, "weekly");
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return periods.map((period) => ({
    ...period,
    value: counts.get(period.key) || 0,
  }));
}

function buildDayOfWeek(
  expenses: Expense[],
  mode: AnalyticsMode,
  selectedPersonId: string | null
): AnalyticsChartPoint[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totals = new Array(7).fill(0) as number[];

  expenses.forEach((expense) => {
    const date = safeDate(expense.created_at);
    if (!date) return;
    const amount = getSpendingAmount(expense, mode, selectedPersonId);
    if (amount <= EPSILON) return;
    totals[date.getDay()] += amount;
  });

  return days.map((day, index) => ({
    key: day,
    label: day,
    value: roundAmount(totals[index]),
    sortValue: index,
  }));
}

function buildSizeDistribution(
  expenses: Expense[],
  mode: AnalyticsMode,
  selectedPersonId: string | null
): AnalyticsChartPoint[] {
  const buckets = [
    { key: "0-100", label: "0-100", min: 0, max: 100 },
    { key: "101-500", label: "101-500", min: 100.01, max: 500 },
    { key: "501-1k", label: "501-1k", min: 500.01, max: 1000 },
    { key: "1k-2.5k", label: "1k-2.5k", min: 1000.01, max: 2500 },
    { key: "2.5k-5k", label: "2.5k-5k", min: 2500.01, max: 5000 },
    { key: "5k+", label: "5k+", min: 5000.01, max: Infinity },
  ].map((bucket, index) => ({ ...bucket, count: 0, sortValue: index }));

  expenses.forEach((expense) => {
    const amount = getSpendingAmount(expense, mode, selectedPersonId);
    if (amount <= EPSILON) return;
    const bucket = buckets.find((candidate) => amount >= candidate.min && amount <= candidate.max);
    if (bucket) bucket.count += 1;
  });

  return buckets
    .filter((bucket) => bucket.count > 0)
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      value: bucket.count,
      sortValue: bucket.sortValue,
    }));
}

function buildSplitMethods(expenses: Expense[]): AnalyticsSplitMethodDatum[] {
  const labels: Record<Expense["split_method"], string> = {
    equal: "Equal",
    unequal: "Unequal",
    itemwise: "Itemwise",
  };
  const counts: Record<Expense["split_method"], number> = {
    equal: 0,
    unequal: 0,
    itemwise: 0,
  };

  expenses.forEach((expense) => {
    counts[expense.split_method] = (counts[expense.split_method] || 0) + 1;
  });

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return (Object.keys(counts) as Array<Expense["split_method"]>)
    .map((method) => ({
      method,
      label: labels[method],
      count: counts[method],
      share: total > 0 ? roundAmount((counts[method] / total) * 100) : 0,
    }))
    .filter((datum) => datum.count > 0);
}

function buildActivityHeatmap(
  expenses: Expense[],
  mode: AnalyticsMode,
  selectedPersonId: string | null
): AnalyticsActivityDay[] {
  const days = new Map<string, AnalyticsActivityDay>();

  expenses.forEach((expense) => {
    const date = safeDate(expense.created_at);
    if (!date) return;

    const amount = getSpendingAmount(expense, mode, selectedPersonId);
    const shouldInclude = mode === "group" || amount > EPSILON || (!!selectedPersonId && isPersonInExpense(expense, selectedPersonId));
    if (!shouldInclude) return;

    const key = dateKey(date);
    const existing = days.get(key) || {
      dateKey: key,
      label: formatShortDate(date),
      sortValue: startOfDay(date).getTime(),
      transactionCount: 0,
      totalAmount: 0,
      transactions: [],
    };

    existing.transactionCount += 1;
    existing.totalAmount += amount;
    existing.transactions.push({
      id: expense.id,
      description: expense.description,
      amount: roundAmount(amount),
      category: expense.category || UNCATEGORIZED,
      excluded: Boolean(expense.exclude_from_settlement),
    });
    days.set(key, existing);
  });

  return [...days.values()]
    .map((day) => ({ ...day, totalAmount: roundAmount(day.totalAmount) }))
    .sort((a, b) => a.sortValue - b.sortValue);
}

function buildDataQualityWarnings(
  people: Person[],
  expenses: Expense[],
  settlementPayments: SettlementPayment[]
): AnalyticsDataQualityWarning[] {
  const knownPeople = new Set(people.map((person) => person.id));
  const warnings: AnalyticsDataQualityWarning[] = [];

  const pushWarning = (warning: Omit<AnalyticsDataQualityWarning, "id" | "severity"> & { severity?: "warning" | "error" }) => {
    warnings.push({
      id: `warning-${warnings.length + 1}`,
      severity: warning.severity || "warning",
      message: warning.message,
      expenseId: warning.expenseId,
      settlementId: warning.settlementId,
    });
  };

  expenses.forEach((expense) => {
    const label = expense.description || "Untitled expense";
    const total = toAmount(expense.total_amount);
    const paidTotal = (expense.paid_by || []).reduce((sum, payment) => sum + toAmount(payment.amount), 0);
    const shareTotal = (expense.shares || []).reduce((sum, share) => sum + toAmount(share.amount), 0);
    const celebrationAmount = toAmount(expense.celebration_contribution?.amount);

    if (!Number.isFinite(Number(expense.total_amount)) || total < 0) {
      pushWarning({ expenseId: expense.id, severity: "error", message: `${label} has an invalid total amount.` });
    }

    if (!safeDate(expense.created_at)) {
      pushWarning({ expenseId: expense.id, message: `${label} has an invalid or missing date.` });
    }

    if (Math.abs(paidTotal - total) > EPSILON) {
      pushWarning({ expenseId: expense.id, message: `${label} has payer totals that do not match the bill.` });
    }

    if (!expense.exclude_from_settlement && Math.abs(shareTotal + celebrationAmount - total) > EPSILON) {
      pushWarning({ expenseId: expense.id, message: `${label} has shares that do not match the bill.` });
    }

    if (expense.split_method === "itemwise" && Array.isArray(expense.items)) {
      const itemTotal = expense.items.reduce((sum, item) => sum + toAmount(item.price), 0);
      if (Math.abs(itemTotal - total) > EPSILON) {
        pushWarning({ expenseId: expense.id, message: `${label} has item totals that do not match the bill.` });
      }
    }

    (expense.paid_by || []).forEach((payment) => {
      if (!knownPeople.has(payment.personId)) {
        pushWarning({ expenseId: expense.id, message: `${label} references an unknown payer.` });
      }
      if (!Number.isFinite(Number(payment.amount)) || toAmount(payment.amount) < 0) {
        pushWarning({ expenseId: expense.id, severity: "error", message: `${label} has an invalid payer amount.` });
      }
    });

    (expense.shares || []).forEach((share) => {
      if (!knownPeople.has(share.personId)) {
        pushWarning({ expenseId: expense.id, message: `${label} references an unknown participant.` });
      }
      if (!Number.isFinite(Number(share.amount)) || toAmount(share.amount) < 0) {
        pushWarning({ expenseId: expense.id, severity: "error", message: `${label} has an invalid share amount.` });
      }
    });

    if (expense.celebration_contribution && !knownPeople.has(expense.celebration_contribution.personId)) {
      pushWarning({ expenseId: expense.id, message: `${label} references an unknown contribution payer.` });
    }

    (expense.items || []).forEach((item) => {
      if (!Number.isFinite(Number(item.price)) || toAmount(item.price) < 0) {
        pushWarning({ expenseId: expense.id, severity: "error", message: `${label} has an invalid item amount.` });
      }
      (item.sharedBy || []).forEach((personId) => {
        if (!knownPeople.has(personId)) {
          pushWarning({ expenseId: expense.id, message: `${label} has an item shared by an unknown participant.` });
        }
      });
    });
  });

  settlementPayments.forEach((payment) => {
    if (!knownPeople.has(payment.debtor_id)) {
      pushWarning({ settlementId: payment.id, message: "A settlement references an unknown payer." });
    }
    if (!knownPeople.has(payment.creditor_id)) {
      pushWarning({ settlementId: payment.id, message: "A settlement references an unknown receiver." });
    }
    if (!safeDate(payment.settled_at)) {
      pushWarning({ settlementId: payment.id, message: "A settlement has an invalid or missing date." });
    }
    if (!Number.isFinite(Number(payment.amount_settled)) || toAmount(payment.amount_settled) < 0) {
      pushWarning({ settlementId: payment.id, severity: "error", message: "A settlement has an invalid amount." });
    }
  });

  return warnings;
}

function buildBalanceTimeline(
  people: Person[],
  expenses: Expense[],
  settlementPayments: SettlementPayment[],
  selectedPersonId: string | null,
  now: Date
): {
  points: AnalyticsBalancePoint[];
  events: AnalyticsLedgerEvent[];
  finalBalance: number;
  expectedBalance: number;
  balanceDelta: number;
} {
  if (!selectedPersonId) {
    return { points: [], events: [], finalBalance: 0, expectedBalance: 0, balanceDelta: 0 };
  }

  const rawEvents = [
    ...expenses.map((expense) => {
      const date = safeDate(expense.created_at) || now;
      return {
        id: `expense:${expense.id}`,
        type: "expense" as const,
        date,
        label: expense.description || "Expense",
        amount: getTotalPaid(expense, selectedPersonId) - getTotalObligation(expense, selectedPersonId),
      };
    }),
    ...settlementPayments.map((payment) => {
      const date = safeDate(payment.settled_at) || now;
      let amount = 0;
      if (payment.debtor_id === selectedPersonId) amount = toAmount(payment.amount_settled);
      if (payment.creditor_id === selectedPersonId) amount = -toAmount(payment.amount_settled);
      return {
        id: `settlement:${payment.id}`,
        type: "settlement" as const,
        date,
        label: "Settlement",
        amount,
      };
    }),
  ]
    .filter((event) => Math.abs(event.amount) > EPSILON)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || compareText(a.id, b.id));

  const baselineDate = rawEvents.length > 0 ? startOfDay(rawEvents[0].date) : startOfDay(now);
  let currentBalance = 0;
  const dayBalances = new Map<string, { date: Date; balance: number }>();
  const events: AnalyticsLedgerEvent[] = [];

  rawEvents.forEach((event) => {
    currentBalance += event.amount;
    const key = dateKey(event.date);
    dayBalances.set(key, { date: startOfDay(event.date), balance: currentBalance });
    events.push({
      id: event.id,
      type: event.type,
      date: event.date,
      dateKey: key,
      label: event.label,
      amount: roundAmount(event.amount),
      balanceAfterEvent: roundAmount(currentBalance),
    });
  });

  const points: AnalyticsBalancePoint[] = [{
    key: `${dateKey(baselineDate)}:baseline`,
    dateKey: dateKey(baselineDate),
    label: "Start",
    balance: 0,
    sortValue: baselineDate.getTime() - 1,
    isBaseline: true,
  }];

  [...dayBalances.entries()]
    .sort(([, a], [, b]) => a.date.getTime() - b.date.getTime())
    .forEach(([key, day]) => {
      points.push({
        key,
        dateKey: key,
        label: formatShortDate(day.date),
        balance: roundAmount(day.balance),
        sortValue: day.date.getTime(),
      });
    });

  const expectedBalance = roundAmount(calculateNetBalances(people, expenses, settlementPayments)[selectedPersonId] || 0);
  const finalBalance = roundAmount(currentBalance);

  return {
    points,
    events,
    finalBalance,
    expectedBalance,
    balanceDelta: roundAmount(finalBalance - expectedBalance),
  };
}

function collectCategoryStats(
  expenses: Expense[],
  mode: AnalyticsMode,
  selectedPersonId: string | null,
  categories: Category[]
) {
  const categoryMap = new Map<string, {
    amount: number;
    expenseIds: Set<string>;
    largestEntry: AnalyticsCategoryRow["largestEntry"];
    payerTotals: Map<string, number>;
  }>();

  const ensureCategory = (name: string) => {
    if (!categoryMap.has(name)) {
      categoryMap.set(name, {
        amount: 0,
        expenseIds: new Set(),
        largestEntry: null,
        payerTotals: new Map(),
      });
    }
    return categoryMap.get(name)!;
  };

  categories.forEach((category) => ensureCategory(category.name));

  expenses.forEach((expense) => {
    const allocations = getCategoryAllocations(expense, mode, selectedPersonId);
    const totalExpenseAmount = toAmount(expense.total_amount);

    allocations.forEach((allocation) => {
      const category = ensureCategory(allocation.category);
      category.amount += allocation.amount;
      category.expenseIds.add(allocation.expenseId);

      if (!category.largestEntry || allocation.amount > category.largestEntry.amount) {
        category.largestEntry = {
          description: allocation.description,
          amount: roundAmount(allocation.amount),
          dateLabel: allocation.date ? formatFullDate(allocation.date) : "Date unavailable",
        };
      }

      if (mode === "personal" && selectedPersonId) {
        const paid = getTotalPaid(expense, selectedPersonId);
        if (paid > EPSILON) {
          category.payerTotals.set(selectedPersonId, (category.payerTotals.get(selectedPersonId) || 0) + Math.min(paid, allocation.amount));
        }
        return;
      }

      (expense.paid_by || []).forEach((payment) => {
        if (totalExpenseAmount <= EPSILON) return;
        const payerAmount = (toAmount(payment.amount) / totalExpenseAmount) * allocation.amount;
        category.payerTotals.set(payment.personId, (category.payerTotals.get(payment.personId) || 0) + payerAmount);
      });
    });
  });

  const total = [...categoryMap.values()].reduce((sum, category) => sum + category.amount, 0);

  return [...categoryMap.entries()]
    .map(([name, stats]) => {
      const topPayerEntry = [...stats.payerTotals.entries()]
        .sort((a, b) => b[1] - a[1] || compareText(a[0], b[0]))[0];

      return {
        name,
        iconName: getCategoryIconName(categories, name),
        totalAmount: roundAmount(stats.amount),
        amount: roundAmount(stats.amount),
        share: total > EPSILON ? roundAmount((stats.amount / total) * 100) : 0,
        expenseCount: stats.expenseIds.size,
        averageAmount: stats.expenseIds.size > 0 ? roundAmount(stats.amount / stats.expenseIds.size) : 0,
        largestEntry: stats.largestEntry,
        topPayer: topPayerEntry && topPayerEntry[1] > EPSILON
          ? { name: topPayerEntry[0], amount: roundAmount(topPayerEntry[1]) }
          : null,
      };
    })
    .filter((category) => category.totalAmount > EPSILON)
    .sort((a, b) => b.totalAmount - a.totalAmount || compareText(a.name, b.name));
}

function buildParticipantRows(
  people: Person[],
  peopleMap: Record<string, string>,
  expenses: Expense[],
  settlementPayments: SettlementPayment[],
  mode: AnalyticsMode,
  selectedPersonId: string | null,
  categories: Category[]
): AnalyticsParticipantRow[] {
  const netBalances = calculateNetBalances(people, expenses, settlementPayments);
  const peopleToAnalyze = mode === "personal" && selectedPersonId
    ? people.filter((person) => person.id === selectedPersonId)
    : people;

  return peopleToAnalyze.map((person) => {
    let paid = 0;
    let obligation = 0;
    let expensesPaidCount = 0;
    let expensesSharedCount = 0;
    const categoryTotals = new Map<string, number>();

    expenses.forEach((expense) => {
      const paidForExpense = getTotalPaid(expense, person.id);
      const obligationForExpense = getTotalObligation(expense, person.id);
      paid += paidForExpense;
      obligation += obligationForExpense;
      if (paidForExpense > EPSILON) expensesPaidCount += 1;
      if (obligationForExpense > EPSILON) expensesSharedCount += 1;

      getCategoryAllocations(expense, "personal", person.id).forEach((allocation) => {
        categoryTotals.set(allocation.category, (categoryTotals.get(allocation.category) || 0) + allocation.amount);
      });
    });

    const settlementsSent = settlementPayments
      .filter((payment) => payment.debtor_id === person.id)
      .reduce((sum, payment) => sum + toAmount(payment.amount_settled), 0);
    const settlementsReceived = settlementPayments
      .filter((payment) => payment.creditor_id === person.id)
      .reduce((sum, payment) => sum + toAmount(payment.amount_settled), 0);
    const topCategory = [...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1] || compareText(a[0], b[0]))[0];

    return {
      personId: person.id,
      name: peopleMap[person.id] || person.name,
      paid: roundAmount(paid),
      obligation: roundAmount(obligation),
      netBeforeSettlements: roundAmount(paid - obligation),
      settlementsSent: roundAmount(settlementsSent),
      settlementsReceived: roundAmount(settlementsReceived),
      netBalance: roundAmount(netBalances[person.id] || 0),
      expensesPaidCount,
      expensesSharedCount,
      averageObligation: expensesSharedCount > 0 ? roundAmount(obligation / expensesSharedCount) : 0,
      topCategory: topCategory ? { name: topCategory[0], amount: roundAmount(topCategory[1]) } : null,
    };
  })
    .filter((row) => mode === "personal" || row.paid > EPSILON || row.obligation > EPSILON || Math.abs(row.netBalance) > EPSILON)
    .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance) || compareText(a.name, b.name));
}

export function buildAnalyticsModel(input: AnalyticsModelInput): AnalyticsModel {
  const now = input.now || new Date();
  const mode = input.mode;
  const selectedPersonId = mode === "personal" ? input.selectedPersonId || input.people[0]?.id || null : null;
  const selectedPersonName = selectedPersonId ? idToName(input.people, input.peopleMap, selectedPersonId) : null;
  const granularity = input.granularity || "monthly";
  const dateRange = resolveDateRange(input.dateRange, now);
  const dataQualityWarnings = buildDataQualityWarnings(input.people, input.expenses, input.settlementPayments);

  const dateFilteredExpenses = input.expenses.filter((expense) => isInDateRange(expense.created_at, dateRange));
  const dateFilteredSettlements = input.settlementPayments.filter((payment) => isInDateRange(payment.settled_at, dateRange));
  const spendingExpenses = dateFilteredExpenses.filter((expense) =>
    mode === "group" || (selectedPersonId ? isPersonInExpense(expense, selectedPersonId) : false)
  );
  const settlementExpenses = dateFilteredExpenses.filter((expense) => !expense.exclude_from_settlement);
  const scopedSettlementExpenses = settlementExpenses.filter((expense) =>
    mode === "group" || (selectedPersonId ? isPersonInExpense(expense, selectedPersonId) : false)
  );
  const excludedExpenseCount = dateFilteredExpenses.filter((expense) => expense.exclude_from_settlement).length;

  const categoryRowsRaw = collectCategoryStats(spendingExpenses, mode, selectedPersonId, input.categories);
  const categoryBreakdown = categoryRowsRaw.map((row) => ({
    name: row.name,
    iconName: row.iconName,
    amount: row.totalAmount,
    share: row.share,
    expenseCount: row.expenseCount,
  }));
  const categoryRows: AnalyticsCategoryRow[] = categoryRowsRaw.map((row) => ({
    name: row.name,
    iconName: row.iconName,
    totalAmount: row.totalAmount,
    expenseCount: row.expenseCount,
    averageAmount: row.averageAmount,
    largestEntry: row.largestEntry,
    topPayer: row.topPayer
      ? { name: idToName(input.people, input.peopleMap, row.topPayer.name), amount: row.topPayer.amount }
      : null,
  }));

  const totalSpend = spendingExpenses.reduce(
    (sum, expense) => sum + getSpendingAmount(expense, mode, selectedPersonId),
    0
  );
  const validSpendingDates = spendingExpenses
    .map((expense) => safeDate(expense.created_at))
    .filter((date): date is Date => !!date)
    .sort((a, b) => a.getTime() - b.getTime());
  const topCategory = categoryBreakdown[0]
    ? { name: categoryBreakdown[0].name, amount: categoryBreakdown[0].amount }
    : null;
  const largestExpense = spendingExpenses
    .map((expense) => ({
      expense,
      amount: getSpendingAmount(expense, mode, selectedPersonId),
      date: safeDate(expense.created_at),
    }))
    .filter((row) => row.amount > EPSILON)
    .sort((a, b) => b.amount - a.amount || compareText(a.expense.description, b.expense.description))[0];
  const netBalances = calculateNetBalances(input.people, settlementExpenses, dateFilteredSettlements);
  const balanceTimeline = buildBalanceTimeline(input.people, settlementExpenses, dateFilteredSettlements, selectedPersonId, now);
  const participantRows = buildParticipantRows(
    input.people,
    input.peopleMap,
    settlementExpenses,
    dateFilteredSettlements,
    mode,
    selectedPersonId,
    input.categories
  );

  const distinctParticipants = new Set<string>();
  spendingExpenses.forEach((expense) => {
    (expense.paid_by || []).forEach((payment) => distinctParticipants.add(payment.personId));
    (expense.shares || []).forEach((share) => distinctParticipants.add(share.personId));
    if (expense.celebration_contribution) distinctParticipants.add(expense.celebration_contribution.personId);
  });

  const totalOutstanding = Object.values(netBalances)
    .filter((balance) => balance > EPSILON)
    .reduce((sum, balance) => sum + balance, 0);

  if (mode === "personal" && selectedPersonId && Math.abs(balanceTimeline.balanceDelta) > EPSILON) {
    dataQualityWarnings.push({
      id: `warning-${dataQualityWarnings.length + 1}`,
      severity: "error",
      message: "Personal balance timeline does not reconcile with settlement balances.",
    });
  }

  const averageByCategory = categoryRows.map((row) => ({
    key: row.name,
    label: row.name,
    value: row.averageAmount,
    sortValue: row.averageAmount,
  }));

  const topExpenses: AnalyticsTopExpenseRow[] = spendingExpenses
    .map((expense) => ({
      id: expense.id,
      description: expense.description,
      amount: roundAmount(getSpendingAmount(expense, mode, selectedPersonId)),
      category: expense.category || UNCATEGORIZED,
      dateLabel: safeDate(expense.created_at) ? formatFullDate(safeDate(expense.created_at)!) : "Date unavailable",
      paidBy: (expense.paid_by || []).map((payment) => idToName(input.people, input.peopleMap, payment.personId)).join(", ") || "Unknown",
      excluded: Boolean(expense.exclude_from_settlement),
    }))
    .filter((row) => row.amount > EPSILON)
    .sort((a, b) => b.amount - a.amount || compareText(a.description, b.description))
    .slice(0, 10);

  const paidVsShare = participantRows.map((row) => ({
    personId: row.personId,
    name: row.name,
    paid: row.paid,
    obligation: row.obligation,
    netBeforeSettlements: row.netBeforeSettlements,
    settlementsSent: row.settlementsSent,
    settlementsReceived: row.settlementsReceived,
    netBalance: row.netBalance,
  }));

  return {
    mode,
    selectedPersonId,
    selectedPersonName,
    granularity,
    dateRange,
    snapshot: {
      totalSpend: roundAmount(totalSpend),
      expenseCount: spendingExpenses.length,
      averageExpense: spendingExpenses.length > 0 ? roundAmount(totalSpend / spendingExpenses.length) : 0,
      participantCount: mode === "personal" && selectedPersonId ? 1 : distinctParticipants.size,
      dateRangeLabel: validSpendingDates.length > 0
        ? `${formatFullDate(validSpendingDates[0])} - ${formatFullDate(validSpendingDates[validSpendingDates.length - 1])}`
        : "No dated expenses",
      topCategory,
      largestExpense: largestExpense
        ? {
            id: largestExpense.expense.id,
            description: largestExpense.expense.description,
            amount: roundAmount(largestExpense.amount),
            dateLabel: largestExpense.date ? formatFullDate(largestExpense.date) : "Date unavailable",
            excluded: Boolean(largestExpense.expense.exclude_from_settlement),
          }
        : null,
      currentNetBalance: mode === "personal" && selectedPersonId ? roundAmount(netBalances[selectedPersonId] || 0) : null,
      totalOutstanding: roundAmount(totalOutstanding),
    },
    trust: {
      spendingExpenseCount: spendingExpenses.length,
      settlementExpenseCount: scopedSettlementExpenses.length,
      excludedExpenseCount,
      settlementPaymentCount: dateFilteredSettlements.length,
      dataQualityWarningCount: dataQualityWarnings.length,
      balanceReconciled: Math.abs(balanceTimeline.balanceDelta) <= EPSILON,
      balanceDelta: balanceTimeline.balanceDelta,
    },
    dataQualityWarnings,
    charts: {
      spendingTrend: buildSpendingTrend(spendingExpenses, mode, selectedPersonId, dateRange, granularity),
      categoryTrend: buildCategoryTrend(spendingExpenses, mode, selectedPersonId, dateRange, granularity),
      dayOfWeek: buildDayOfWeek(spendingExpenses, mode, selectedPersonId),
      categoryBreakdown,
      splitMethods: buildSplitMethods(spendingExpenses),
      expenseSizeDistribution: buildSizeDistribution(spendingExpenses, mode, selectedPersonId),
      averageByCategory,
      activityHeatmap: buildActivityHeatmap(spendingExpenses, mode, selectedPersonId),
      frequency: buildDailySeries(spendingExpenses, dateRange, () => 1, "frequency"),
      velocity: buildVelocitySeries(spendingExpenses, dateRange),
      paidVsShare,
      balanceTimeline: balanceTimeline.points,
    },
    details: {
      topExpenses,
      categoryRows,
      participantRows,
    },
  };
}
