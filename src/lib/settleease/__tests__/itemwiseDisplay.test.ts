import { describe, expect, it } from "vitest";

import {
  groupExpenseItemsForDisplay,
  type GroupedExpenseItemDisplay,
} from "../itemwiseDisplay";
import type { ExpenseItemDetail } from "../types";

function getSingleGroupedItem(items: ExpenseItemDetail[]): GroupedExpenseItemDisplay {
  const groupedItems = groupExpenseItemsForDisplay(items);
  expect(groupedItems).toHaveLength(1);
  return groupedItems[0];
}

describe("groupExpenseItemsForDisplay", () => {
  it("groups repeated logical items with different shared-by combinations", () => {
    const groupedItem = getSingleGroupedItem([
      {
        id: "1",
        name: "Food Item A",
        price: 100,
        sharedBy: ["person-b", "person-a"],
        categoryName: "Food",
      },
      {
        id: "2",
        name: "Food Item A",
        price: "100.00",
        sharedBy: ["person-a", "person-b", "person-c"],
        categoryName: "Food",
      },
    ]);

    expect(groupedItem.name).toBe("Food Item A");
    expect(groupedItem.categoryName).toBe("Food");
    expect(groupedItem.quantity).toBe(2);
    expect(groupedItem.unitPrice).toBe(100);
    expect(groupedItem.totalPrice).toBe(200);
    expect(groupedItem.sharingVariants).toEqual([
      { quantity: 1, sharedBy: ["person-a", "person-b"] },
      { quantity: 1, sharedBy: ["person-a", "person-b", "person-c"] },
    ]);
  });

  it("aggregates repeated variants with the same shared-by set", () => {
    const groupedItem = getSingleGroupedItem([
      {
        id: "1",
        name: "Pizza Slice",
        price: 50,
        sharedBy: ["person-a", "person-b"],
        categoryName: "Food",
      },
      {
        id: "2",
        name: "Pizza Slice",
        price: 50,
        sharedBy: ["person-b", "person-a"],
        categoryName: "Food",
      },
    ]);

    expect(groupedItem.quantity).toBe(2);
    expect(groupedItem.sharingVariants).toEqual([
      { quantity: 2, sharedBy: ["person-a", "person-b"] },
    ]);
  });

  it("keeps items separate when the price differs", () => {
    const groupedItems = groupExpenseItemsForDisplay([
      {
        id: "1",
        name: "Burger",
        price: 100,
        sharedBy: ["person-a"],
        categoryName: "Food",
      },
      {
        id: "2",
        name: "Burger",
        price: 120,
        sharedBy: ["person-a"],
        categoryName: "Food",
      },
    ]);

    expect(groupedItems).toHaveLength(2);
    expect(groupedItems.map((item) => item.unitPrice)).toEqual([100, 120]);
  });

  it("keeps items separate when the category differs", () => {
    const groupedItems = groupExpenseItemsForDisplay([
      {
        id: "1",
        name: "Water",
        price: 30,
        sharedBy: ["person-a"],
        categoryName: "Drinks",
      },
      {
        id: "2",
        name: "Water",
        price: 30,
        sharedBy: ["person-a"],
        categoryName: "Essentials",
      },
    ]);

    expect(groupedItems).toHaveLength(2);
    expect(groupedItems.map((item) => item.categoryName)).toEqual([
      "Drinks",
      "Essentials",
    ]);
  });

  it("normalizes whitespace and case without over-grouping different names", () => {
    const groupedItems = groupExpenseItemsForDisplay([
      {
        id: "1",
        name: "  GARLIC   NAAN ",
        price: 40,
        sharedBy: ["person-a"],
        categoryName: "Food",
      },
      {
        id: "2",
        name: "garlic naan",
        price: 40,
        sharedBy: ["person-b"],
        categoryName: "Food",
      },
      {
        id: "3",
        name: "garlic naan combo",
        price: 40,
        sharedBy: ["person-c"],
        categoryName: "Food",
      },
    ]);

    expect(groupedItems).toHaveLength(2);
    expect(groupedItems[0].name).toBe("GARLIC NAAN");
    expect(groupedItems[0].quantity).toBe(2);
    expect(groupedItems[1].name).toBe("garlic naan combo");
    expect(groupedItems[1].quantity).toBe(1);
  });

  it("preserves total value after grouping", () => {
    const items: ExpenseItemDetail[] = [
      {
        id: "1",
        name: "Fries",
        price: 80,
        sharedBy: ["person-a", "person-b"],
        categoryName: "Food",
      },
      {
        id: "2",
        name: "Fries",
        price: 80,
        sharedBy: ["person-a", "person-c"],
        categoryName: "Food",
      },
      {
        id: "3",
        name: "Cola",
        price: 40,
        sharedBy: ["person-a"],
        categoryName: "Drinks",
      },
    ];

    const groupedItems = groupExpenseItemsForDisplay(items);
    const originalTotal = items.reduce((sum, item) => sum + Number(item.price), 0);
    const groupedTotal = groupedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    expect(groupedTotal).toBe(originalTotal);
  });
});
