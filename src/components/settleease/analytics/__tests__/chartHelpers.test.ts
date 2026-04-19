import { describe, expect, it } from "vitest";
import {
  buildBarInspectorDatum,
  buildDonutInspectorDatum,
  buildLineInspectorDatum,
  buildStackedInspectorDatum,
  getIntegerAxisDomain,
  getIntegerTickValues,
  getResponsiveChartHeight,
  isSinglePointTrend,
  shortenAxisLabel,
} from "../chartHelpers";

const format = (value: number) => `₹${value}`;

describe("analytics chart helpers", () => {
  it("returns stable nonzero responsive chart heights", () => {
    expect(getResponsiveChartHeight(360, 360)).toBe(280);
    expect(getResponsiveChartHeight(768, 360)).toBe(340);
    expect(getResponsiveChartHeight(1440, 360)).toBe(360);
  });

  it("builds inspector rows for line and bar charts", () => {
    expect(buildLineInspectorDatum({ key: "apr", label: "Apr 2026", value: 1200 }, "Spent", format, "#111").rows).toEqual([
      { label: "Spent", value: "₹1200", color: "#111" },
    ]);

    expect(buildBarInspectorDatum({ key: "food", label: "Food", value: 3 }, { id: "value", label: "Expenses" }, String, "#222")).toMatchObject({
      title: "Food",
      rows: [{ label: "Expenses", value: "3", color: "#222" }],
    });
  });

  it("builds inspector rows for stacked trends and donuts", () => {
    const stacked = buildStackedInspectorDatum(
      { key: "apr", label: "Apr 2026", Food: 1000, Tax: 250 },
      ["Food", "Tax"],
      ["#0f0", "#f90"],
      format
    );
    expect(stacked.rows).toEqual([
      { label: "Food", value: "₹1000", color: "#0f0" },
      { label: "Tax", value: "₹250", color: "#f90" },
    ]);

    const donut = buildDonutInspectorDatum({ name: "Equal", amount: 2, share: 50 }, (value) => `${value} expenses`, "#333");
    expect(donut.rows).toEqual([
      { label: "Amount", value: "2 expenses", color: "#333" },
      { label: "Share", value: "50.0%" },
    ]);
  });

  it("detects single-point trends and creates integer count ticks", () => {
    expect(isSinglePointTrend([{ key: "apr", label: "Apr", Food: 100 }])).toBe(true);
    expect(isSinglePointTrend([{ key: "apr" }, { key: "may" }])).toBe(false);
    expect(getIntegerAxisDomain([0])).toEqual([0, 1]);
    expect(getIntegerAxisDomain([1.2, 3])).toEqual([0, 3]);
    expect(getIntegerTickValues(1, 5)).toEqual([0, 1]);
    expect(getIntegerTickValues(12, 5)).toEqual([0, 3, 6, 9, 12]);
  });

  it("shortens long axis labels safely", () => {
    expect(shortenAxisLabel("Alcohol and Beverages", 10)).toBe("Alcohol...");
    expect(shortenAxisLabel("Food", 10)).toBe("Food");
  });
});
