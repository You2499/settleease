import { describe, expect, it } from "vitest";
import type { Expense, ManualSettlementOverride, Person, SettlementPayment } from "@/lib/settleease/types";
import { calculateSimplifiedTransactions } from "@/lib/settleease/settlementCalculations";
import {
  buildExportDateRange,
  buildGroupSummaryReportModel,
  buildPersonalStatementReportModel,
  sanitizeReportFileName,
} from "../utils/reportModels";

const people: Person[] = [
  { id: "person-a", name: "Amit" },
  { id: "person-b", name: "Aditya" },
  { id: "person-c", name: "Sourav" },
];

const peopleMap = Object.fromEntries(people.map((person) => [person.id, person.name]));

const expenses: Expense[] = [
  {
    id: "expense-1",
    description: "Hotel Sagar",
    total_amount: 6109,
    category: "Food",
    paid_by: [{ personId: "person-a", amount: 6109 }],
    split_method: "unequal",
    shares: [
      { personId: "person-a", amount: 2429.5 },
      { personId: "person-b", amount: 1969.75 },
      { personId: "person-c", amount: 1709.75 },
    ],
    created_at: "2026-01-10T10:00:00.000Z",
  },
  {
    id: "expense-2",
    description: "Personal purchase",
    total_amount: 500,
    category: "Personal",
    paid_by: [{ personId: "person-b", amount: 500 }],
    split_method: "equal",
    shares: [
      { personId: "person-a", amount: 250 },
      { personId: "person-b", amount: 250 },
    ],
    exclude_from_settlement: true,
    created_at: "2026-01-11T10:00:00.000Z",
  },
  {
    id: "expense-3",
    description: "Old taxi",
    total_amount: 300,
    category: "Transport",
    paid_by: [{ personId: "person-c", amount: 300 }],
    split_method: "equal",
    shares: [
      { personId: "person-b", amount: 150 },
      { personId: "person-c", amount: 150 },
    ],
    created_at: "2025-12-01T10:00:00.000Z",
  },
];

const settlementPayments: SettlementPayment[] = [
  {
    id: "settlement-1",
    debtor_id: "person-c",
    creditor_id: "person-a",
    amount_settled: 100,
    settled_at: "2026-01-12T10:00:00.000Z",
    marked_by_user_id: "user-1",
  },
  {
    id: "settlement-2",
    debtor_id: "person-b",
    creditor_id: "person-c",
    amount_settled: 50,
    settled_at: "2025-12-05T10:00:00.000Z",
    marked_by_user_id: "user-1",
  },
];

const activeOverride: ManualSettlementOverride = {
  id: "override-1",
  debtor_id: "person-b",
  creditor_id: "person-a",
  amount: 500,
  is_active: true,
  created_at: "2026-01-12T10:00:00.000Z",
  updated_at: "2026-01-12T10:00:00.000Z",
};

describe("export report models", () => {
  it("uses All Time by default and includes all non-excluded expenses and settlements", () => {
    const model = buildGroupSummaryReportModel({
      people,
      expenses,
      settlementPayments,
      manualOverrides: [],
      peopleMap,
      categories: [],
      dateRange: buildExportDateRange("allTime", undefined, undefined),
      generatedAt: new Date("2026-01-15T10:00:00.000Z"),
    });

    expect(model.expenses.map((expense) => expense.description)).toEqual(["Hotel Sagar", "Old taxi"]);
    expect(model.settlements).toHaveLength(2);
    expect(model.metrics.find((metric) => metric.label === "Excluded Spend")?.value).toBe("₹500.00");
  });

  it("filters expenses by created_at and settlements by settled_at for custom date ranges", () => {
    const model = buildGroupSummaryReportModel({
      people,
      expenses,
      settlementPayments,
      manualOverrides: [],
      peopleMap,
      categories: [],
      dateRange: buildExportDateRange(
        "custom",
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-31T00:00:00.000Z")
      ),
    });

    expect(model.expenses.map((expense) => expense.description)).toEqual(["Hotel Sagar"]);
    expect(model.settlements).toHaveLength(1);
  });

  it("matches manual-override-aware simplified settlement actions", () => {
    const dateRange = buildExportDateRange("allTime", undefined, undefined);
    const includedExpenses = expenses.filter((expense) => !expense.exclude_from_settlement);
    const expectedTotal = calculateSimplifiedTransactions(
      people,
      includedExpenses,
      settlementPayments,
      [activeOverride]
    ).reduce((sum, transaction) => sum + transaction.amount, 0);

    const model = buildGroupSummaryReportModel({
      people,
      expenses,
      settlementPayments,
      manualOverrides: [activeOverride],
      peopleMap,
      categories: [],
      dateRange,
    });

    const actionTotal = model.paymentActions.reduce((sum, action) => sum + action.amount, 0);
    expect(actionTotal).toBeCloseTo(expectedTotal, 2);
    expect(model.manualOverrides).toHaveLength(1);
  });

  it("builds a personal statement only from the selected participant's activity", () => {
    const model = buildPersonalStatementReportModel({
      people,
      expenses,
      settlementPayments,
      manualOverrides: [],
      peopleMap,
      dateRange: buildExportDateRange("allTime", undefined, undefined),
      selectedPersonId: "person-a",
    });

    expect(model.personName).toBe("Amit");
    expect(model.expenses.map((expense) => expense.description)).toEqual(["Hotel Sagar"]);
    expect(model.settlements).toHaveLength(1);
  });

  it("redacts sensitive personal report labels without changing amounts", () => {
    const sensitiveExpense: Expense = {
      ...expenses[0],
      description: "Beer and wine",
      category: "Alcohol",
      total_amount: 1200,
      paid_by: [{ personId: "person-a", amount: 1200 }],
      shares: [{ personId: "person-a", amount: 1200 }],
    };

    const model = buildPersonalStatementReportModel({
      people,
      expenses: [sensitiveExpense],
      settlementPayments: [],
      manualOverrides: [],
      peopleMap,
      dateRange: buildExportDateRange("allTime", undefined, undefined),
      selectedPersonId: "person-a",
      redacted: true,
    });

    expect(model.expenses[0].description).toBe("Misc expense");
    expect(model.expenses[0].category).toBe("General");
    expect(model.expenses[0].amount).toBe(1200);
  });

  it("reports deterministic data-quality warnings for inconsistent expenses", () => {
    const brokenExpense: Expense = {
      ...expenses[0],
      paid_by: [{ personId: "person-a", amount: 10 }],
    };

    const model = buildGroupSummaryReportModel({
      people,
      expenses: [brokenExpense],
      settlementPayments: [],
      manualOverrides: [],
      peopleMap,
      categories: [],
      dateRange: buildExportDateRange("allTime", undefined, undefined),
    });

    expect(model.dataQuality.passes).toBe(false);
    expect(model.dataQuality.warnings[0]).toContain("paid total");
  });

  it("sanitizes unsafe report file names", () => {
    expect(sanitizeReportFileName("Goa / Trip: Jan <2026>")).toBe("Goa_Trip_Jan_2026");
  });
});
