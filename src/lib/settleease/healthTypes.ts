export type HealthMode = "group" | "personal";
export type HealthGranularity = "weekly" | "monthly";
export type HealthDatePreset = "30d" | "90d" | "1y" | "all";
export type HealthSourceKind = "expense" | "item";
export type HealthClassification = "food" | "alcohol" | "ignore";
export type HealthConfidence = "low" | "medium" | "high";

export type HealthSurfaceId =
  | "overviewCalories"
  | "overviewMacros"
  | "overviewAlcohol"
  | "trustAndCoverage"
  | "calorieRhythm"
  | "macroRhythm"
  | "alcoholRhythm"
  | "sourceSplit"
  | "topCategories"
  | "topContributors"
  | "participantLens"
  | "ledgerList";

export type HealthSurfaceStatus =
  | "empty"
  | "cached"
  | "partial"
  | "generating"
  | "failed";

export type HealthChunkAvailabilityStatus =
  | "ready"
  | "generating"
  | "failed"
  | "missing";

export interface HealthAllocationShare {
  personId: string;
  ratio: number;
}

export interface HealthSourceAiPayloadRow {
  sourceKey: string;
  sourceKind: HealthSourceKind;
  title: string;
  expenseDescription: string;
  categoryName: string;
  amount: number;
  date: string;
}

export interface HealthSourceRow extends HealthSourceAiPayloadRow {
  chunkKey: string;
  expenseId: string;
  itemId?: string;
  participantIds: string[];
  allocationShares: HealthAllocationShare[];
}

export interface StructuredHealthEstimateRow {
  sourceKey: string;
  classification: HealthClassification;
  estimatedCalories: number;
  estimatedProteinGrams: number;
  estimatedCarbGrams: number;
  estimatedFatGrams: number;
  estimatedAlcoholServings: number;
  estimatedAlcoholCalories: number;
  confidence: HealthConfidence;
  rationale: string;
}

export interface StructuredHealthEstimate {
  schemaVersion: number;
  estimates: StructuredHealthEstimateRow[];
}

export interface HealthEstimatedLedgerRow extends HealthSourceRow, StructuredHealthEstimateRow {
  updatedAt?: string | null;
}

export interface HealthLedgerChunkStatus {
  chunkKey: string;
  dataHash: string;
  rowCount: number;
  source: "cached" | "generated" | "failed";
  updatedAt: string | null;
  error?: string | null;
}

export interface HealthLedgerCoverage {
  requestedChunkCount: number;
  coveredChunkCount: number;
  missingChunkCount: number;
  cacheHitCount: number;
  generatedCount: number;
  failedChunkCount: number;
  coveragePercent: number;
}

export interface HealthLedgerResult {
  schemaVersion: number;
  rows: HealthEstimatedLedgerRow[];
  chunkStatuses: HealthLedgerChunkStatus[];
  coverage: HealthLedgerCoverage;
  requestedRange: {
    startDate: string | null;
    endDate: string | null;
  };
  dataStats: {
    candidateRowCount: number;
    qualifyingRowCount: number;
    ignoredRowCount: number;
    availableMonthCount: number;
  };
  disclaimer: string;
  generatedAt: string;
}

export interface HealthChunkRequestArgs {
  startDate?: string;
  endDate?: string;
}

export interface HealthSurfaceQueryArgs extends HealthChunkRequestArgs {
  surfaceId: HealthSurfaceId;
  mode: HealthMode;
  selectedPersonId?: string;
  granularity?: HealthGranularity;
}

export interface HealthChunkAvailability {
  chunkKey: string;
  dataHash: string;
  rowCount: number;
  status: HealthChunkAvailabilityStatus;
  updatedAt: string | null;
  error?: string | null;
}

export interface HealthChunkAvailabilitySummary {
  requestedChunkCount: number;
  readyChunkCount: number;
  generatingChunkCount: number;
  failedChunkCount: number;
  missingChunkCount: number;
  coveragePercent: number;
  candidateRowCount: number;
  availableMonthCount: number;
  activeChunkLabel: string | null;
}

