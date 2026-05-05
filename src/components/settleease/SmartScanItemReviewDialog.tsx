"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  HeartPulse,
  ReceiptText,
  Split,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  Category as DynamicCategory,
  Expense,
  ExpenseItemDetail,
} from "@/lib/settleease/types";
import {
  getItemLineTotal,
  getItemQuantity,
  getItemUnitPrice,
  normalizeItemQuantityValue,
  roundItemAmount,
  toItemAmount,
} from "@/lib/settleease/itemwiseCalculations";
import { formatCurrency } from "@/lib/settleease/utils";
import SettleEaseDialog from "./SettleEaseDialog";

interface SmartScanItemReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ExpenseItemDetail[];
  onItemsChange: (items: ExpenseItemDetail[]) => void;
  splitMethod: Extract<Expense["split_method"], "equal" | "unequal">;
  totalAmount: number;
  dynamicCategories: DynamicCategory[];
  isSaving: boolean;
  onConfirm: () => void | Promise<void>;
}

function getUnitPriceInputValue(item: ExpenseItemDetail) {
  if (item.unitPrice !== undefined && item.unitPrice !== null) {
    return String(item.unitPrice);
  }

  const lineTotal = getItemLineTotal(item);
  if (lineTotal <= 0) return "";
  return String(roundItemAmount(getItemUnitPrice(item)));
}

function splitMethodLabel(splitMethod: SmartScanItemReviewDialogProps["splitMethod"]) {
  return splitMethod === "equal" ? "Equal split" : "Unequal split";
}

