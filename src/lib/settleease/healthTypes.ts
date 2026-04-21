export type HealthMode = "group" | "personal";
export type HealthGranularity = "weekly" | "monthly";
export type HealthDatePreset = "30d" | "90d" | "1y" | "all";
export type HealthSourceKind = "expense" | "item";
export type HealthClassification = "food" | "alcohol" | "ignore";
export type HealthConfidence = "low" | "medium" | "high";

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
