import type { Person } from "./types";
import type {
  HealthBreakdownSlice,
  HealthDatePreset,
  HealthDetailRow,
  HealthEstimatedLedgerRow,
  HealthGranularity,
  HealthMode,
  HealthParticipantSnapshotRow,
  HealthRankedValueRow,
  HealthSurfaceCoverage,
  HealthSurfaceId,
  HealthSurfacePayloadMap,
  HealthSurfaceState,
  HealthTrendPayload,
} from "./healthTypes";

const EPSILON = 0.01;
const MACRO_CATEGORIES = ["Protein", "Carbs", "Fat"];

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

interface HealthDataset {
  selectedPersonName: string | null;
  granularity: HealthGranularity;
  qualifyingRows: HealthDetailRow[];
  visibleLedgerRows: HealthDetailRow[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalAlcoholServings: number;
  totalAlcoholCalories: number;
  activeDayCount: number;
  averageCaloriesPerActiveDay: number;
  categoryRows: Array<{ name: string; calories: number; alcoholCalories: number; entryCount: number }>;
  contributorRows: Array<{ name: string; calories: number; entryCount: number }>;
  participantRows: HealthParticipantSnapshotRow[];
  classificationBreakdown: HealthBreakdownSlice[];
  calorieTrend: HealthTrendPayload["data"];
  alcoholTrend: HealthTrendPayload["data"];
  macroTrend: Array<Record<string, number | string>>;
  confidenceCounts: Record<"high" | "medium" | "low", number>;
  latestUpdate: Date | null;
  ignoredEntryCount: number;
  topCategoryName: string | null;
  topAlcoholSourceName: string | null;
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

function formatPercent(value: number): string {
  return `${decimalFormatter.format(roundAmount(value))}%`;
}

function formatConfidenceLabel(counts: Record<"high" | "medium" | "low", number>) {
  const parts = (["high", "medium", "low"] as const)
    .filter((label) => counts[label] > 0)
    .map((label) => `${label} ${counts[label]}`);

  return parts.length > 0 ? parts.join(" • ") : "No classified entries yet";
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
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

function formatMonthLabel(chunkKey: string | null | undefined): string | null {
  if (!chunkKey || !/^\d{4}-\d{2}$/.test(chunkKey)) return null;
  const [yearText, monthText] = chunkKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const date = new Date(year, month, 1);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
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
  if (validDates.length === 0) return [];

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

function createDetailRow(row: HealthEstimatedLedgerRow): HealthDetailRow {
  return {
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
  };
}

function buildHealthDataset({
  rows,
  people,
  peopleMap,
  mode,
  selectedPersonId,
  granularity,
  dateRange,
  ignoredEntryCount = 0,
}: {
  rows: HealthEstimatedLedgerRow[];
  people: Person[];
  peopleMap: Record<string, string>;
  mode: HealthMode;
  selectedPersonId: string | null;
  granularity: HealthGranularity;
  dateRange: HealthResolvedDateRange;
  ignoredEntryCount?: number;
}): HealthDataset {
  const resolvedSelectedPersonId = mode === "personal"
    ? selectedPersonId || people[0]?.id || null
    : null;
  const selectedPersonName = resolvedSelectedPersonId
    ? peopleMap[resolvedSelectedPersonId] || people.find((person) => person.id === resolvedSelectedPersonId)?.name || null
    : null;

  const scopedRows = rows
    .map((row) => (mode === "personal" ? allocateRowForPerson(row, resolvedSelectedPersonId) : row))
    .filter((row): row is HealthEstimatedLedgerRow => Boolean(row));

  const rowDateByKey = new Map(scopedRows.map((row) => [row.sourceKey, row.date] as const));

  const detailRows = scopedRows
    .map(createDetailRow)
    .filter((row) =>
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

  const visibleLedgerRows = detailRows
    .slice()
    .sort((a, b) => {
      const dateComparison = (safeDate(rowDateByKey.get(b.sourceKey) || null)?.getTime() || 0)
        - (safeDate(rowDateByKey.get(a.sourceKey) || null)?.getTime() || 0);
      if (dateComparison !== 0) return dateComparison;
      return compareText(a.title, b.title);
    });

  const totalCalories = detailRows.reduce((sum, row) => sum + row.calories, 0);
  const totalProtein = detailRows.reduce((sum, row) => sum + row.protein, 0);
  const totalCarbs = detailRows.reduce((sum, row) => sum + row.carbs, 0);
  const totalFat = detailRows.reduce((sum, row) => sum + row.fat, 0);
  const totalAlcoholServings = detailRows.reduce((sum, row) => sum + row.alcoholServings, 0);
  const totalAlcoholCalories = detailRows.reduce((sum, row) => sum + row.alcoholCalories, 0);

  const uniqueDays = new Set(
    scopedRows
      .filter((row) => row.classification !== "ignore")
      .map((row) => row.date.slice(0, 10)),
  );
  const activeDayCount = uniqueDays.size;
  const averageCaloriesPerActiveDay = activeDayCount > 0 ? totalCalories / activeDayCount : 0;

  const categoryMap = new Map<string, { name: string; calories: number; alcoholCalories: number; entryCount: number }>();
  detailRows.forEach((row) => {
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

  const contributorMap = new Map<string, { name: string; calories: number; entryCount: number }>();
  detailRows.forEach((row) => {
    const existing = contributorMap.get(row.title) || {
      name: row.title,
      calories: 0,
      entryCount: 0,
    };
    existing.calories += row.calories;
    existing.entryCount += 1;
    contributorMap.set(row.title, existing);
  });
  const contributorRows = [...contributorMap.values()]
    .map((row) => ({
      ...row,
      calories: roundAmount(row.calories),
    }))
    .sort((a, b) => b.calories - a.calories || compareText(a.name, b.name));

  const participantRows = people
    .map((person) => {
      const allocated = rows
        .map((row) => allocateRowForPerson(row, person.id))
        .filter((row): row is HealthEstimatedLedgerRow => Boolean(row))
        .filter((row) => row.classification !== "ignore");

      const calories = roundAmount(allocated.reduce((sum, row) => sum + row.estimatedCalories, 0));
      return {
        personId: person.id,
        name: peopleMap[person.id] || person.name,
        calories,
        alcoholServings: roundAmount(allocated.reduce((sum, row) => sum + row.estimatedAlcoholServings, 0)),
        entryCount: allocated.length,
        shareOfCalories: totalCalories > EPSILON ? Number(((calories / totalCalories) * 100).toFixed(1)) : 0,
      };
    })
    .filter((row) => row.entryCount > 0)
    .sort((a, b) => b.calories - a.calories || compareText(a.name, b.name));

  const confidenceCounts = detailRows.reduce<Record<"high" | "medium" | "low", number>>((counts, row) => {
    counts[row.confidence] += 1;
    return counts;
  }, { high: 0, medium: 0, low: 0 });

  const latestUpdate = scopedRows.reduce<Date | null>((latest, row) => {
    const updatedAt = safeDate(row.updatedAt || null);
    if (!updatedAt) return latest;
    return !latest || updatedAt > latest ? updatedAt : latest;
  }, null);

  const dates = detailRows
    .map((row) => {
      const source = scopedRows.find((entry) => entry.sourceKey === row.sourceKey);
      return safeDate(source?.date || null);
    })
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

  const macroTrend = periods.map((period) => ({
    key: period.key,
    label: period.label,
    sortValue: period.sortValue,
    Protein: roundAmount(periodTotals.get(period.key)?.protein || 0),
    Carbs: roundAmount(periodTotals.get(period.key)?.carbs || 0),
    Fat: roundAmount(periodTotals.get(period.key)?.fat || 0),
  }));

  const foodCalories = detailRows
    .filter((row) => row.classification === "food")
    .reduce((sum, row) => sum + row.calories, 0);
  const alcoholCaloriesFromSplit = detailRows
    .filter((row) => row.classification === "alcohol")
    .reduce((sum, row) => sum + row.calories, 0);
  const splitTotal = foodCalories + alcoholCaloriesFromSplit;
  const classificationBreakdown = [
    { name: "Food", amount: roundAmount(foodCalories), description: "Meals and food-like entries" },
    { name: "Alcohol", amount: roundAmount(alcoholCaloriesFromSplit), description: "Drink-led entries" },
  ]
    .filter((row) => row.amount > EPSILON)
    .map((row) => ({
      ...row,
      share: splitTotal > EPSILON ? Number(((row.amount / splitTotal) * 100).toFixed(1)) : 0,
    }));

  const topCategoryName = resolveTopEntry(categoryRows)?.name || null;
  const topAlcoholSourceName = detailRows
    .filter((row) => row.classification === "alcohol")
    .sort((a, b) => b.alcoholCalories - a.alcoholCalories || compareText(a.title, b.title))[0]?.title || null;

  return {
    selectedPersonName,
    granularity,
    qualifyingRows: detailRows,
    visibleLedgerRows,
    totalCalories: roundAmount(totalCalories),
    totalProtein: roundAmount(totalProtein),
    totalCarbs: roundAmount(totalCarbs),
    totalFat: roundAmount(totalFat),
    totalAlcoholServings: roundAmount(totalAlcoholServings),
    totalAlcoholCalories: roundAmount(totalAlcoholCalories),
    activeDayCount,
    averageCaloriesPerActiveDay: roundAmount(averageCaloriesPerActiveDay),
    categoryRows,
    contributorRows,
    participantRows,
    classificationBreakdown,
    calorieTrend,
    alcoholTrend,
    macroTrend,
    confidenceCounts,
    latestUpdate,
    ignoredEntryCount,
    topCategoryName,
    topAlcoholSourceName,
  };
}

function buildCoverageLabel(coverage: HealthSurfaceCoverage) {
  return `${coverage.readyChunkCount}/${coverage.requestedChunkCount} month chunks ready (${coverage.coveragePercent}%)`;
}

function resolveFailureMessage(coverage: HealthSurfaceCoverage, fallbackError: string | null) {
  if (fallbackError) return fallbackError;
  if (coverage.failedChunkCount <= 0) return null;
  return `${coverage.failedChunkCount} month chunk${coverage.failedChunkCount === 1 ? "" : "s"} could not be estimated yet.`;
}

function buildTrendSummary({
  label,
  data,
  formatter,
}: {
  label: string;
  data: Array<{ label: string; value: number }>;
  formatter: (value: number) => string;
}) {
  const peak = data
    .slice()
    .sort((a, b) => b.value - a.value || compareText(a.label, b.label))[0];

  if (!peak || peak.value <= EPSILON) {
    return {
      summary: `No meaningful ${label.toLowerCase()} estimate landed in this range yet.`,
      peakLabel: null,
      total: 0,
    };
  }

  const total = data.reduce((sum, point) => sum + point.value, 0);
  return {
    summary: `${peak.label} was the busiest stretch at ${formatter(peak.value)}.`,
    peakLabel: peak.label,
    total: roundAmount(total),
  };
}

function buildSurfacePayload<TSurfaceId extends HealthSurfaceId>({
  surfaceId,
  dataset,
  coverage,
  disclaimer,
}: {
  surfaceId: TSurfaceId;
  dataset: HealthDataset;
  coverage: HealthSurfaceCoverage;
  disclaimer: string;
}): HealthSurfacePayloadMap[TSurfaceId] {
  switch (surfaceId) {
    case "overviewCalories": {
      const note = dataset.qualifyingRows.length > 0
        ? `${dataset.activeDayCount} active day${dataset.activeDayCount === 1 ? "" : "s"} • ${formatCalories(dataset.averageCaloriesPerActiveDay)} on a typical active day`
        : "Health estimates appear once cached month chunks are ready.";

      return {
        totalCalories: dataset.totalCalories,
        entryCount: dataset.qualifyingRows.length,
        averagePerActiveDay: dataset.averageCaloriesPerActiveDay,
        activeDayCount: dataset.activeDayCount,
        topCategoryName: dataset.topCategoryName,
        note,
      } as HealthSurfacePayloadMap[TSurfaceId];
    }

    case "overviewMacros": {
      const macroPairs = [
        { label: "Protein", value: dataset.totalProtein },
        { label: "Carbs", value: dataset.totalCarbs },
        { label: "Fat", value: dataset.totalFat },
      ];
      const leadingMacro = macroPairs
        .slice()
        .sort((a, b) => b.value - a.value || compareText(a.label, b.label))[0];
      const totalMacroGrams = roundAmount(dataset.totalProtein + dataset.totalCarbs + dataset.totalFat);

      return {
        protein: dataset.totalProtein,
        carbs: dataset.totalCarbs,
        fat: dataset.totalFat,
        totalMacroGrams,
        leadingMacroLabel: leadingMacro?.value > EPSILON ? leadingMacro.label : null,
        note: leadingMacro?.value > EPSILON
          ? `${leadingMacro.label} carried the largest share of estimated macros.`
          : "No macro-heavy entries have been estimated yet.",
      } as HealthSurfacePayloadMap[TSurfaceId];
    }

    case "overviewAlcohol": {
      const shareOfCalories = dataset.totalCalories > EPSILON
        ? Number(((dataset.totalAlcoholCalories / dataset.totalCalories) * 100).toFixed(1))
        : 0;

      return {
        servings: dataset.totalAlcoholServings,
        calories: dataset.totalAlcoholCalories,
        shareOfCalories,
        topAlcoholSourceName: dataset.topAlcoholSourceName,
        note: dataset.totalAlcoholCalories > EPSILON
          ? `${formatPercent(shareOfCalories)} of estimated calories came from alcohol.`
          : "No alcohol-signaled entries were estimated in this range.",
      } as HealthSurfacePayloadMap[TSurfaceId];
    }

    case "trustAndCoverage": {
      const failureMessage = resolveFailureMessage(coverage, null);
      return {
        coverageLabel: buildCoverageLabel(coverage),
        cacheLabel: `${coverage.readyChunkCount} ready • ${coverage.generatingChunkCount} generating • ${coverage.missingChunkCount} missing`,
        confidenceLabel: formatConfidenceLabel(dataset.confidenceCounts),
        latestUpdateLabel: dataset.latestUpdate ? `Updated ${formatFullDate(dataset.latestUpdate)}` : "No generated estimate yet",
        disclaimer,
        ignoredRowCount: dataset.ignoredEntryCount,
        failureMessage,
      } as HealthSurfacePayloadMap[TSurfaceId];
    }

    case "calorieRhythm": {
      const trend = buildTrendSummary({
        label: "calorie rhythm",
        data: dataset.calorieTrend,
        formatter: formatCalories,
      });
      return {
        granularity: dataset.granularity,
        summary: trend.summary,
        total: trend.total,
        peakLabel: trend.peakLabel,
        data: dataset.calorieTrend,
      } as HealthSurfacePayloadMap[TSurfaceId];
    }

    case "macroRhythm": {
      const leadMacro = [
        { label: "Protein", value: dataset.totalProtein },
        { label: "Carbs", value: dataset.totalCarbs },
        { label: "Fat", value: dataset.totalFat },
      ]
        .sort((a, b) => b.value - a.value || compareText(a.label, b.label))[0];

      return {
        granularity: dataset.granularity,
        summary: leadMacro?.value > EPSILON
          ? `${leadMacro.label} led the macro mix across the selected window.`
          : "Macro estimates will appear once enough entries are classified.",
        categories: MACRO_CATEGORIES,
        data: dataset.macroTrend,
        totalProtein: dataset.totalProtein,
        totalCarbs: dataset.totalCarbs,
        totalFat: dataset.totalFat,
      } as HealthSurfacePayloadMap[TSurfaceId];
    }

    case "alcoholRhythm": {
      const trend = buildTrendSummary({
        label: "alcohol rhythm",
        data: dataset.alcoholTrend,
        formatter: formatCalories,
      });
      return {
        granularity: dataset.granularity,
        summary: trend.summary,
        total: trend.total,
        peakLabel: trend.peakLabel,
        data: dataset.alcoholTrend,
      } as HealthSurfacePayloadMap[TSurfaceId];
    }

    case "sourceSplit": {
      const food = dataset.classificationBreakdown.find((row) => row.name === "Food")?.amount || 0;
      const alcohol = dataset.classificationBreakdown.find((row) => row.name === "Alcohol")?.amount || 0;
      const narrative = dataset.classificationBreakdown.length === 0
        ? "No food or alcohol classification has landed yet."
        : food >= alcohol
          ? "Most estimated intake came from food-oriented entries."
          : "Alcohol-oriented entries drove more of this window than food.";

      return {
        totalFoodCalories: roundAmount(food),
        totalAlcoholCalories: roundAmount(alcohol),
        breakdown: dataset.classificationBreakdown,
        narrative,
      } as HealthSurfacePayloadMap[TSurfaceId];
    }

    case "topCategories": {
      const rows = dataset.categoryRows.slice(0, 6).map<HealthRankedValueRow>((row) => ({
        key: row.name,
        label: row.name,
        calories: row.calories,
        share: dataset.totalCalories > EPSILON ? Number(((row.calories / dataset.totalCalories) * 100).toFixed(1)) : 0,
        subtitle: `${row.entryCount} estimated entr${row.entryCount === 1 ? "y" : "ies"}`,
        entryCount: row.entryCount,
      }));

      return {
        rows,
        summary: rows[0]
          ? `${rows[0].label} carried the heaviest calorie load in this range.`
          : "No categories have been classified yet.",
      } as HealthSurfacePayloadMap[TSurfaceId];
    }

    case "topContributors": {
      const rows = dataset.contributorRows.slice(0, 6).map<HealthRankedValueRow>((row) => ({
        key: row.name,
        label: row.name,
        calories: row.calories,
        share: dataset.totalCalories > EPSILON ? Number(((row.calories / dataset.totalCalories) * 100).toFixed(1)) : 0,
        subtitle: `${row.entryCount} matching entr${row.entryCount === 1 ? "y" : "ies"}`,
        entryCount: row.entryCount,
      }));

      return {
        rows,
        summary: rows[0]
          ? `${rows[0].label} was the strongest single contributor.`
          : "No contributors stand out yet.",
      } as HealthSurfacePayloadMap[TSurfaceId];
    }

    case "participantLens": {
      return {
        rows: dataset.participantRows,
        summary: dataset.participantRows[0]
          ? `${dataset.participantRows[0].name} accounted for the largest share of estimated intake.`
          : "Participant splits appear once shared consumption is inferred.",
      } as HealthSurfacePayloadMap[TSurfaceId];
    }

    case "ledgerList": {
      return {
        rows: dataset.visibleLedgerRows.slice(0, 12),
        totalCount: dataset.visibleLedgerRows.length,
        summary: dataset.selectedPersonName
          ? `A journal of AI-estimated intake for ${dataset.selectedPersonName}.`
          : "A journal of the AI-estimated entries behind these numbers.",
      } as HealthSurfacePayloadMap[TSurfaceId];
    }
  }
}

export function buildHealthSurfaceState<TSurfaceId extends HealthSurfaceId>({
  surfaceId,
  rows,
  people,
  peopleMap,
  mode,
  selectedPersonId,
  granularity,
  dateRange,
  coverage,
  requestedRange,
  disclaimer,
  ignoredEntryCount = 0,
  error = null,
}: {
  surfaceId: TSurfaceId;
  rows: HealthEstimatedLedgerRow[];
  people: Person[];
  peopleMap: Record<string, string>;
  mode: HealthMode;
  selectedPersonId: string | null;
  granularity: HealthGranularity;
  dateRange: HealthResolvedDateRange;
  coverage: HealthSurfaceCoverage;
  requestedRange: {
    startDate: string | null;
    endDate: string | null;
  };
  disclaimer: string;
  ignoredEntryCount?: number;
  error?: string | null;
}): HealthSurfaceState<HealthSurfacePayloadMap[TSurfaceId]> {
  const dataset = buildHealthDataset({
    rows,
    people,
    peopleMap,
    mode,
    selectedPersonId,
    granularity,
    dateRange,
    ignoredEntryCount,
  });

  const hasReadyRows = coverage.readyChunkCount > 0;
  let status: HealthSurfaceState["status"];
  if (coverage.candidateRowCount === 0) {
    status = "empty";
  } else if (
    coverage.readyChunkCount === coverage.requestedChunkCount &&
    coverage.failedChunkCount === 0 &&
    coverage.generatingChunkCount === 0 &&
    coverage.missingChunkCount === 0
  ) {
    status = "cached";
  } else if (hasReadyRows) {
    status = "partial";
  } else if (coverage.failedChunkCount > 0) {
    status = "failed";
  } else {
    status = "generating";
  }

  const payload = (status === "failed" || status === "generating" || status === "empty") && !hasReadyRows
    ? null
    : buildSurfacePayload({
      surfaceId,
      dataset,
      coverage,
      disclaimer,
    });

  return {
    surfaceId,
    status,
    coverage,
    updatedAt: dataset.latestUpdate ? dataset.latestUpdate.toISOString() : null,
    isRefreshing: status === "partial" || coverage.generatingChunkCount > 0 || coverage.missingChunkCount > 0,
    payload,
    disclaimer,
    error: resolveFailureMessage(coverage, error),
    requestedRange,
  };
}

export function buildInitialHealthCoverage(): HealthSurfaceCoverage {
  return {
    requestedChunkCount: 0,
    readyChunkCount: 0,
    generatingChunkCount: 0,
    failedChunkCount: 0,
    missingChunkCount: 0,
    coveragePercent: 0,
    candidateRowCount: 0,
    availableMonthCount: 0,
    activeChunkLabel: null,
  };
}

export function describeHealthChunkActivity(activeChunkLabel: string | null) {
  const monthLabel = formatMonthLabel(activeChunkLabel);
  return monthLabel ? `Estimating from ${monthLabel} expenses...` : "Estimating from your expense history...";
}
