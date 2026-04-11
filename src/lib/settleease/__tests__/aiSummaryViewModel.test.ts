import { describe, expect, it } from "vitest";
import {
  buildCategoryBars,
  buildPaymentRows,
  buildSettlementProgress,
  buildSummaryMetricCards,
  getDataQualityMessages,
} from "../aiSummaryViewModel";

const hotelPayload = {
  analysis: {
    totals: {
      includedSpend: 6109,
      excludedSpend: 0,
      amountAlreadySettled: 1694.75,
      remainingSimplifiedSettlementAmount: 3679.5,
      activeManualOverrides: 0,
    },
    settlement: {
      recommendedPaymentOrder: [
        {
          from: "Aditya",
          to: "Amit",
          outstanding_amount: 1969.75,
          already_settled_amount: 0,
        },
        {
          from: "Sourav",
          to: "Amit",
          outstanding_amount: 1709.75,
          already_settled_amount: 0,
        },
      ],
    },
    spending: {
      topCategories: [
        { name: "Alcohol", total_spent: 3945, share_of_included_spend: 64.58 },
        { name: "Food", total_spent: 1580, share_of_included_spend: 25.86 },
      ],
    },
    integrity: {
      conservationCheck: { passes: true },
      expenseConsistency: { passes: true },
      warningList: [],
    },
  },
};

describe("AI summary view model", () => {
  it("renders the hotel scenario payment rows and key metrics", () => {
    expect(buildSummaryMetricCards(hotelPayload).map((metric) => metric.value)).toEqual([
      "₹6109.00",
      "₹1694.75",
      "₹3679.50",
      "0",
    ]);

    expect(buildPaymentRows(hotelPayload)).toEqual([
      { from: "Aditya", to: "Amit", amount: 1969.75, status: "Outstanding" },
      { from: "Sourav", to: "Amit", amount: 1709.75, status: "Outstanding" },
    ]);
  });

  it("builds mini analytics from deterministic payload data", () => {
    expect(buildSettlementProgress(hotelPayload).percentSettled).toBe(31.5);
    expect(buildCategoryBars(hotelPayload)[0]).toEqual({
      name: "Alcohol",
      amount: 3945,
      share: 64.58,
    });
  });

  it("uses deterministic data-quality warnings", () => {
    expect(getDataQualityMessages(hotelPayload)).toEqual([
      "No material data-quality issues detected.",
    ]);

    expect(getDataQualityMessages({
      analysis: {
        integrity: {
          warningList: ["Expense \"Dinner\" has paid_by total 10 but total_amount 20."],
        },
      },
    })).toEqual(["Expense \"Dinner\" has paid_by total 10 but total_amount 20."]);
  });
});
