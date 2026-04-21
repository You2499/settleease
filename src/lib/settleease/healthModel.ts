import type {
  HealthDatePreset,
  HealthEstimatedLedgerRow,
  HealthGranularity,
  HealthLedgerResult,
  HealthMode,
} from "./healthTypes";
import type { Person } from "./types";

const EPSILON = 0.01;
const DAY_MS = 24 * 60 * 60 * 1000;

const integerFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

export interface HealthResolvedDateRange {
  preset: HealthDatePreset;
  label: string;
  isAllTime: boolean;
  startDate: Date | null;
  endDate: Date | null;
}

export interface HealthMetricCard {
  label: string;
  value: string;
  detail: string;
}

export interface HealthTrustStripModel {
  coverageLabel: string;
  cacheLabel: string;
  confidenceLabel: string;
  latestUpdateLabel: string;
  disclaimer: string;
  hasFailures: boolean;
  failureMessage: string | null;
}

export interface HealthDetailRow {
  sourceKey: string;
  expenseId: string;
  title: string;
  categoryName: string;
  classification: "food" | "alcohol" | "ignore";
  dateLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  alcoholServings: number;
  alcoholCalories: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
}

export interface HealthCategoryRow {
  name: string;
  calories: number;
  alcoholCalories: number;
  entryCount: number;
}

export interface HealthParticipantRow {
  personId: string;
  name: string;
  calories: number;
  alcoholServings: number;
  entryCount: number;
}

export interface HealthDashboardModel {
  mode: HealthMode;
  selectedPersonId: string | null;
  selectedPersonName: string | null;
  granularity: HealthGranularity;
  dateRange: HealthResolvedDateRange;
  isEmpty: boolean;
  snapshot: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalAlcoholServings: number;
    totalAlcoholCalories: number;
    qualifyingEntryCount: number;
    ignoredEntryCount: number;
    topCategory: { name: string; calories: number } | null;
    topContributor: { name: string; calories: number } | null;
    metricCards: HealthMetricCard[];
  };
  trust: HealthTrustStripModel;
  charts: {
    calorieTrend: Array<{ key: string; label: string; sortValue: number; value: number }>;
    alcoholTrend: Array<{ key: string; label: string; sortValue: number; value: number }>;
    macroTrend: {
      categories: string[];
      data: Array<Record<string, number | string>>;
    };
    classificationBreakdown: Array<{ name: string; amount: number; share: number }>;
    topCategories: Array<Record<string, number | string>>;
    topContributors: Array<Record<string, number | string>>;
  };
  details: {
    rows: HealthDetailRow[];
    categoryRows: HealthCategoryRow[];
    participantRows: HealthParticipantRow[];
  };
}

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

function toDisplayNumber(value: number): string {
  return integerFormatter.format(Math.round(value));
}

export function formatCalories(value: number): string {
  return `${toDisplayNumber(value)} kcal`;
}

export function formatGrams(value: number): string {
  return `${toDisplayNumber(value)} g`;
}

export function formatServings(value: number): string {
  return `${decimalFormatter.format(roundAmount(value))} servings`;
}

