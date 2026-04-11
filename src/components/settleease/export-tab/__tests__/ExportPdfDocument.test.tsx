import React from "react";
import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";
import type { Expense, Person, SettlementPayment } from "@/lib/settleease/types";
import ExportPdfDocument from "../components/ExportPdfDocument";
import {
  buildExportDateRange,
  buildGroupSummaryReportModel,
  buildPersonalStatementReportModel,
} from "../utils/reportModels";

const people: Person[] = [
  { id: "person-a", name: "A very long participant name that still needs to fit" },
  { id: "person-b", name: "Bob" },
];

const peopleMap = Object.fromEntries(people.map((person) => [person.id, person.name]));

const expenses: Expense[] = [
  {
    id: "expense-1",
    description: "A very long restaurant bill description that should wrap inside the generated document",
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
        price: 500,
        sharedBy: ["person-a", "person-b"],
        categoryName: "Food",
      },
      {
        id: "item-2",
        name: "Dessert",
        price: 400,
        sharedBy: ["person-a", "person-b"],
        categoryName: "Food",
      },
    ],
    celebration_contribution: {
      personId: "person-a",
      amount: 0,
    },
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
    notes: "UPI",
  },
];

describe("ExportPdfDocument", () => {
  it("renders a group summary PDF without throwing", async () => {
    const model = buildGroupSummaryReportModel({
      people,
      expenses,
      settlementPayments: settlements,
      manualOverrides: [],
      peopleMap,
      categories: [],
      dateRange: buildExportDateRange("allTime", undefined, undefined),
      generatedAt: new Date("2026-01-12T10:00:00.000Z"),
    });

    const blob = await pdf(<ExportPdfDocument model={model} />).toBlob();
    expect(blob.size).toBeGreaterThan(0);
  });

  it("renders a personal statement PDF without throwing", async () => {
    const model = buildPersonalStatementReportModel({
      people,
      expenses,
      settlementPayments: settlements,
      manualOverrides: [],
      peopleMap,
      dateRange: buildExportDateRange("allTime", undefined, undefined),
      selectedPersonId: "person-b",
      generatedAt: new Date("2026-01-12T10:00:00.000Z"),
    });

    const blob = await pdf(<ExportPdfDocument model={model} />).toBlob();
    expect(blob.size).toBeGreaterThan(0);
  });
});
