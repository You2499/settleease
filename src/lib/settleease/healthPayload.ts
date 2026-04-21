import type { Expense, Person } from "./types";
import type {
  HealthAllocationShare,
  HealthSourceAiPayloadRow,
  HealthSourceRow,
} from "./healthTypes";

const EPSILON = 0.01;
const UNCATEGORIZED = "Uncategorized";

export const HEALTH_LEDGER_PAYLOAD_SCHEMA_VERSION = 1;

export interface HealthChunkPayload {
  schemaVersion: number;
  monthKey: string;
  rows: HealthSourceAiPayloadRow[];
}

function toAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
}

function safeIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function monthKeyFromIsoDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function dedupePersonIds(personIds: string[], knownPersonIds: Set<string>): string[] {
  return [...new Set(personIds.filter((personId) => knownPersonIds.has(personId)))];
}

function equalAllocation(personIds: string[]): HealthAllocationShare[] {
  if (personIds.length === 0) return [];
  const ratio = Number((1 / personIds.length).toFixed(6));
  return personIds.map((personId, index) => ({
    personId,
    ratio: index === personIds.length - 1
      ? Number((1 - ratio * (personIds.length - 1)).toFixed(6))
      : ratio,
  }));
}

function normalizeAllocationShares(shares: Array<{ personId: string; amount: number }>, fallbackPersonIds: string[]): HealthAllocationShare[] {
  const total = shares.reduce((sum, share) => sum + Math.max(0, toAmount(share.amount)), 0);
  if (total <= EPSILON) {
    return equalAllocation(fallbackPersonIds);
  }

  let runningRatio = 0;
  return shares.map((share, index) => {
    const ratio = Number((Math.max(0, toAmount(share.amount)) / total).toFixed(6));
    runningRatio += ratio;
    return {
      personId: share.personId,
      ratio: index === shares.length - 1
        ? Number(Math.max(0, (1 - (runningRatio - ratio))).toFixed(6))
        : ratio,
    };
  });
}

function compareHealthSourceRow(a: HealthSourceRow, b: HealthSourceRow): number {
  const dateComparison = a.date.localeCompare(b.date);
  if (dateComparison !== 0) return dateComparison;
  const titleComparison = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  if (titleComparison !== 0) return titleComparison;
  return a.sourceKey.localeCompare(b.sourceKey, undefined, { sensitivity: "base" });
}

export function buildHealthSourceRows({
  expenses,
  people,
}: {
  expenses: Expense[];
  people: Person[];
}): HealthSourceRow[] {
  const rows: HealthSourceRow[] = [];
  const knownPersonIds = new Set(people.map((person) => person.id));

  expenses.forEach((expense) => {
    const isoDate = safeIsoDate(expense.created_at);
    if (!isoDate) return;

    const fallbackCategory = expense.category || UNCATEGORIZED;
    const expenseDescription = expense.description || "Untitled expense";
    const chunkKey = monthKeyFromIsoDate(isoDate);
    const expenseSharePersonIds = dedupePersonIds(
      Array.isArray(expense.shares) ? expense.shares.map((share) => share.personId) : [],
      knownPersonIds,
    );

    if (expense.split_method === "itemwise" && Array.isArray(expense.items) && expense.items.length > 0) {
      expense.items.forEach((item, index) => {
        const amount = toAmount(item.price);
        if (amount <= EPSILON) return;

        const participantIds = dedupePersonIds(item.sharedBy || [], knownPersonIds);
        const effectiveParticipantIds = participantIds.length > 0 ? participantIds : expenseSharePersonIds;
        const sourceKey = `expense:${expense.id}:item:${item.id || index}`;

        rows.push({
          sourceKey,
          chunkKey,
          sourceKind: "item",
          expenseId: expense.id,
          itemId: item.id || undefined,
          title: item.name || expenseDescription,
          expenseDescription,
          categoryName: item.categoryName || fallbackCategory,
          amount,
          date: isoDate,
          participantIds: effectiveParticipantIds,
          allocationShares: equalAllocation(effectiveParticipantIds),
        });
      });
      return;
    }

    const amount = toAmount(expense.total_amount);
    if (amount <= EPSILON) return;

    const fallbackParticipants = expenseSharePersonIds.length > 0
      ? expenseSharePersonIds
      : dedupePersonIds(Array.isArray(expense.paid_by) ? expense.paid_by.map((payer) => payer.personId) : [], knownPersonIds);

    rows.push({
      sourceKey: `expense:${expense.id}:expense`,
      chunkKey,
      sourceKind: "expense",
      expenseId: expense.id,
      title: expenseDescription,
      expenseDescription,
      categoryName: fallbackCategory,
      amount,
      date: isoDate,
      participantIds: fallbackParticipants,
      allocationShares: normalizeAllocationShares(
        Array.isArray(expense.shares) ? expense.shares : [],
        fallbackParticipants,
      ),
    });
  });

  return rows.sort(compareHealthSourceRow);
}

export function buildHealthChunkPayload(chunkKey: string, rows: HealthSourceRow[]): HealthChunkPayload {
  return {
    schemaVersion: HEALTH_LEDGER_PAYLOAD_SCHEMA_VERSION,
    monthKey: chunkKey,
    rows: rows
      .map<HealthSourceAiPayloadRow>((row) => ({
        sourceKey: row.sourceKey,
        sourceKind: row.sourceKind,
        title: row.title,
        expenseDescription: row.expenseDescription,
        categoryName: row.categoryName,
        amount: row.amount,
        date: row.date,
      }))
      .sort((a, b) => {
        const dateComparison = a.date.localeCompare(b.date);
        if (dateComparison !== 0) return dateComparison;
        const titleComparison = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        if (titleComparison !== 0) return titleComparison;
        return a.sourceKey.localeCompare(b.sourceKey, undefined, { sensitivity: "base" });
      }),
  };
}

export function groupHealthSourceRowsByChunk(rows: HealthSourceRow[]): Map<string, HealthSourceRow[]> {
  const byChunk = new Map<string, HealthSourceRow[]>();
  rows.forEach((row) => {
    const existing = byChunk.get(row.chunkKey) || [];
    existing.push(row);
    byChunk.set(row.chunkKey, existing);
  });
  return byChunk;
}
