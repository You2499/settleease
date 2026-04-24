import type {
  ExpenseItemDetail,
  ItemQuantitySplit,
  PayerShare,
  PersonAggregatedItemShares,
  PersonItemShareDetails,
} from "./types";

const EPSILON = 0.001;

export interface ItemUnitSharing {
  unitIndex: number;
  sharedBy: string[];
}

export interface ItemwiseSplitCalculation {
  shares: PayerShare[];
  personBreakdown: PersonAggregatedItemShares;
  totalOriginalItems: number;
  reductionFactor: number;
}

export function toItemAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return amount;
}

export function roundItemAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function normalizeItemQuantityValue(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) return 1;
  return Math.max(1, Math.floor(quantity));
}

export function getItemQuantity(item: Pick<ExpenseItemDetail, "quantity">): number {
  return normalizeItemQuantityValue(item.quantity ?? 1);
}

export function getItemLineTotal(item: ExpenseItemDetail): number {
  const price = toItemAmount(item.price);
  if (price > EPSILON) return price;

  const unitPrice = toItemAmount(item.unitPrice);
  if (unitPrice > EPSILON) return unitPrice * getItemQuantity(item);

  return 0;
}

export function getItemUnitPrice(item: ExpenseItemDetail): number {
  const unitPrice = toItemAmount(item.unitPrice);
  if (unitPrice > EPSILON) return unitPrice;

  const quantity = getItemQuantity(item);
  const lineTotal = getItemLineTotal(item);
  return quantity > 0 ? lineTotal / quantity : lineTotal;
}

export function dedupePersonIds(personIds: string[]): string[] {
  return Array.from(new Set(personIds.filter(Boolean)));
}

export function hasCustomQuantitySplits(item: ExpenseItemDetail): boolean {
  return Array.isArray(item.quantitySplits) && item.quantitySplits.length > 0;
}

export function normalizeQuantitySplits(
  quantitySplits: ItemQuantitySplit[] | undefined,
  quantity: number
): ItemQuantitySplit[] {
  if (!Array.isArray(quantitySplits)) return [];

  const byUnit = new Map<number, ItemQuantitySplit>();
  quantitySplits.forEach((split) => {
    const unitIndex = Math.floor(Number(split.unitIndex));
    if (!Number.isFinite(unitIndex) || unitIndex < 0 || unitIndex >= quantity) return;
    byUnit.set(unitIndex, {
      unitIndex,
      sharedBy: dedupePersonIds(split.sharedBy || []),
    });
  });

  return Array.from(byUnit.values()).sort((a, b) => a.unitIndex - b.unitIndex);
}

export function createQuantitySplits(
  quantity: number,
  sharedBy: string[]
): ItemQuantitySplit[] {
  const normalizedQuantity = normalizeItemQuantityValue(quantity);
  const normalizedSharedBy = dedupePersonIds(sharedBy);
  return Array.from({ length: normalizedQuantity }, (_, unitIndex) => ({
    unitIndex,
    sharedBy: [...normalizedSharedBy],
  }));
}

export function resizeQuantitySplits(
  quantitySplits: ItemQuantitySplit[] | undefined,
  quantity: number,
  fallbackSharedBy: string[]
): ItemQuantitySplit[] | undefined {
  if (!Array.isArray(quantitySplits) || quantitySplits.length === 0) {
    return undefined;
  }

  const normalizedQuantity = normalizeItemQuantityValue(quantity);
  const normalizedExisting = normalizeQuantitySplits(quantitySplits, normalizedQuantity);
  const byUnit = new Map(normalizedExisting.map((split) => [split.unitIndex, split]));
  const fallback = dedupePersonIds(fallbackSharedBy);

  return Array.from({ length: normalizedQuantity }, (_, unitIndex) => {
    const existing = byUnit.get(unitIndex);
    return {
      unitIndex,
      sharedBy: existing ? [...existing.sharedBy] : [...fallback],
    };
  });
}

export function getItemUnitSharing(item: ExpenseItemDetail): ItemUnitSharing[] {
  const quantity = getItemQuantity(item);
  const fallbackSharedBy = dedupePersonIds(item.sharedBy || []);

  if (!hasCustomQuantitySplits(item)) {
    return Array.from({ length: quantity }, (_, unitIndex) => ({
      unitIndex,
      sharedBy: [...fallbackSharedBy],
    }));
  }

  const splits = normalizeQuantitySplits(item.quantitySplits, quantity);
  const splitByUnit = new Map(splits.map((split) => [split.unitIndex, split.sharedBy]));

  return Array.from({ length: quantity }, (_, unitIndex) => {
    const sharedBy = splitByUnit.get(unitIndex);
    return {
      unitIndex,
      sharedBy: sharedBy && sharedBy.length > 0 ? [...sharedBy] : [...fallbackSharedBy],
    };
  });
}

