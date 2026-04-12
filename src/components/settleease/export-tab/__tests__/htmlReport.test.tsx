import { describe, expect, it } from "vitest";
import type { Expense, Person, SettlementPayment } from "@/lib/settleease/types";
import {
  buildExportDateRange,
  buildGroupSummaryReportModel,
  buildPersonalStatementReportModel,
} from "../utils/reportModels";
import { renderExportReportHtml, renderLucideSvg } from "../utils/htmlReport";

const people: Person[] = [
  { id: "person-a", name: "Amit <script>" },
  { id: "person-b", name: "Aditya" },
];

const peopleMap = Object.fromEntries(people.map((person) => [person.id, person.name]));

const expenses: Expense[] = [
  {
    id: "expense-1",
    description: "Dinner <img src=x onerror=alert(1)>",
    total_amount: 900,
    category: "Food",
    paid_by: [{ personId: "person-a", amount: 900 }],
    split_method: "itemwise",
    shares: [
      { personId: "person-a", amount: 450 },
      { personId: "person-b", amount: 450 },
    ],
    items: [
      {
        id: "item-1",
        name: "Shared platter",
        price: 900,
        sharedBy: ["person-a", "person-b"],
        categoryName: "Food",
      },
    ],
    created_at: "2026-01-10T10:00:00.000Z",
  },
];

const settlements: SettlementPayment[] = [
  {
    id: "settlement-1",
    debtor_id: "person-b",
    creditor_id: "person-a",
    amount_settled: 100,
    settled_at: "2026-01-11T10:00:00.000Z",
    marked_by_user_id: "user-1",
    notes: "UPI <b>paid</b>",
  },
];

describe("audit HTML reports", () => {
  it("renders required group audit sections with Inter CSS and lucide SVGs", () => {
    const model = buildGroupSummaryReportModel({
      people,
      expenses,
      settlementPayments: settlements,
      manualOverrides: [],
      peopleMap,
      categories: [{ name: "Food", icon_name: "Utensils" }],
      dateRange: buildExportDateRange("allTime", undefined, undefined),
      generatedAt: new Date("2026-01-12T10:00:00.000Z"),
    });

    const html = renderExportReportHtml(model, { interFontCss: "/* --font-inter test */" });

    expect(html).toContain("Summary");
    expect(html).toContain("Activity Feed");
    expect(html).toContain("Detailed Expense Breakdown");
    expect(html).toContain("Settlement Payments Ledger");
    expect(html).toContain("Simplified Settlement Transactions");
    expect(html).toContain("Net Settlement Calculation");
    expect(html).toContain("--font-inter");
    expect(html).toContain("<svg");
  });

  it("escapes user text and avoids rendering raw technical ids", () => {
    const model = buildGroupSummaryReportModel({
      people,
      expenses,
      settlementPayments: settlements,
      manualOverrides: [],
      peopleMap,
      categories: [],
      dateRange: buildExportDateRange("allTime", undefined, undefined),
    });

    const html = renderExportReportHtml(model);

    expect(html).toContain("Dinner &lt;img");
    expect(html).toContain("Amit &lt;script&gt;");
    expect(html).toContain("UPI &lt;b&gt;paid&lt;/b&gt;");
    expect(html).not.toContain("expense-1");
    expect(html).not.toContain("person-a");
    expect(html).not.toContain("settlement-1");
  });

  it("renders required personal audit sections", () => {
    const model = buildPersonalStatementReportModel({
      people,
      expenses,
      settlementPayments: settlements,
      manualOverrides: [],
      peopleMap,
      categories: [{ name: "Food", icon_name: "Utensils" }],
      dateRange: buildExportDateRange("allTime", undefined, undefined),
      selectedPersonId: "person-b",
      generatedAt: new Date("2026-01-12T10:00:00.000Z"),
    });

    const html = renderExportReportHtml(model);

    expect(html).toContain("Personal Statement");
    expect(html).toContain("Expense Details");
    expect(html).toContain("Who Paid");
    expect(html).toContain("Split Details");
    expect(html).toContain("Your Counterparty Impact");
    expect(html).toContain("Final Settlement Summary");
  });

  it("renders lucide-react icons as inline SVG strings", () => {
    expect(renderLucideSvg("FileText")).toContain("<svg");
  });
});
