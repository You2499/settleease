"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ListTree,
  Minus,
  Plus,
  PlusCircle,
  Settings2,
  ShoppingCart,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import {
  getItemLineTotal,
  getItemQuantity,
  getItemUnitPrice,
  getItemUnitSharing,
  hasCustomQuantitySplits,
  normalizeItemQuantityValue,
  resizeQuantitySplits,
  roundItemAmount,
  toItemAmount,
} from "@/lib/settleease/itemwiseCalculations";
import * as LucideIcons from "lucide-react";
import type {
  Person,
  ExpenseItemDetail,
  Category as DynamicCategory,
} from "@/lib/settleease/types";

interface ItemwiseSplitSectionProps {
  items: ExpenseItemDetail[];
  people: Person[];
  dynamicCategories: DynamicCategory[];
  handleItemChange: <K extends keyof ExpenseItemDetail>(
    index: number,
    field: K,
    value: ExpenseItemDetail[K]
  ) => void;
  handleItemSharedByChange: (itemIndex: number, personId: string) => void;
  handleToggleQuantitySplits: (itemIndex: number, enabled: boolean) => void;
  handleItemQuantitySplitChange: (
    itemIndex: number,
    unitIndex: number,
    personId: string
  ) => void;
  removeItem: (index: number) => void;
  addItem: () => void;
}

function getUnitPriceInputValue(item: ExpenseItemDetail) {
  if (item.unitPrice !== undefined && item.unitPrice !== null) {
    return String(item.unitPrice);
  }

  const lineTotal = getItemLineTotal(item);
  if (lineTotal <= 0) return "";
  return String(roundItemAmount(getItemUnitPrice(item)));
}

