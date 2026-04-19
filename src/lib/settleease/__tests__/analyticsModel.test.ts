import { describe, expect, it } from "vitest";
import { calculateNetBalances } from "../settlementCalculations";
import { buildAnalyticsModel } from "../analyticsModel";
import type { Category, Expense, Person, SettlementPayment } from "../types";

const people: Person[] = [
  { id: "alice", name: "Alice" },
  { id: "bob", name: "Bob" },
  { id: "chris", name: "Chris" },
];

const peopleMap = {
  alice: "Alice",
  bob: "Bob",
  chris: "Chris",
};

const categories: Category[] = [
  { id: "food", name: "Food", icon_name: "Utensils" },
  { id: "travel", name: "Travel", icon_name: "Car" },
  { id: "gifts", name: "Gifts", icon_name: "Gift" },
];

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: "expense-1",
    description: "Dinner",
    total_amount: 100,
    category: "Food",
    paid_by: [{ personId: "alice", amount: 100 }],
    split_method: "equal",
    shares: [
      { personId: "alice", amount: 50 },
      { personId: "bob", amount: 50 },
    ],
    created_at: "2026-04-05T10:00:00.000Z",
    ...overrides,
  };
}

function settlement(overrides: Partial<SettlementPayment>): SettlementPayment {
  return {
    id: "settlement-1",
    debtor_id: "bob",
    creditor_id: "alice",
    amount_settled: 50,
    settled_at: "2026-04-06T10:00:00.000Z",
    marked_by_user_id: "user-1",
    ...overrides,
  };
}