export default function SmartScanItemReviewDialog({
  open,
  onOpenChange,
  items,
  onItemsChange,
  splitMethod,
  totalAmount,
  dynamicCategories,
  isSaving,
  onConfirm,
}: SmartScanItemReviewDialogProps) {
  const summary = useMemo(() => {
    const itemSubtotal = items.reduce((sum, item) => sum + getItemLineTotal(item), 0);
    const invalidRows = items
      .map((item, index) => {
        const missing: string[] = [];
        if (!item.name.trim()) missing.push("name");
        if (!item.categoryName) missing.push("category");
        if (getItemLineTotal(item) <= 0) missing.push("amount");
        return missing.length > 0 ? { index, missing } : null;
      })
      .filter(Boolean) as { index: number; missing: string[] }[];
    const rowsWithCategory = items.filter((item) => !!item.categoryName).length;

    return {
      itemSubtotal,
      invalidRows,
      rowsWithCategory,
      subtotalMismatch: Math.abs(itemSubtotal - totalAmount) > 0.01,
      canConfirm: items.length > 0 && invalidRows.length === 0,
    };
  }, [items, totalAmount]);

  const updateItem = (index: number, patch: Partial<ExpenseItemDetail>) => {
    onItemsChange(items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  };

  const updateQuantity = (index: number, value: string) => {
    const item = items[index];
    if (!item) return;
    const quantity = normalizeItemQuantityValue(value);
    const unitPrice = toItemAmount(getUnitPriceInputValue(item));
    updateItem(index, {
      quantity,
      price: unitPrice > 0 ? roundItemAmount(unitPrice * quantity).toFixed(2) : "",
    });
  };

  const updateUnitPrice = (index: number, value: string) => {
    const item = items[index];
    if (!item) return;
    const quantity = getItemQuantity(item);
    const unitPrice = toItemAmount(value);
    updateItem(index, {
      unitPrice: value,
      price: unitPrice > 0 ? roundItemAmount(unitPrice * quantity).toFixed(2) : "",
    });
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <SettleEaseDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col">
        <DialogHeader className="border-b bg-[#f7f6f3]/80 px-5 pb-4 pt-5 text-left dark:bg-muted/30 sm:px-7 sm:pt-6">
          <div className="flex min-w-0 items-start gap-3 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border/70 bg-background/90 shadow-sm">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-2xl font-light leading-tight tracking-normal sm:text-3xl">
                Review item metadata
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl text-sm leading-6">
                Settlement stays on {splitMethodLabel(splitMethod).toLowerCase()}. These item names, prices, and categories power Health and Analytics.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border bg-background p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">Bill total</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="rounded-2xl border bg-background p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">Item subtotal</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(summary.itemSubtotal)}</p>
            </div>
            <div className="rounded-2xl border bg-background p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">Split method</p>
              <p className="mt-1 text-lg font-semibold">{splitMethodLabel(splitMethod)}</p>
            </div>
            <div className="rounded-2xl border bg-background p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">Category coverage</p>
              <p className="mt-1 text-lg font-semibold">
                {summary.rowsWithCategory}/{items.length || 0}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-background/80 text-foreground">
                  <Split className="h-4 w-4" />
                </div>
                <p className="leading-6">
                  Item metadata will not change who owes what. Health and Analytics normalize these rows to the final bill total if the extracted subtotal differs.
                </p>
              </div>
            </div>

            {(summary.invalidRows.length > 0 || summary.subtotalMismatch) && (
              <div
                className={cn(
                  "rounded-2xl border p-3 text-sm",
                  summary.invalidRows.length > 0
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
                )}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1 leading-6">
                    {summary.invalidRows.length > 0 && (
                      <p>
                        Fix rows with missing name, category, or amount before saving.
                      </p>
                    )}
                    {summary.subtotalMismatch && (
                      <p>
                        Item subtotal does not match the bill total. This is allowed; Health and Analytics will normalize the item amounts.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border bg-card/40 shadow-sm">
            <div className="hidden grid-cols-[minmax(180px,1.4fr)_minmax(150px,1fr)_110px_130px_120px_44px] gap-3 border-b bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground md:grid">
              <span>Item</span>
              <span>Category</span>
              <span>Quantity</span>
              <span>Unit price</span>
              <span className="text-right">Line total</span>
              <span />
            </div>

            <div className="divide-y">
              {items.map((item, index) => {
                const itemTotal = getItemLineTotal(item);
                const rowInvalid = !item.name.trim() || !item.categoryName || itemTotal <= 0;

                return (
                  <div
                    key={item.id || index}
                    className={cn(
                      "grid gap-3 bg-background/70 p-4 md:grid-cols-[minmax(180px,1.4fr)_minmax(150px,1fr)_110px_130px_120px_44px] md:items-end",
                      rowInvalid && "bg-destructive/5"
                    )}
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground md:hidden">Item</Label>
                      <Input
                        value={item.name}
                        onChange={(event) => updateItem(index, { name: event.target.value })}
                        className="h-10 rounded-full bg-background"
                        placeholder="Item name"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground md:hidden">Category</Label>
                      <Select
                        value={item.categoryName || ""}
                        onValueChange={(value) => updateItem(index, { categoryName: value })}
                      >
                        <SelectTrigger className="h-10 rounded-full bg-background">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {dynamicCategories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground md:hidden">Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={getItemQuantity(item)}
                        onChange={(event) => updateQuantity(index, event.target.value)}
                        className="h-10 rounded-full bg-background text-right font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground md:hidden">Unit price</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={getUnitPriceInputValue(item)}
                        onChange={(event) => updateUnitPrice(index, event.target.value)}
                        className="h-10 rounded-full bg-background text-right font-mono"
                      />
                    </div>

                    <div className="flex h-10 items-center justify-between rounded-full border bg-muted/30 px-3 text-sm font-semibold md:justify-end">
                      <span className="text-xs text-muted-foreground md:hidden">Line total</span>
                      <span>{formatCurrency(itemTotal)}</span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full text-destructive"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-2xl border bg-background p-3">
              <HeartPulse className="mt-0.5 h-4 w-4 text-foreground" />
              <span>Health will read food and alcohol rows with their verified categories.</span>
            </div>
            <div className="flex items-start gap-2 rounded-2xl border bg-background p-3">
              <BarChart3 className="mt-0.5 h-4 w-4 text-foreground" />
              <span>Analytics will use these item rows for category breakdowns and trends.</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t bg-background/95 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <span>Settlement remains controlled by the selected {splitMethodLabel(splitMethod).toLowerCase()}.</span>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-5"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Back to expense
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full bg-foreground px-5 text-background hover:bg-foreground/90"
              onClick={onConfirm}
              disabled={!summary.canConfirm || isSaving}
            >
              {isSaving ? "Saving..." : "Save Expense With Item Details"}
            </Button>
          </div>
        </div>
      </div>
    </SettleEaseDialog>
  );
}