function ParticipantToggle({
  id,
  personName,
  checked,
  onChange,
}: {
  id: string;
  personName: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <Label
      htmlFor={id}
      className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border p-2 text-xs font-medium transition-all ${
        checked ? "border-primary/30 bg-primary/5" : "border-border bg-card/50"
      }`}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="h-4 w-4 shrink-0"
      />
      <span className="min-w-0 flex-1 truncate">{personName}</span>
    </Label>
  );
}

export default function ItemwiseSplitSection({
  items,
  people,
  dynamicCategories,
  handleItemChange,
  handleItemSharedByChange,
  handleToggleQuantitySplits,
  handleItemQuantitySplitChange,
  removeItem,
  addItem,
}: ItemwiseSplitSectionProps) {
  const totalItemsPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + getItemLineTotal(item), 0);
  }, [items]);

  const handleSelectAllForItem = (itemIndex: number) => {
    people.forEach((person) => {
      if (!items[itemIndex].sharedBy.includes(person.id)) {
        handleItemSharedByChange(itemIndex, person.id);
      }
    });
  };

  const handleDeselectAllForItem = (itemIndex: number) => {
    items[itemIndex].sharedBy.forEach((personId) => {
      handleItemSharedByChange(itemIndex, personId);
    });
  };

  const handleUnitPriceChange = (
    itemIndex: number,
    item: ExpenseItemDetail,
    value: string
  ) => {
    const quantity = getItemQuantity(item);
    const unitPrice = toItemAmount(value);
    handleItemChange(itemIndex, "unitPrice", value);
    handleItemChange(
      itemIndex,
      "price",
      unitPrice > 0 ? roundItemAmount(unitPrice * quantity).toFixed(2) : ""
    );
  };

  const handleQuantityChange = (
    itemIndex: number,
    item: ExpenseItemDetail,
    value: number | string
  ) => {
    const quantity = normalizeItemQuantityValue(value);
    const unitPrice = toItemAmount(getUnitPriceInputValue(item));
    handleItemChange(itemIndex, "quantity", quantity);
    handleItemChange(
      itemIndex,
      "price",
      unitPrice > 0 ? roundItemAmount(unitPrice * quantity).toFixed(2) : ""
    );

    const resizedSplits = resizeQuantitySplits(
      item.quantitySplits,
      quantity,
      item.sharedBy
    );
    if (resizedSplits) {
      handleItemChange(itemIndex, "quantitySplits", resizedSplits);
    }
  };

  return (
    <Card className="mt-3 bg-card/50 p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="h-4 w-4 text-primary" />
          Add items and select who shared each
        </Label>
        {totalItemsPrice > 0 && (
          <div className="text-sm font-semibold text-muted-foreground">
            Total:{" "}
            <span className="text-foreground">
              {formatCurrency(totalItemsPrice)}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {items.map((item, itemIndex) => {
          const allSelected =
            people.length > 0 && item.sharedBy.length === people.length;
          const noneSelected = item.sharedBy.length === 0;
          const quantity = getItemQuantity(item);
          const unitPrice = getItemUnitPrice(item);
          const itemTotal = getItemLineTotal(item);
          const customQuantitySplits =
            quantity > 1 && hasCustomQuantitySplits(item);

          return (
            <Card
              key={item.id}
              className="border-2 border-border bg-background p-4 transition-all"
            >
              <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <div className="min-w-0 space-y-3">
                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Item Name
                    </Label>
                    <Input
                      value={item.name}
                      onChange={(e) =>
                        handleItemChange(itemIndex, "name", e.target.value)
                      }
                      placeholder="e.g., Pizza, Drinks, etc."
                      className="h-10 w-full"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_150px_150px]">
                    <div>
                      <Label className="mb-1.5 block text-xs text-muted-foreground">
                        Unit Price
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        pattern="[0-9]*\\.?[0-9]*"
                        value={getUnitPriceInputValue(item)}
                        onChange={(e) =>
                          handleUnitPriceChange(itemIndex, item, e.target.value)
                        }
                        placeholder="0.00"
                        className="h-10 w-full text-right font-mono"
                      />
                    </div>

                    <div>
                      <Label className="mb-1.5 block text-xs text-muted-foreground">
                        Quantity
                      </Label>
                      <div className="grid h-10 grid-cols-[40px_minmax(0,1fr)_40px] overflow-hidden rounded-md border bg-background">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 rounded-none"
                          onClick={() =>
                            handleQuantityChange(
                              itemIndex,
                              item,
                              Math.max(1, quantity - 1)
                            )
                          }
                          disabled={quantity <= 1}
                          aria-label={`Decrease quantity for item ${itemIndex + 1}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              itemIndex,
                              item,
                              e.target.value
                            )
                          }
                          className="h-10 rounded-none border-0 text-center font-semibold shadow-none focus-visible:ring-0"
                          aria-label={`Quantity for item ${itemIndex + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 rounded-none"
                          onClick={() =>
                            handleQuantityChange(itemIndex, item, quantity + 1)
                          }
                          aria-label={`Increase quantity for item ${itemIndex + 1}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-1.5 block text-xs text-muted-foreground">
                        Line Total
                      </Label>
                      <div className="flex h-10 items-center justify-end rounded-md border bg-muted/40 px-3 font-mono text-sm font-semibold">
                        {formatCurrency(itemTotal)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Category
                    </Label>
                    <Select
                      value={item.categoryName || ""}
                      onValueChange={(value) =>
                        handleItemChange(itemIndex, "categoryName", value)
                      }
                      disabled={dynamicCategories.length === 0}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicCategories.map((cat) => {
                          const IconComponent =
                            (LucideIcons as any)[cat.icon_name] || Settings2;
                          return (
                            <SelectItem key={cat.id} value={cat.name}>
                              <div className="flex items-center">
                                <IconComponent className="mr-2 h-4 w-4" />
                                {cat.name}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(itemIndex)}
                  className="h-10 w-10 shrink-0 text-destructive"
                  disabled={items.length <= 1}
                  aria-label={`Remove item ${itemIndex + 1}`}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>

              <div className="border-t pt-3">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {customQuantitySplits ? "Shared by quantity" : "Shared by"}
                    </Label>
                    {itemTotal > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCurrency(unitPrice)} per unit
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {quantity > 1 && (
                      <Button
                        type="button"
                        variant={customQuantitySplits ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          handleToggleQuantitySplits(
                            itemIndex,
                            !customQuantitySplits
                          )
                        }
                        className="h-8 text-xs"
                      >
                        <ListTree className="mr-1 h-3 w-3" />
                        {customQuantitySplits ? "Same split" : "Split units"}
                      </Button>
                    )}

                    {!customQuantitySplits && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectAllForItem(itemIndex)}
                          disabled={allSelected}
                          className="h-8 text-xs"
                        >
                          <UserCheck className="mr-1 h-3 w-3" />
                          All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeselectAllForItem(itemIndex)}
                          disabled={noneSelected}
                          className="h-8 text-xs"
                        >
                          <UserX className="mr-1 h-3 w-3" />
                          None
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {people.length > 0 ? (
                  customQuantitySplits ? (
                    <div className="space-y-3">
                      {getItemUnitSharing(item).map((unit) => (
                        <div
                          key={`${item.id}-unit-${unit.unitIndex}`}
                          className="rounded-lg border bg-card/40 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold">
                              Unit {unit.unitIndex + 1}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {unit.sharedBy.length}{" "}
                              {unit.sharedBy.length === 1 ? "person" : "people"}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {people.map((person) => (
                              <ParticipantToggle
                                key={person.id}
                                id={`item-${itemIndex}-unit-${unit.unitIndex}-person-${person.id}`}
                                personName={person.name}
                                checked={unit.sharedBy.includes(person.id)}
                                onChange={() =>
                                  handleItemQuantitySplitChange(
                                    itemIndex,
                                    unit.unitIndex,
                                    person.id
                                  )
                                }
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {people.map((person) => (
                        <ParticipantToggle
                          key={person.id}
                          id={`item-${itemIndex}-person-${person.id}`}
                          personName={person.name}
                          checked={item.sharedBy.includes(person.id)}
                          onChange={() =>
                            handleItemSharedByChange(itemIndex, person.id)
                          }
                        />
                      ))}
                    </div>
                  )
                ) : (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    No people available
                  </p>
                )}

                {!customQuantitySplits && item.sharedBy.length > 0 && itemTotal > 0 && (
                  <p className="mt-3 border-t pt-2 text-center text-xs text-muted-foreground">
                    {formatCurrency(itemTotal / item.sharedBy.length)} per
                    person ({item.sharedBy.length}{" "}
                    {item.sharedBy.length === 1 ? "person" : "people"})
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="default"
        onClick={addItem}
        className="mt-4 h-11 w-full text-sm font-medium"
      >
        <PlusCircle className="mr-2 h-5 w-5" />
        Add Another Item
      </Button>
    </Card>
  );
}