export function getItemParticipantIds(item: ExpenseItemDetail): string[] {
  return dedupePersonIds(getItemUnitSharing(item).flatMap((unit) => unit.sharedBy));
}

export function normalizeExpenseItemForStorage(
  item: ExpenseItemDetail,
  defaultItemCategory: string
): ExpenseItemDetail {
  const quantity = getItemQuantity(item);
  const lineTotal = roundItemAmount(getItemLineTotal(item));
  const unitPrice = roundItemAmount(quantity > 0 ? lineTotal / quantity : lineTotal);
  const unitSharing = getItemUnitSharing(item);
  const sharedBy = dedupePersonIds(unitSharing.flatMap((unit) => unit.sharedBy));
  const quantitySplits = hasCustomQuantitySplits(item)
    ? unitSharing.map((unit) => ({
        unitIndex: unit.unitIndex,
        sharedBy: dedupePersonIds(unit.sharedBy),
      }))
    : undefined;

  return {
    id: item.id,
    name: item.name.trim(),
    price: lineTotal,
    sharedBy,
    categoryName: item.categoryName || defaultItemCategory,
    quantity,
    unitPrice,
    ...(quantitySplits ? { quantitySplits } : {}),
  };
}

export function calculateItemwiseSplit(
  items: ExpenseItemDetail[],
  amountToSplit: number
): ItemwiseSplitCalculation {
  const totalOriginalItems = items.reduce(
    (sum, item) => sum + getItemLineTotal(item),
    0
  );

  const reductionFactor =
    totalOriginalItems > EPSILON && amountToSplit >= 0
      ? amountToSplit / totalOriginalItems
      : totalOriginalItems === 0 && amountToSplit === 0
        ? 1
        : 0;

  const personBreakdown: PersonAggregatedItemShares = {};

  items.forEach((item, itemIndex) => {
    const lineTotal = getItemLineTotal(item);
    if (lineTotal <= EPSILON) return;

    const quantity = getItemQuantity(item);
    const unitOriginalPrice = lineTotal / quantity;
    const unitAdjustedPrice = unitOriginalPrice * reductionFactor;
    const unitSharing = getItemUnitSharing(item);
    const itemId = item.id || `item-${itemIndex}`;

    unitSharing.forEach((unit) => {
      if (unit.sharedBy.length === 0) return;

      const shareForPerson = unitAdjustedPrice / unit.sharedBy.length;
      unit.sharedBy.forEach((personId) => {
        if (!personBreakdown[personId]) {
          personBreakdown[personId] = {
            items: [],
            totalShareOfAdjustedItems: 0,
          };
        }

        const personData = personBreakdown[personId];
        let detail = personData.items.find(
          (entry) => entry.itemId === itemId && entry.itemCategoryName === item.categoryName
        );

        if (!detail) {
          detail = {
            itemId,
            itemName: item.name,
            originalItemPrice: 0,
            adjustedItemPriceForSplit: 0,
            shareForPerson: 0,
            sharedByCount: unit.sharedBy.length,
            itemCategoryName: item.categoryName,
            quantity,
            quantityShared: 0,
            unitPrice: unitOriginalPrice,
            unitIndexes: [],
          };
          personData.items.push(detail);
        }

        detail.originalItemPrice += unitOriginalPrice;
        detail.adjustedItemPriceForSplit += unitAdjustedPrice;
        detail.shareForPerson += shareForPerson;
        detail.sharedByCount = Math.max(detail.sharedByCount, unit.sharedBy.length);
        detail.quantityShared = (detail.quantityShared || 0) + 1;
        detail.unitIndexes = [...(detail.unitIndexes || []), unit.unitIndex];
        personData.totalShareOfAdjustedItems += shareForPerson;
      });
    });
  });

  const shares = Object.entries(personBreakdown).map(([personId, data]) => ({
    personId,
    amount: Math.max(0, data.totalShareOfAdjustedItems),
  }));

  return {
    shares,
    personBreakdown,
    totalOriginalItems,
    reductionFactor,
  };
}
