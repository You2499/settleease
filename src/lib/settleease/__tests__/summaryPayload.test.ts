import { describe, expect, it } from "vitest";
import { computeJsonHash } from "../hashUtils";
import {
  buildSettlementSummaryPayload,
  type PersonBalanceSnapshot,
} from "../summaryPayload";
import type {
  CalculatedTransaction,
  Expense,
  ManualSettlementOverride,
  Person,
  SettlementPayment,
} from "../types";

const people: Person[] = [
  { id: "p1", name: "Alice" },
  { id: "p2", name: "Bob" },
  { id: "p3", name: "Charlie" },
];

const peopleMap: Record<string, string> = {
  p1: "Alice",
  p2: "Bob",
  p3: "Charlie",
};

const categories = [
  { name: "Food", icon_name: "Utensils" },
  { name: "Dessert", icon_name: "Cake" },
  { name: "Transport", icon_name: "Car" },
];

const expenses: Expense[] = [
  {
    id: "exp-2",
    description: "Taxi",
    total_amount: 60,
    category: "Transport",
    paid_by: [{ personId: "p2", amount: 60 }],
    split_method: "unequal",
    shares: [
      { personId: "p2", amount: 30 },
      { personId: "p3", amount: 30 },
    ],
    exclude_from_settlement: true,
    created_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "exp-1",
    description: "Dinner",
    total_amount: 120,
    category: "Food",
    paid_by: [{ personId: "p1", amount: 120 }],
    split_method: "equal",
    shares: [
      { personId: "p1", amount: 40 },
      { personId: "p2", amount: 40 },
      { personId: "p3", amount: 40 },
    ],
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "exp-3",
    description: "Snacks",
    total_amount: 90,
    category: "Food",
    paid_by: [{ personId: "p2", amount: 90 }],
    split_method: "itemwise",
    shares: [
      { personId: "p1", amount: 15 },
      { personId: "p2", amount: 30 },
      { personId: "p3", amount: 45 },
    ],
    items: [
      {
        id: "item-1",
        name: "Chips",
        price: 60,
        sharedBy: ["p2", "p3"],
        categoryName: "Food",
      },
      {
        id: "item-2",
        name: "Cake",
        price: 30,
        sharedBy: ["p1", "p3"],
        categoryName: "Dessert",
      },
    ],
    created_at: "2026-01-03T00:00:00Z",
  },
];

const settlementPayments: SettlementPayment[] = [
  {
    id: "set-1",
    debtor_id: "p3",
    creditor_id: "p1",
    amount_settled: 10,
    settled_at: "2026-01-04T00:00:00Z",
    marked_by_user_id: "user-1",
  },
];

const manualOverrides: ManualSettlementOverride[] = [
  {
    id: "ov-1",
    debtor_id: "p3",
    creditor_id: "p2",
    amount: 15,
    is_active: true,
    created_at: "2026-01-03T00:00:00Z",
    updated_at: "2026-01-03T00:00:00Z",
  },
  {
    id: "ov-2",
    debtor_id: "p2",
    creditor_id: "p1",
    amount: 5,
    is_active: false,
    created_at: "2026-01-03T00:00:00Z",
    updated_at: "2026-01-03T00:00:00Z",
  },
];

const simplifiedTransactions: CalculatedTransaction[] = [
  { from: "p3", to: "p2", amount: 20 },
  { from: "p3", to: "p1", amount: 55 },
];

const pairwiseTransactions: CalculatedTransaction[] = [
  { from: "p3", to: "p1", amount: 45, contributingExpenseIds: ["exp-1", "exp-3"] },
  { from: "p3", to: "p2", amount: 20, contributingExpenseIds: ["exp-3"] },
];

const personBalances: Record<string, PersonBalanceSnapshot> = {
  p1: {
    totalPaid: 120,
    totalOwed: 55,
    settledAsDebtor: 0,
    settledAsCreditor: 10,
    netBalance: 55,
  },
  p2: {
    totalPaid: 150,
    totalOwed: 70,
    settledAsDebtor: 0,
    settledAsCreditor: 0,
    netBalance: 20,
  },
  p3: {
    totalPaid: 0,
    totalOwed: 85,
    settledAsDebtor: 10,
    settledAsCreditor: 0,
    netBalance: -75,
  },
};

describe("buildSettlementSummaryPayload", () => {
  it("is deterministic and redacts internal identifiers", () => {
    const payloadA = buildSettlementSummaryPayload({
      people,
      peopleMap,
      allExpenses: expenses,
      categories,
      pairwiseTransactions,
      simplifiedTransactions,
      settlementPayments,
      manualOverrides,
      personBalances,
    });

    const payloadB = buildSettlementSummaryPayload({
      people: [...people].reverse(),
      peopleMap,
      allExpenses: [...expenses].reverse(),
      categories: [...categories].reverse(),
      pairwiseTransactions: [...pairwiseTransactions].reverse(),
      simplifiedTransactions: [...simplifiedTransactions].reverse(),
      settlementPayments: [...settlementPayments].reverse(),
      manualOverrides: [...manualOverrides].reverse(),
      personBalances,
    });

    expect(payloadA).toEqual(payloadB);

    const serialized = JSON.stringify(payloadA);
    expect(serialized).not.toContain("p1");
    expect(serialized).not.toContain("p2");
    expect(serialized).not.toContain("p3");
    expect(serialized).not.toContain("user-1");
    expect(serialized).not.toContain("exp-1");
    expect(payloadA.expenses[0].items[0].shared_by).toEqual(["Bob", "Charlie"]);
  });

  it("computes expected analysis metrics", () => {
    const payload = buildSettlementSummaryPayload({
      people,
      peopleMap,
      allExpenses: expenses,
      categories,
      pairwiseTransactions,
      simplifiedTransactions,
      settlementPayments,
      manualOverrides,
      personBalances,
    });

    expect(payload.analysis.totals.includedSpend).toBe(210);
    expect(payload.analysis.totals.excludedSpend).toBe(60);
    expect(payload.analysis.totals.amountAlreadySettled).toBe(10);
    expect(payload.analysis.totals.remainingSimplifiedSettlementAmount).toBe(65);
    expect(payload.analysis.totals.activeManualOverrides).toBe(1);

    expect(payload.analysis.balances.rankedCreditors).toEqual([
      { name: "Alice", amount: 55 },
      { name: "Bob", amount: 20 },
    ]);
    expect(payload.analysis.balances.rankedDebtors).toEqual([
      { name: "Charlie", amount: 75 },
    ]);

    expect(payload.analysis.settlement.recommendedPaymentOrder[0]).toEqual({
      from: "Charlie",
      to: "Alice",
      original_amount: 55,
      already_settled_amount: 10,
      outstanding_amount: 45,
    });
    expect(payload.analysis.integrity.conservationCheck.passes).toBe(true);
    expect(payload.analysis.integrity.warningList).toEqual([]);
  });

  it("changes hash when only promptVersion changes", async () => {
    const payload = buildSettlementSummaryPayload({
      people,
      peopleMap,
      allExpenses: expenses,
      categories,
      pairwiseTransactions,
      simplifiedTransactions,
      settlementPayments,
      manualOverrides,
      personBalances,
    });

    const hashV1 = await computeJsonHash({ ...payload, promptVersion: 1 });
    const hashV1Repeat = await computeJsonHash({ ...payload, promptVersion: 1 });
    const hashV2 = await computeJsonHash({ ...payload, promptVersion: 2 });

    expect(hashV1).toBe(hashV1Repeat);
    expect(hashV2).not.toBe(hashV1);
  });
});
