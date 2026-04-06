import type { ExpenseItemDetail } from "./types";

export interface GroupedItemSharingVariant {
  quantity: number;
  sharedBy: string[];
}

export interface GroupedExpenseItemDisplay {
  name: string;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  firstSeenIndex: number;
  sharingVariants: GroupedItemSharingVariant[];
}

function normalizeItemName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeCategoryName(categoryName?: string): string {
  return (categoryName || "").trim().toLowerCase();
}

function toPriceCents(price: number | string): number {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) return 0;
  return Math.round(numericPrice * 100);
}

export function groupExpenseItemsForDisplay(
  items: ExpenseItemDetail[]
): GroupedExpenseItemDisplay[] {
  const groupedItems = new Map<
    string,
    GroupedExpenseItemDisplay & {
      variantMap: Map<string, GroupedItemSharingVariant>;
    }
  >();

  items.forEach((item, index) => {
    const normalizedName = normalizeItemName(item.name);
    const normalizedCategory = normalizeCategoryName(item.categoryName);
    const unitPriceCents = toPriceCents(item.price);
    const groupKey = `${normalizedName}::${unitPriceCents}::${normalizedCategory}`;

    let groupedItem = groupedItems.get(groupKey);

    if (!groupedItem) {
      groupedItem = {
        name: item.name.trim().replace(/\s+/g, " "),
        categoryName: item.categoryName,
        quantity: 0,
        unitPrice: unitPriceCents / 100,
        totalPrice: 0,
        firstSeenIndex: index,
        sharingVariants: [],
        variantMap: new Map(),
      };
      groupedItems.set(groupKey, groupedItem);
    }

    groupedItem.quantity += 1;
    groupedItem.totalPrice += unitPriceCents / 100;

    const sortedSharedBy = [...(item.sharedBy || [])].sort((a, b) =>
      a.localeCompare(b)
    );
    const variantKey = sortedSharedBy.join("::");
    const existingVariant = groupedItem.variantMap.get(variantKey);

    if (existingVariant) {
      existingVariant.quantity += 1;
    } else {
      const newVariant: GroupedItemSharingVariant = {
        quantity: 1,
        sharedBy: sortedSharedBy,
      };
      groupedItem.variantMap.set(variantKey, newVariant);
      groupedItem.sharingVariants.push(newVariant);
    }
  });

  return Array.from(groupedItems.values())
    .sort((a, b) => a.firstSeenIndex - b.firstSeenIndex)
    .map(({ variantMap: _variantMap, ...groupedItem }) => groupedItem);
}