function formatConfidenceLabel(counts: Record<string, number>) {
  const parts = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label} ${count}`);

  return parts.length > 0 ? parts.join(" • ") : "No classified entries yet";
}

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(date);
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

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function getPeriodStart(date: Date, granularity: HealthGranularity): Date {
  if (granularity === "monthly") {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return startOfDay(addDays(date, diff));
}

function getPeriodKey(date: Date, granularity: HealthGranularity): string {
  const start = getPeriodStart(date, granularity);
  if (granularity === "monthly") {
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  }

  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

function getPeriodLabel(date: Date, granularity: HealthGranularity): string {
  const start = getPeriodStart(date, granularity);
  if (granularity === "monthly") {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      year: "numeric",
    }).format(start);
  }

  return `Week of ${formatShortDate(start)}`;
}

function nextPeriod(date: Date, granularity: HealthGranularity): Date {
  const next = new Date(date);
  if (granularity === "monthly") {
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  next.setDate(next.getDate() + 7);
  return next;
}

function buildPeriodSkeleton(
  dates: Date[],
  dateRange: HealthResolvedDateRange,
  granularity: HealthGranularity,
) {
  const validDates = dates.filter(Boolean).sort((a, b) => a.getTime() - b.getTime());
  if (validDates.length === 0 && dateRange.isAllTime) return [];

  const start = getPeriodStart(
    dateRange.isAllTime ? validDates[0] : dateRange.startDate || validDates[0],
    granularity,
  );
  const end = getPeriodStart(
    dateRange.isAllTime ? validDates[validDates.length - 1] : dateRange.endDate || validDates[validDates.length - 1],
    granularity,
  );

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

function resolveTopEntry<T extends { calories: number; name: string }>(rows: T[]): T | null {
  if (!rows.length) return null;
  return rows
    .slice()
    .sort((a, b) => b.calories - a.calories || compareText(a.name, b.name))[0];
}

export function resolveHealthDateRange({
  preset,
  now = new Date(),
}: {
  preset: HealthDatePreset;
  now?: Date;
}): HealthResolvedDateRange {
  if (preset === "all") {
    return {
      preset,
      label: "All time",
      isAllTime: true,
      startDate: null,
      endDate: null,
    };
  }

  const endDate = endOfDay(now);
  const daysBackByPreset: Record<Exclude<HealthDatePreset, "all">, number> = {
    "30d": 29,
    "90d": 89,
    "1y": 364,
  };
  const startDate = startOfDay(addDays(endDate, -daysBackByPreset[preset]));

  const labelByPreset: Record<Exclude<HealthDatePreset, "all">, string> = {
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "1y": "Last year",
  };

  return {
    preset,
    label: labelByPreset[preset],
    isAllTime: false,
    startDate,
    endDate,
  };
}

function allocateRowForPerson(row: HealthEstimatedLedgerRow, selectedPersonId: string | null) {
  if (!selectedPersonId) return null;
  const factor = row.allocationShares.find((share) => share.personId === selectedPersonId)?.ratio || 0;
  if (factor <= EPSILON) return null;
  return {
    ...row,
    estimatedCalories: roundAmount(row.estimatedCalories * factor),
    estimatedProteinGrams: roundAmount(row.estimatedProteinGrams * factor),
    estimatedCarbGrams: roundAmount(row.estimatedCarbGrams * factor),
    estimatedFatGrams: roundAmount(row.estimatedFatGrams * factor),
    estimatedAlcoholServings: roundAmount(row.estimatedAlcoholServings * factor),
    estimatedAlcoholCalories: roundAmount(row.estimatedAlcoholCalories * factor),
  };
}

export function buildHealthModel({
  result,
  people,
  peopleMap,
  mode,
  selectedPersonId,
  granularity,
  dateRange,
}: {
  result: HealthLedgerResult | null;
  people: Person[];
  peopleMap: Record<string, string>;
  mode: HealthMode;
  selectedPersonId: string | null;
  granularity: HealthGranularity;
  dateRange: HealthResolvedDateRange;
}): HealthDashboardModel {
  const resolvedSelectedPersonId = mode === "personal"
    ? selectedPersonId || people[0]?.id || null
    : null;
  const selectedPersonName = resolvedSelectedPersonId
    ? peopleMap[resolvedSelectedPersonId] || people.find((person) => person.id === resolvedSelectedPersonId)?.name || null
    : null;

  const scopedRows = (result?.rows || [])
    .map((row) => (mode === "personal" ? allocateRowForPerson(row, resolvedSelectedPersonId) : row))
    .filter((row): row is HealthEstimatedLedgerRow => Boolean(row));

  const detailRows: HealthDetailRow[] = scopedRows
    .map((row) => ({
      sourceKey: row.sourceKey,
      expenseId: row.expenseId,
      title: row.title,
      categoryName: row.categoryName,
      classification: row.classification,
      dateLabel: safeDate(row.date) ? formatFullDate(new Date(row.date)) : "Unknown date",
      calories: row.estimatedCalories,
      protein: row.estimatedProteinGrams,
      carbs: row.estimatedCarbGrams,
      fat: row.estimatedFatGrams,
      alcoholServings: row.estimatedAlcoholServings,
      alcoholCalories: row.estimatedAlcoholCalories,
      confidence: row.confidence,
      rationale: row.rationale,
    }))
    .sort((a, b) => b.calories - a.calories || compareText(a.title, b.title));

  const qualifyingRows = detailRows.filter((row) =>
    row.classification !== "ignore" &&
    (
      row.calories > EPSILON ||
      row.protein > EPSILON ||
      row.carbs > EPSILON ||
      row.fat > EPSILON ||
      row.alcoholServings > EPSILON ||
      row.alcoholCalories > EPSILON
    ),
  );

  const totalCalories = qualifyingRows.reduce((sum, row) => sum + row.calories, 0);
  const totalProtein = qualifyingRows.reduce((sum, row) => sum + row.protein, 0);
  const totalCarbs = qualifyingRows.reduce((sum, row) => sum + row.carbs, 0);
  const totalFat = qualifyingRows.reduce((sum, row) => sum + row.fat, 0);
  const totalAlcoholServings = qualifyingRows.reduce((sum, row) => sum + row.alcoholServings, 0);
  const totalAlcoholCalories = qualifyingRows.reduce((sum, row) => sum + row.alcoholCalories, 0);

  const categoryMap = new Map<string, HealthCategoryRow>();
  qualifyingRows.forEach((row) => {
    const existing = categoryMap.get(row.categoryName) || {
      name: row.categoryName,
      calories: 0,
      alcoholCalories: 0,
      entryCount: 0,
    };
    existing.calories += row.calories;
    existing.alcoholCalories += row.alcoholCalories;
    existing.entryCount += 1;
    categoryMap.set(row.categoryName, existing);
  });
  const categoryRows = [...categoryMap.values()]
    .map((row) => ({
      ...row,
      calories: roundAmount(row.calories),
      alcoholCalories: roundAmount(row.alcoholCalories),
    }))
    .sort((a, b) => b.calories - a.calories || compareText(a.name, b.name));

  const contributorMap = new Map<string, { name: string; calories: number }>();
  qualifyingRows.forEach((row) => {
    const existing = contributorMap.get(row.title) || { name: row.title, calories: 0 };
    existing.calories += row.calories;
    contributorMap.set(row.title, existing);
  });
  const topContributor = resolveTopEntry([...contributorMap.values()]);
  const topCategory = resolveTopEntry(categoryRows.map((row) => ({ name: row.name, calories: row.calories })));

  const participantRows = people
    .map((person) => {
      const allocated = (result?.rows || [])
        .map((row) => allocateRowForPerson(row, person.id))
        .filter((row): row is HealthEstimatedLedgerRow => Boolean(row))
        .filter((row) => row.classification !== "ignore");

      return {
        personId: person.id,
        name: peopleMap[person.id] || person.name,
        calories: roundAmount(allocated.reduce((sum, row) => sum + row.estimatedCalories, 0)),
        alcoholServings: roundAmount(allocated.reduce((sum, row) => sum + row.estimatedAlcoholServings, 0)),
        entryCount: allocated.length,
      };
    })
    .filter((row) => row.entryCount > 0 || mode === "personal")
    .sort((a, b) => b.calories - a.calories || compareText(a.name, b.name));

  const confidenceCounts = qualifyingRows.reduce<Record<string, number>>((counts, row) => {
    counts[row.confidence] = (counts[row.confidence] || 0) + 1;
    return counts;
  }, { high: 0, medium: 0, low: 0 });

  const latestUpdate = scopedRows.reduce<Date | null>((latest, row) => {
    const updatedAt = safeDate(row.updatedAt || null);
    if (!updatedAt) return latest;
    return !latest || updatedAt > latest ? updatedAt : latest;
  }, null);

  const dates = qualifyingRows
    .map((row) => safeDate((result?.rows || []).find((entry) => entry.sourceKey === row.sourceKey)?.date || null))
    .filter((date): date is Date => Boolean(date));
  const periods = buildPeriodSkeleton(dates, dateRange, granularity);
  const periodTotals = new Map(periods.map((period) => [period.key, {
    calories: 0,
    alcoholCalories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  }]));

  scopedRows.forEach((row) => {
    if (row.classification === "ignore") return;
    const rowDate = safeDate(row.date);
    if (!rowDate) return;
    const periodKey = getPeriodKey(rowDate, granularity);
    const totals = periodTotals.get(periodKey);
    if (!totals) return;
    totals.calories += row.estimatedCalories;
    totals.alcoholCalories += row.estimatedAlcoholCalories;
    totals.protein += row.estimatedProteinGrams;
    totals.carbs += row.estimatedCarbGrams;
    totals.fat += row.estimatedFatGrams;
  });

  const calorieTrend = periods.map((period) => ({
    ...period,
    value: roundAmount(periodTotals.get(period.key)?.calories || 0),
  }));

  const alcoholTrend = periods.map((period) => ({
    ...period,
    value: roundAmount(periodTotals.get(period.key)?.alcoholCalories || 0),
  }));

  const macroTrend = {
    categories: ["Protein", "Carbs", "Fat"],
    data: periods.map((period) => ({
      key: period.key,
      label: period.label,
      sortValue: period.sortValue,
      Protein: roundAmount(periodTotals.get(period.key)?.protein || 0),
      Carbs: roundAmount(periodTotals.get(period.key)?.carbs || 0),
      Fat: roundAmount(periodTotals.get(period.key)?.fat || 0),
    })),
  };

  const foodCalories = qualifyingRows
    .filter((row) => row.classification === "food")
    .reduce((sum, row) => sum + row.calories, 0);
  const alcoholCalories = qualifyingRows
    .filter((row) => row.classification === "alcohol")
    .reduce((sum, row) => sum + row.calories, 0);
  const splitTotal = foodCalories + alcoholCalories;
  const classificationBreakdown = [
    { name: "Food", amount: roundAmount(foodCalories) },
    { name: "Alcohol", amount: roundAmount(alcoholCalories) },
  ]
    .filter((row) => row.amount > EPSILON)
    .map((row) => ({
      ...row,
      share: splitTotal > EPSILON ? Number(((row.amount / splitTotal) * 100).toFixed(1)) : 0,
    }));

  const topCategories = categoryRows.slice(0, 6).map((row) => ({
    key: row.name,
    label: row.name,
    calories: row.calories,
  }));

  const topContributors = [...contributorMap.values()]
    .sort((a, b) => b.calories - a.calories || compareText(a.name, b.name))
    .slice(0, 6)
    .map((row) => ({
      key: row.name,
      label: row.name,
      calories: roundAmount(row.calories),
    }));

  const metricCards: HealthMetricCard[] = [
    {
      label: "Estimated Calories",
      value: formatCalories(totalCalories),
      detail: `${qualifyingRows.length} classified entries`,
    },
    {
      label: "Protein",
      value: formatGrams(totalProtein),
      detail: "AI-estimated grams",
    },
    {
      label: "Carbs",
      value: formatGrams(totalCarbs),
      detail: "AI-estimated grams",
    },
    {
      label: "Fat",
      value: formatGrams(totalFat),
      detail: "AI-estimated grams",
    },
    {
      label: "Alcohol Servings",
      value: formatServings(totalAlcoholServings),
      detail: "Standard-drink estimate",
    },
    {
      label: "Alcohol Calories",
      value: formatCalories(totalAlcoholCalories),
      detail: "Calories attributable to alcohol",
    },
  ];

  const failureMessages = (result?.chunkStatuses || [])
    .filter((status) => status.source === "failed" && status.error)
    .map((status) => status.error as string);

  return {
    mode,
    selectedPersonId: resolvedSelectedPersonId,
    selectedPersonName,
    granularity,
    dateRange,
    isEmpty: qualifyingRows.length === 0,
    snapshot: {
      totalCalories: roundAmount(totalCalories),
      totalProtein: roundAmount(totalProtein),
      totalCarbs: roundAmount(totalCarbs),
      totalFat: roundAmount(totalFat),
      totalAlcoholServings: roundAmount(totalAlcoholServings),
      totalAlcoholCalories: roundAmount(totalAlcoholCalories),
      qualifyingEntryCount: qualifyingRows.length,
      ignoredEntryCount: Math.max(0, result?.dataStats.ignoredRowCount || 0),
      topCategory,
      topContributor,
      metricCards,
    },
    trust: {
      coverageLabel: result
        ? `${result.coverage.coveredChunkCount}/${result.coverage.requestedChunkCount} month chunks covered (${result.coverage.coveragePercent}%)`
        : "No health coverage yet",
      cacheLabel: result
        ? `${result.coverage.cacheHitCount} cached • ${result.coverage.generatedCount} generated`
        : "No cache activity yet",
      confidenceLabel: formatConfidenceLabel(confidenceCounts),
      latestUpdateLabel: latestUpdate ? `Updated ${formatFullDate(latestUpdate)}` : "No generated estimate yet",
      disclaimer: result?.disclaimer || "Health values are estimates only.",
      hasFailures: failureMessages.length > 0,
      failureMessage: failureMessages[0] || null,
    },
    charts: {
      calorieTrend,
      alcoholTrend,
      macroTrend,
      classificationBreakdown,
      topCategories,
      topContributors,
    },
    details: {
      rows: qualifyingRows,
      categoryRows,
      participantRows,
    },
  };
}
