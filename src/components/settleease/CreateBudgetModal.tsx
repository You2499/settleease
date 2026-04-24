"use client";

import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Calculator,
  Loader2,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  BudgetFees,
  BudgetItem,
  Category,
  SelectedBudgetLine,
  UserRole,
} from "@/lib/settleease/types";

const ALL_CATEGORIES_VALUE = "__all__";
const UNCATEGORIZED_CATEGORY = "Uncategorized";

interface CreateBudgetModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  getCategoryIconFromName: (
    categoryName: string
  ) => React.FC<React.SVGProps<SVGSVGElement>>;
  userRole: UserRole;
}

function toNonNegativeNumber(value: string) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function makeCustomLineId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CreateBudgetModal({
  isOpen,
  onOpenChange,
  categories,
  getCategoryIconFromName,
  userRole,
}: CreateBudgetModalProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_VALUE);
  const [selectedLines, setSelectedLines] = useState<SelectedBudgetLine[]>([]);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customCategory, setCustomCategory] = useState(UNCATEGORIZED_CATEGORY);
  const [saveCustomToCatalog, setSaveCustomToCatalog] = useState(false);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [fees, setFees] = useState<BudgetFees>({
    tax_percent: "",
    service_percent: "",
    other_charge: "",
    discount: "",
  });

  const isAdmin = userRole === "admin";
  const categoryOptions = useMemo(() => {
    const names = categories.map((category) => category.name);
    if (!names.includes(UNCATEGORIZED_CATEGORY)) {
      names.push(UNCATEGORIZED_CATEGORY);
    }
    return names;
  }, [categories]);

  useEffect(() => {
    if (isOpen && !categoryOptions.includes(customCategory)) {
      setCustomCategory(categoryOptions[0] ?? UNCATEGORIZED_CATEGORY);
    }
  }, [categoryOptions, customCategory, isOpen]);

  useEffect(() => {
    if (!isAdmin && saveCustomToCatalog) {
      setSaveCustomToCatalog(false);
    }
  }, [isAdmin, saveCustomToCatalog]);

  const budgetItems = useQuery(
    api.app.listBudgetItems,
    isOpen
      ? {
          search: deferredSearch.trim(),
          categoryName:
            categoryFilter === ALL_CATEGORIES_VALUE ? null : categoryFilter,
          limit: 80,
        }
      : "skip"
  ) as BudgetItem[] | undefined;
  const upsertCustomBudgetItem = useMutation(api.app.upsertCustomBudgetItem);
  const backfillBudgetItemsFromExpenses = useMutation(
    api.app.backfillBudgetItemsFromExpenses
  );

  const totals = useMemo(() => {
    const subtotal = roundMoney(
      selectedLines.reduce(
        (sum, line) => sum + line.unit_price * line.quantity,
        0
      )
    );
    const taxAmount = roundMoney(
      subtotal * (toNonNegativeNumber(fees.tax_percent) / 100)
    );
    const serviceAmount = roundMoney(
      subtotal * (toNonNegativeNumber(fees.service_percent) / 100)
    );
    const otherCharge = roundMoney(toNonNegativeNumber(fees.other_charge));
    const discount = roundMoney(toNonNegativeNumber(fees.discount));
    const finalTotal = roundMoney(
      Math.max(0, subtotal + taxAmount + serviceAmount + otherCharge - discount)
    );

    return {
      subtotal,
      taxAmount,
      serviceAmount,
      otherCharge,
      discount,
      finalTotal,
    };
  }, [fees, selectedLines]);

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find((entry) => entry.name === categoryName);
    return getCategoryIconFromName(category?.icon_name || "") || Settings2;
  };

  const addCatalogItem = (item: BudgetItem) => {
    setSelectedLines((current) => {
      const existingLine = current.find((line) => line.budget_item_id === item.id);
      if (existingLine) {
        return current.map((line) =>
          line.id === existingLine.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }

      return [
        ...current,
        {
          id: `catalog-${item.id}`,
          budget_item_id: item.id,
          name: item.name,
          category_name: item.category_name,
          unit_price: Number(item.default_price),
          quantity: 1,
          source: "catalog",
        },
      ];
    });
  };

  const updateLineQuantity = (lineId: string, delta: number) => {
    setSelectedLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? { ...line, quantity: Math.max(1, line.quantity + delta) }
          : line
      )
    );
  };

  const removeLine = (lineId: string) => {
    setSelectedLines((current) => current.filter((line) => line.id !== lineId));
  };

  const clearEstimate = () => {
    setSelectedLines([]);
    setFees({
      tax_percent: "",
      service_percent: "",
      other_charge: "",
      discount: "",
    });
  };

  const handleFeeChange = (field: keyof BudgetFees, value: string) => {
    setFees((current) => ({ ...current, [field]: value }));
  };

  const handleAddCustomItem = async () => {
    const name = customName.trim().replace(/\s+/g, " ");
    const price = toNonNegativeNumber(customPrice);

    if (!name || price <= 0) {
      toast({
        title: "Custom item needs details",
        description: "Add a name and a positive price.",
        variant: "destructive",
      });
      return;
    }

    let savedItem: BudgetItem | null = null;
    if (isAdmin && saveCustomToCatalog) {
      setIsSavingCustom(true);
      try {
        savedItem = (await upsertCustomBudgetItem({
          name,
          categoryName: customCategory,
          price,
        })) as BudgetItem;
        toast({
          title: "Budget item saved",
          description: `${name} is available in the catalog.`,
        });
      } catch (error: any) {
        toast({
          title: "Save failed",
          description: error?.message || "Could not save the budget item.",
          variant: "destructive",
        });
        setIsSavingCustom(false);
        return;
      }
      setIsSavingCustom(false);
    }

    setSelectedLines((current) => [
      ...current,
      {
        id: savedItem ? `catalog-${savedItem.id}` : makeCustomLineId(),
        budget_item_id: savedItem?.id,
        name,
        category_name: customCategory,
        unit_price: price,
        quantity: 1,
        source: savedItem ? "catalog" : "custom",
      },
    ]);
    setCustomName("");
    setCustomPrice("");
  };

  const handleSyncExistingPrices = async () => {
    if (!isAdmin || isBackfilling) return;

    setIsBackfilling(true);
    try {
      const result = (await backfillBudgetItemsFromExpenses({
        dryRun: false,
      })) as {
        validObservationCount: number;
        rowsToInsert: number;
        rowsToUpdate: number;
      };
      toast({
        title: "Budget catalog synced",
        description: `${result.validObservationCount} item prices merged into ${result.rowsToInsert + result.rowsToUpdate} catalog rows.`,
      });
    } catch (error: any) {
      toast({
        title: "Sync failed",
        description: error?.message || "Could not sync existing item prices.",
        variant: "destructive",
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  const renderCatalogItem = (item: BudgetItem) => {
    const CategoryIcon = getCategoryIcon(item.category_name);
    const observationCount =
      item.historical_observation_count + item.custom_observation_count;
    const hasRange = Math.abs(item.max_price - item.min_price) > 0.009;

    return (
      <div
        key={item.id}
        className="rounded-md border bg-background p-3 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CategoryIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="truncate text-sm font-semibold" title={item.name}>
                {item.name}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="rounded-md">
                {item.category_name}
              </Badge>
              <span>{observationCount} seen</span>
              <span>Latest {formatCurrency(item.latest_price)}</span>
              {hasRange && (
                <span>
                  {formatCurrency(item.min_price)}-{formatCurrency(item.max_price)}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold text-primary">
              {formatCurrency(item.default_price)}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 h-8 rounded-md px-2 text-xs"
              onClick={() => addCatalogItem(item)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[96vw] overflow-hidden p-0 sm:max-w-6xl">
        <div className="flex max-h-[90vh] min-h-0 flex-col">
          <DialogHeader className="border-b px-4 pb-3 pt-4 sm:px-6">
            <DialogTitle className="flex items-center text-xl text-primary sm:text-2xl">
              <Calculator className="mr-2 h-5 w-5" />
              Create Your Budget
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="flex items-center text-lg font-semibold tracking-normal sm:text-xl">
                        <ReceiptText className="mr-2 h-4 w-4 text-muted-foreground" />
                        Item Catalog
                      </CardTitle>
                      {isAdmin && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-md px-2 text-xs"
                          onClick={handleSyncExistingPrices}
                          disabled={isBackfilling}
                        >
                          {isBackfilling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Sync Prices
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search items"
                          className="pl-9"
                        />
                      </div>
                      <Select
                        value={categoryFilter}
                        onValueChange={setCategoryFilter}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_CATEGORIES_VALUE}>
                            All categories
                          </SelectItem>
                          {categoryOptions.map((categoryName) => (
                            <SelectItem key={categoryName} value={categoryName}>
                              {categoryName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <ScrollArea className="h-[360px] rounded-md border bg-muted/20 p-2">
                      <div className="space-y-2 pr-2">
                        {budgetItems === undefined && (
                          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading catalog
                          </div>
                        )}
                        {budgetItems &&
                          budgetItems.length > 0 &&
                          budgetItems.map(renderCatalogItem)}
                        {budgetItems && budgetItems.length === 0 && (
                          <div className="flex h-40 items-center justify-center rounded-md bg-background text-center text-sm text-muted-foreground">
                            No catalog items found.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex items-center text-lg font-semibold tracking-normal sm:text-xl">
                      <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                      Custom Item
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                      <div>
                        <Label className="mb-1.5 block text-xs text-muted-foreground">
                          Name
                        </Label>
                        <Input
                          value={customName}
                          onChange={(event) => setCustomName(event.target.value)}
                          placeholder="Item name"
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs text-muted-foreground">
                          Price
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={customPrice}
                          onChange={(event) =>
                            setCustomPrice(event.target.value)
                          }
                          placeholder="0.00"
                          className="text-right font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <div>
                        <Label className="mb-1.5 block text-xs text-muted-foreground">
                          Category
                        </Label>
                        <Select
                          value={customCategory}
                          onValueChange={setCustomCategory}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map((categoryName) => (
                              <SelectItem key={categoryName} value={categoryName}>
                                {categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        className="h-10 rounded-md px-3"
                        onClick={handleAddCustomItem}
                        disabled={isSavingCustom}
                      >
                        {isSavingCustom ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : saveCustomToCatalog && isAdmin ? (
                          <Save className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Add Item
                      </Button>
                    </div>
                    {isAdmin && (
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                        <Checkbox
                          checked={saveCustomToCatalog}
                          onCheckedChange={(checked) =>
                            setSaveCustomToCatalog(checked === true)
                          }
                        />
                        <span>Save to catalog</span>
                      </label>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex items-center justify-between gap-3 text-lg font-semibold tracking-normal sm:text-xl">
                      <span className="flex items-center">
                        <Calculator className="mr-2 h-4 w-4 text-muted-foreground" />
                        Estimate
                      </span>
                      {selectedLines.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-md px-2 text-xs"
                          onClick={clearEstimate}
                        >
                          Clear
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <ScrollArea className="h-[250px] rounded-md border bg-muted/20 p-2">
                      <div className="space-y-2 pr-2">
                        {selectedLines.length === 0 && (
                          <div className="flex h-32 items-center justify-center rounded-md bg-background text-center text-sm text-muted-foreground">
                            Select items to start estimating.
                          </div>
                        )}
                        {selectedLines.map((line) => {
                          const CategoryIcon = getCategoryIcon(line.category_name);
                          return (
                            <div
                              key={line.id}
                              className="rounded-md border bg-background p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <CategoryIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <p
                                      className="truncate text-sm font-semibold"
                                      title={line.name}
                                    >
                                      {line.name}
                                    </p>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatCurrency(line.unit_price)} each
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="font-bold text-primary">
                                    {formatCurrency(
                                      line.unit_price * line.quantity
                                    )}
                                  </p>
                                  <div className="mt-2 flex items-center justify-end gap-1">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="h-7 w-7 rounded-md"
                                      onClick={() =>
                                        updateLineQuantity(line.id, -1)
                                      }
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </Button>
                                    <span className="grid h-7 min-w-8 place-items-center rounded-md border bg-muted/30 px-2 text-xs font-semibold">
                                      {line.quantity}
                                    </span>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="h-7 w-7 rounded-md"
                                      onClick={() =>
                                        updateLineQuantity(line.id, 1)
                                      }
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 rounded-md text-destructive"
                                      onClick={() => removeLine(line.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex items-center text-lg font-semibold tracking-normal sm:text-xl">
                      <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                      Fees
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 pt-0 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block text-xs text-muted-foreground">
                        Tax %
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={fees.tax_percent}
                        onChange={(event) =>
                          handleFeeChange("tax_percent", event.target.value)
                        }
                        placeholder="0"
                        className="text-right font-mono"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs text-muted-foreground">
                        Service %
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={fees.service_percent}
                        onChange={(event) =>
                          handleFeeChange("service_percent", event.target.value)
                        }
                        placeholder="0"
                        className="text-right font-mono"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs text-muted-foreground">
                        Other charge
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={fees.other_charge}
                        onChange={(event) =>
                          handleFeeChange("other_charge", event.target.value)
                        }
                        placeholder="0.00"
                        className="text-right font-mono"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs text-muted-foreground">
                        Discount
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={fees.discount}
                        onChange={(event) =>
                          handleFeeChange("discount", event.target.value)
                        }
                        placeholder="0.00"
                        className="text-right font-mono"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">
                        {formatCurrency(totals.subtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(totals.taxAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Service</span>
                      <span>{formatCurrency(totals.serviceAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Other</span>
                      <span>{formatCurrency(totals.otherCharge)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span>-{formatCurrency(totals.discount)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          Rough final bill
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {formatCurrency(totals.finalTotal)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