export interface HealthChunkAvailabilityResult {
  schemaVersion: number;
  chunks: HealthChunkAvailability[];
  summary: HealthChunkAvailabilitySummary;
  requestedRange: {
    startDate: string | null;
    endDate: string | null;
  };
  disclaimer: string;
  generatedAt: string;
}

export interface HealthSurfaceCoverage extends HealthChunkAvailabilitySummary {}

export interface HealthDetailRow {
  sourceKey: string;
  expenseId: string;
  title: string;
  categoryName: string;
  classification: HealthClassification;
  dateLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  alcoholServings: number;
  alcoholCalories: number;
  confidence: HealthConfidence;
  rationale: string;
}

export interface HealthBreakdownSlice {
  name: string;
  amount: number;
  share: number;
  description?: string;
}

export interface HealthRankedValueRow {
  key: string;
  label: string;
  calories: number;
  share: number;
  subtitle?: string;
  entryCount?: number;
}

export interface HealthParticipantSnapshotRow {
  personId: string;
  name: string;
  calories: number;
  alcoholServings: number;
  entryCount: number;
  shareOfCalories: number;
}

export interface HealthPrimitivePoint {
  key: string;
  label: string;
  sortValue: number;
  value: number;
}

export interface HealthOverviewCaloriesPayload {
  totalCalories: number;
  entryCount: number;
  averagePerActiveDay: number;
  activeDayCount: number;
  topCategoryName: string | null;
  note: string;
}

export interface HealthOverviewMacrosPayload {
  protein: number;
  carbs: number;
  fat: number;
  totalMacroGrams: number;
  leadingMacroLabel: string | null;
  note: string;
}

export interface HealthOverviewAlcoholPayload {
  servings: number;
  calories: number;
  shareOfCalories: number;
  topAlcoholSourceName: string | null;
  note: string;
}

export interface HealthTrustAndCoveragePayload {
  coverageLabel: string;
  cacheLabel: string;
  confidenceLabel: string;
  latestUpdateLabel: string;
  disclaimer: string;
  ignoredRowCount: number;
  failureMessage: string | null;
}

export interface HealthTrendPayload {
  granularity: HealthGranularity;
  summary: string;
  total: number;
  peakLabel: string | null;
  data: HealthPrimitivePoint[];
}

export interface HealthMacroRhythmPayload {
  granularity: HealthGranularity;
  summary: string;
  categories: string[];
  data: Array<Record<string, number | string>>;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface HealthSourceSplitPayload {
  totalFoodCalories: number;
  totalAlcoholCalories: number;
  breakdown: HealthBreakdownSlice[];
  narrative: string;
}

export interface HealthTopCategoriesPayload {
  rows: HealthRankedValueRow[];
  summary: string;
}

export interface HealthTopContributorsPayload {
  rows: HealthRankedValueRow[];
  summary: string;
}

export interface HealthParticipantLensPayload {
  rows: HealthParticipantSnapshotRow[];
  summary: string;
}

export interface HealthLedgerListPayload {
  rows: HealthDetailRow[];
  totalCount: number;
  summary: string;
}

export interface HealthSurfacePayloadMap {
  overviewCalories: HealthOverviewCaloriesPayload;
  overviewMacros: HealthOverviewMacrosPayload;
  overviewAlcohol: HealthOverviewAlcoholPayload;
  trustAndCoverage: HealthTrustAndCoveragePayload;
  calorieRhythm: HealthTrendPayload;
  macroRhythm: HealthMacroRhythmPayload;
  alcoholRhythm: HealthTrendPayload;
  sourceSplit: HealthSourceSplitPayload;
  topCategories: HealthTopCategoriesPayload;
  topContributors: HealthTopContributorsPayload;
  participantLens: HealthParticipantLensPayload;
  ledgerList: HealthLedgerListPayload;
}

export type HealthSurfacePayload = HealthSurfacePayloadMap[HealthSurfaceId];

export interface HealthSurfaceState<TPayload = HealthSurfacePayload> {
  surfaceId: HealthSurfaceId;
  status: HealthSurfaceStatus;
  coverage: HealthSurfaceCoverage;
  updatedAt: string | null;
  isRefreshing: boolean;
  payload: TPayload | null;
  disclaimer: string;
  error: string | null;
  requestedRange: {
    startDate: string | null;
    endDate: string | null;
  };
}