describe("buildAnalyticsModel", () => {
  it("ends a fully settled debtor balance at zero", () => {
    const expenses = [expense({})];
    const settlementPayments = [settlement({})];
    const model = buildAnalyticsModel({
      expenses,
      settlementPayments,
      people,
      peopleMap,
      categories,
      mode: "personal",
      selectedPersonId: "bob",
      now: new Date("2026-04-10T00:00:00.000Z"),
    });

    const lastPoint = model.charts.balanceTimeline.at(-1);
    expect(model.snapshot.currentNetBalance).toBe(0);
    expect(lastPoint?.balance).toBe(0);
    expect(model.trust.balanceReconciled).toBe(true);
  });

  it("moves partial settlements toward zero for debtors and creditors", () => {
    const expenses = [expense({})];
    const settlementPayments = [settlement({ amount_settled: 25 })];

    const bobModel = buildAnalyticsModel({
      expenses,
      settlementPayments,
      people,
      peopleMap,
      categories,
      mode: "personal",
      selectedPersonId: "bob",
      now: new Date("2026-04-10T00:00:00.000Z"),
    });

    const aliceModel = buildAnalyticsModel({
      expenses,
      settlementPayments,
      people,
      peopleMap,
      categories,
      mode: "personal",
      selectedPersonId: "alice",
      now: new Date("2026-04-10T00:00:00.000Z"),
    });

    expect(bobModel.snapshot.currentNetBalance).toBe(-25);
    expect(bobModel.charts.balanceTimeline.at(-1)?.balance).toBe(-25);
    expect(aliceModel.snapshot.currentNetBalance).toBe(25);
    expect(aliceModel.charts.balanceTimeline.at(-1)?.balance).toBe(25);
  });

  it("keeps the balance timeline final value equal to calculateNetBalances", () => {
    const expenses = [
      expense({}),
      expense({
        id: "expense-2",
        description: "Taxi",
        total_amount: 90,
        category: "Travel",
        paid_by: [
          { personId: "alice", amount: 45 },
          { personId: "chris", amount: 45 },
        ],
        split_method: "unequal",
        shares: [
          { personId: "alice", amount: 20 },
          { personId: "bob", amount: 30 },
          { personId: "chris", amount: 40 },
        ],
        created_at: "2026-04-07T10:00:00.000Z",
      }),
    ];
    const settlementPayments = [settlement({ amount_settled: 20 })];
    const expected = calculateNetBalances(people, expenses, settlementPayments).bob;

    const model = buildAnalyticsModel({
      expenses,
      settlementPayments,
      people,
      peopleMap,
      categories,
      mode: "personal",
      selectedPersonId: "bob",
      now: new Date("2026-04-10T00:00:00.000Z"),
    });

    expect(model.charts.balanceTimeline.at(-1)?.balance).toBeCloseTo(expected, 2);
    expect(model.trust.balanceDelta).toBe(0);
  });

  it("handles multiple payers, itemwise splits, celebrations, and invalid data warnings", () => {
    const expenses = [
      expense({
        id: "itemwise",
        description: "Party",
        total_amount: 300,
        category: "Food",
        paid_by: [
          { personId: "alice", amount: 200 },
          { personId: "chris", amount: 100 },
        ],
        split_method: "itemwise",
        shares: [
          { personId: "alice", amount: 75 },
          { personId: "bob", amount: 75 },
          { personId: "chris", amount: 100 },
        ],
        celebration_contribution: { personId: "alice", amount: 50 },
        items: [
          { id: "pizza", name: "Pizza", price: 150, sharedBy: ["alice", "bob"], categoryName: "Food" },
          { id: "cab", name: "Cab", price: 150, sharedBy: ["bob", "chris"], categoryName: "Travel" },
        ],
      }),
      expense({
        id: "bad",
        description: "Bad row",
        total_amount: 10,
        paid_by: [{ personId: "alice", amount: 5 }],
        shares: [{ personId: "bob", amount: 5 }],
        created_at: "not-a-date",
      }),
    ];

    const model = buildAnalyticsModel({
      expenses,
      settlementPayments: [],
      people,
      peopleMap,
      categories,
      mode: "personal",
      selectedPersonId: "alice",
      now: new Date("2026-04-10T00:00:00.000Z"),
    });

    expect(model.snapshot.totalSpend).toBe(125);
    expect(model.charts.categoryBreakdown.some((row) => row.name === "Food")).toBe(true);
    expect(model.dataQualityWarnings.length).toBeGreaterThan(0);
  });

  it("includes excluded expenses in spending while excluding them from balances", () => {
    const expenses = [
      expense({}),
      expense({
        id: "excluded",
        description: "Private booking",
        total_amount: 200,
        paid_by: [{ personId: "alice", amount: 200 }],
        shares: [
          { personId: "alice", amount: 100 },
          { personId: "bob", amount: 100 },
        ],
        exclude_from_settlement: true,
      }),
    ];

    const groupModel = buildAnalyticsModel({
      expenses,
      settlementPayments: [],
      people,
      peopleMap,
      categories,
      mode: "group",
      now: new Date("2026-04-10T00:00:00.000Z"),
    });
    const bobModel = buildAnalyticsModel({
      expenses,
      settlementPayments: [],
      people,
      peopleMap,
      categories,
      mode: "personal",
      selectedPersonId: "bob",
      now: new Date("2026-04-10T00:00:00.000Z"),
    });

    expect(groupModel.snapshot.totalSpend).toBe(300);
    expect(groupModel.trust.excludedExpenseCount).toBe(1);
    expect(bobModel.snapshot.totalSpend).toBe(150);
    expect(bobModel.snapshot.currentNetBalance).toBe(-50);
  });

  it("aggregates same-day ledger events deterministically", () => {
    const expenses = [expense({ created_at: "2026-04-05T10:00:00.000Z" })];
    const settlementPayments = [settlement({ settled_at: "2026-04-05T10:00:00.000Z" })];

    const model = buildAnalyticsModel({
      expenses,
      settlementPayments,
      people,
      peopleMap,
      categories,
      mode: "personal",
      selectedPersonId: "bob",
      now: new Date("2026-04-10T00:00:00.000Z"),
    });

    expect(model.charts.balanceTimeline).toHaveLength(2);
    expect(model.charts.balanceTimeline.at(-1)?.balance).toBe(0);
  });

  it("returns safe empty-state datasets", () => {
    const model = buildAnalyticsModel({
      expenses: [],
      settlementPayments: [],
      people,
      peopleMap,
      categories,
      mode: "group",
      now: new Date("2026-04-10T00:00:00.000Z"),
    });

    expect(model.snapshot.totalSpend).toBe(0);
    expect(model.charts.spendingTrend).toEqual([]);
    expect(model.details.topExpenses).toEqual([]);
  });
});
