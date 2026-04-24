"use client";

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  Sparkles,
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  BUDGET_ITEM_TAX_RATE,
  getBudgetAlcoholVatRate,
  type BudgetVatInputItem,
} from "@/lib/settleease/budgetVat";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  BudgetFees,
  BudgetItem,
  BudgetVatClassification,
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
  const [vatClassifications, setVatClassifications] = useState<
    Record<string, BudgetVatClassification>
  >({});
  const [vatStatus, setVatStatus] = useState<
    "idle" | "loading" | "ai" | "error"
  >("idle");
  const [vatModelName, setVatModelName] = useState("");
  const [vatClassifiedSignature, setVatClassifiedSignature] = useState("");
  const [fees, setFees] = useState<BudgetFees>({
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

  const vatInputItems = useMemo<BudgetVatInputItem[]>(() => {
    return selectedLines.map((line) => ({
      key: line.id,
      name: line.name,
      categoryName: line.category_name,
    }));
  }, [selectedLines]);

  const vatInputSignature = useMemo(
    () => JSON.stringify(vatInputItems),
    [vatInputItems]
  );

  useEffect(() => {
    if (!isOpen || selectedLines.length === 0) {
      setVatClassifications({});
      setVatStatus("idle");
      setVatModelName("");
      setVatClassifiedSignature("");
    }
  }, [isOpen, selectedLines.length]);

  const isTaxCalculationCurrent =
    selectedLines.length > 0 &&
    vatStatus === "ai" &&
    vatClassifiedSignature === vatInputSignature;

  const needsTaxCalculation =
    selectedLines.length > 0 && !isTaxCalculationCurrent;

  const getLineVatClassification = useCallback(
    (line: SelectedBudgetLine) => vatClassifications[line.id] ?? null,
    [vatClassifications]
  );

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxableSubtotal = 0;
    let alcoholSubtotal = 0;
    let alcoholVatAmount = 0;

    selectedLines.forEach((line) => {
      const lineTotal = line.unit_price * line.quantity;
      subtotal += lineTotal;

      if (!isTaxCalculationCurrent) {
        return;
      }

      const classification = getLineVatClassification(line);
      if (!classification) {
        return;
      }

      const vatAmount =
        lineTotal * getBudgetAlcoholVatRate(classification.vat_class);

      if (classification.vat_class === "alcohol") {
        alcoholSubtotal += lineTotal;
        alcoholVatAmount += vatAmount;
      } else {
        taxableSubtotal += lineTotal;
      }
    });

    subtotal = roundMoney(subtotal);
    taxableSubtotal = roundMoney(taxableSubtotal);
    alcoholSubtotal = roundMoney(alcoholSubtotal);
    const taxAmount = roundMoney(taxableSubtotal * BUDGET_ITEM_TAX_RATE);
    alcoholVatAmount = roundMoney(alcoholVatAmount);
    const otherCharge = roundMoney(toNonNegativeNumber(fees.other_charge));
    const discount = roundMoney(toNonNegativeNumber(fees.discount));
    const finalTotal = roundMoney(
      Math.max(
        0,
        subtotal + taxAmount + alcoholVatAmount + otherCharge - discount
      )
    );

    return {
      subtotal,
      taxableSubtotal,
      alcoholSubtotal,
      taxAmount,
      alcoholVatAmount,
      otherCharge,
      discount,
      finalTotal,
    };
  }, [fees, getLineVatClassification, isTaxCalculationCurrent, selectedLines]);

  const taxStatusLabel =
    selectedLines.length === 0
      ? "Add items"
      : vatStatus === "loading"
      ? "AI calculating"
      : isTaxCalculationCurrent
      ? vatModelName || "AI taxes ready"
      : vatStatus === "error"
      ? "AI failed"
      : vatStatus === "ai"
      ? "Needs recalculation"
      : "Calculate taxes";

  const calculateTaxesButtonLabel =
    vatStatus === "loading"
      ? "Calculating"
      : isTaxCalculationCurrent
      ? "Recalculate Taxes"
      : "Calculate Taxes";

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
      other_charge: "",
      discount: "",
    });
  };

  const handleFeeChange = (field: keyof BudgetFees, value: string) => {
    setFees((current) => ({ ...current, [field]: value }));
  };

  const handleCalculateTaxes = useCallback(async () => {
    if (selectedLines.length === 0) {
      toast({
        title: "Add items first",
        description: "Select at least one item before calculating taxes.",
        variant: "destructive",
      });
      return;
    }

    const currentSignature = vatInputSignature;
    const currentItems = vatInputItems;

    setVatStatus("loading");
    setVatModelName("");
    setVatClassifiedSignature("");

    try {
      const response = await fetch("/api/classify-budget-vat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: currentItems }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "AI tax calculation failed.");
      }

      const rows = Array.isArray(data.classifications)
        ? (data.classifications as BudgetVatClassification[])
        : [];
      const expectedKeys = new Set(currentItems.map((item) => item.key));
      const classifiedKeys = new Set(rows.map((row) => row.key));
      const hasEveryItem = currentItems.every((item) =>
        classifiedKeys.has(item.key)
      );

      if (rows.length !== expectedKeys.size || !hasEveryItem) {
        throw new Error("AI did not classify every selected item.");
      }

      setVatClassifications(
        Object.fromEntries(rows.map((row) => [row.key, row]))
      );
      setVatStatus("ai");
      setVatClassifiedSignature(currentSignature);
      setVatModelName(data.modelDisplayName || "");
    } catch (error: any) {
      console.warn("Budget tax calculation failed:", error);
      setVatClassifications({});
      setVatStatus("error");
      setVatModelName("");
      setVatClassifiedSignature("");
      toast({
        title: "Tax calculation failed",
        description:
          error?.message || "AI could not calculate tax and VAT for this estimate.",
        variant: "destructive",
      });
    }
  }, [selectedLines.length, vatInputItems, vatInputSignature]);

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

    setSelectedLines((current) => {
      if (savedItem) {
        const existingLine = current.find(
          (line) => line.budget_item_id === savedItem.id
        );
        if (existingLine) {
          return current.map((line) =>
            line.id === existingLine.id
              ? { ...line, quantity: line.quantity + 1 }
              : line
          );
        }
      }

      return [
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
      ];
    });
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
        className="min-w-0 rounded-md border bg-background p-3 shadow-sm"
      >
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CategoryIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p
                className="min-w-0 break-words text-sm font-semibold leading-snug sm:truncate"
                title={item.name}
              >
                {item.name}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="rounded-md">
                {item.category_name}
              </Badge>
              <span>{observationCount} seen</span>
              <span className="min-w-0 break-words">
                Latest {formatCurrency(item.latest_price)}
              </span>
              {hasRange && (
                <span className="min-w-0 break-words">
                  {formatCurrency(item.min_price)}-{formatCurrency(item.max_price)}
                </span>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:block lg:shrink-0 lg:text-right">
            <p className="min-w-0 break-words text-base font-bold text-primary lg:max-w-40">
              {formatCurrency(item.default_price)}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 rounded-md px-2 text-xs lg:mt-2"
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

  const renderCatalogSkeletonRows = () => (
    <div
      className="min-w-0 space-y-2"
      role="status"
      aria-label="Loading item catalog"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="min-w-0 rounded-md border bg-background p-3 shadow-sm"
        >
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <Skeleton className="h-4 w-3/4 max-w-[260px]" />
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:block lg:shrink-0 lg:text-right">
              <Skeleton className="h-5 w-20 lg:ml-auto" />
              <Skeleton className="h-8 w-14 rounded-md lg:ml-auto lg:mt-2" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading catalog items</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] lg:h-[calc(100dvh-2rem)] lg:max-h-[calc(100dvh-2rem)] lg:max-w-[1400px] xl:max-w-[1500px]">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b px-4 pb-3 pr-14 pt-4 sm:px-6 sm:pr-16">
            <DialogTitle className="flex min-w-0 items-center text-xl text-primary sm:text-2xl">
              <Calculator className="mr-2 h-5 w-5" />
              <span className="min-w-0 truncate">Create Your Budget</span>
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:overflow-hidden">
            <div className="grid min-w-0 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] xl:grid-cols-[minmax(0,1fr)_minmax(430px,520px)]">
              <div className="min-w-0 space-y-4 lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_auto] lg:space-y-0 lg:gap-4">
                <Card className="min-w-0 overflow-hidden lg:flex lg:min-h-0 lg:flex-col">
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="flex min-w-0 items-center text-lg font-semibold tracking-normal sm:text-xl">
                        <ReceiptText className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 truncate">Item Catalog</span>
                      </CardTitle>
                      {isAdmin && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 w-full rounded-md px-2 text-xs sm:w-auto"
                          onClick={handleSyncExistingPrices}
                          disabled={isBackfilling}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          {isBackfilling ? "Syncing" : "Sync Prices"}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3 pt-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="relative min-w-0">
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
                        <SelectTrigger className="h-10 min-w-0">
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

                    <ScrollArea className="h-72 min-w-0 rounded-md border bg-muted/20 p-2 sm:h-80 md:h-96 lg:h-auto lg:min-h-0 lg:flex-1">
                      <div className="min-w-0 space-y-2 pr-1 sm:pr-2">
                        {budgetItems === undefined && renderCatalogSkeletonRows()}
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

                <Card className="min-w-0 overflow-hidden">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex min-w-0 items-center text-lg font-semibold tracking-normal sm:text-xl">
                      <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 truncate">Custom Item</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3 pt-0">
                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-muted-foreground">
                          Name
                        </Label>
                        <Input
                          value={customName}
                          onChange={(event) => setCustomName(event.target.value)}
                          placeholder="Item name"
                          className="min-w-0"
                        />
                      </div>
                      <div className="min-w-0">
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
                          className="min-w-0 text-right font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-muted-foreground">
                          Category
                        </Label>
                        <Select
                          value={customCategory}
                          onValueChange={setCustomCategory}
                        >
                          <SelectTrigger className="h-10 min-w-0">
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
                        className="h-10 w-full rounded-md px-3 md:w-auto"
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
                      <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
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

              <div className="min-w-0 space-y-4 lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_auto_auto] lg:space-y-0 lg:gap-4">
                <Card className="min-w-0 overflow-hidden lg:flex lg:min-h-0 lg:flex-col">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex min-w-0 items-center justify-between gap-3 text-lg font-semibold tracking-normal sm:text-xl">
                      <span className="flex min-w-0 items-center">
                        <Calculator className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 truncate">Estimate</span>
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
                  <CardContent className="min-w-0 space-y-3 pt-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                    <ScrollArea className="h-64 min-w-0 rounded-md border bg-muted/20 p-2 sm:h-72 lg:h-auto lg:min-h-0 lg:flex-1">
                      <div className="min-w-0 space-y-2 pr-1 sm:pr-2">
                        {selectedLines.length === 0 && (
                          <div className="flex h-32 items-center justify-center rounded-md bg-background text-center text-sm text-muted-foreground">
                            Select items to start estimating.
                          </div>
                        )}
                        {selectedLines.map((line) => {
                          const CategoryIcon = getCategoryIcon(line.category_name);
                          const vatClassification = isTaxCalculationCurrent
                            ? getLineVatClassification(line)
                            : null;
                          const hasAlcoholVat =
                            vatClassification?.vat_class === "alcohol";
                          return (
                            <div
                              key={line.id}
                              className="min-w-0 rounded-md border bg-background p-3"
                            >
                              <div className="min-w-0 space-y-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <CategoryIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <p
                                      className="min-w-0 break-words text-sm font-semibold leading-snug sm:truncate"
                                      title={line.name}
                                    >
                                      {line.name}
                                    </p>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatCurrency(line.unit_price)} each
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <Badge
                                      variant={hasAlcoholVat ? "default" : "outline"}
                                      className="rounded-md"
                                    >
                                      {vatClassification
                                        ? hasAlcoholVat
                                          ? "VAT 10%"
                                          : "Tax 5%"
                                        : "Tax pending"}
                                    </Badge>
                                    <span className="text-[11px] text-muted-foreground">
                                      {vatClassification
                                        ? "AI tax check"
                                        : "Run Calculate Taxes"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                                  <p className="min-w-0 break-words font-bold text-primary">
                                    {formatCurrency(
                                      line.unit_price * line.quantity
                                    )}
                                  </p>
                                  <div className="flex min-w-0 flex-wrap items-center gap-1">
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

                <Card className="min-w-0 overflow-hidden">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-lg font-semibold tracking-normal sm:text-xl">
                      <span className="flex min-w-0 items-center">
                        <Sparkles className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 truncate">Smart Fees</span>
                      </span>
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge
                          variant={isTaxCalculationCurrent ? "default" : "outline"}
                          className="max-w-full rounded-md text-[11px]"
                        >
                          <span className="truncate">{taxStatusLabel}</span>
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-md px-2 text-xs"
                          onClick={handleCalculateTaxes}
                          disabled={
                            selectedLines.length === 0 ||
                            vatStatus === "loading"
                          }
                        >
                          {vatStatus === "loading" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          {calculateTaxesButtonLabel}
                        </Button>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3 pt-0">
                    {needsTaxCalculation && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                        Run Calculate Taxes once your estimate items are ready.
                        AI will apply 5% Tax to standard items and 10% VAT to
                        alcohol items.
                      </div>
                    )}
                    <div className="grid min-w-0 gap-2 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <div className="min-w-0 rounded-md border bg-muted/20 p-3">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            Tax 5%
                          </span>
                          <span className="break-words text-right font-semibold">
                            {isTaxCalculationCurrent
                              ? formatCurrency(totals.taxAmount)
                              : "Pending"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isTaxCalculationCurrent
                            ? `On ${formatCurrency(totals.taxableSubtotal)}`
                            : "Calculated by AI"}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-md border bg-muted/20 p-3">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            Alcohol VAT 10%
                          </span>
                          <span className="break-words text-right font-semibold">
                            {isTaxCalculationCurrent
                              ? formatCurrency(totals.alcoholVatAmount)
                              : "Pending"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isTaxCalculationCurrent
                            ? `On ${formatCurrency(totals.alcoholSubtotal)}`
                            : "Calculated by AI"}
                        </p>
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
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
                          className="min-w-0 text-right font-mono"
                        />
                      </div>
                      <div className="min-w-0">
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
                          className="min-w-0 text-right font-mono"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="min-w-0 overflow-hidden border-primary/20 bg-primary/5">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="break-words text-right font-semibold">
                        {formatCurrency(totals.subtotal)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="break-words text-right">
                        {isTaxCalculationCurrent
                          ? formatCurrency(totals.taxAmount)
                          : "Pending"}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">VAT</span>
                      <span className="break-words text-right">
                        {isTaxCalculationCurrent
                          ? formatCurrency(totals.alcoholVatAmount)
                          : "Pending"}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Other</span>
                      <span className="break-words text-right">
                        {formatCurrency(totals.otherCharge)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="break-words text-right">
                        -{formatCurrency(totals.discount)}
                      </span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          Rough final bill
                        </span>
                        <span className="break-words text-2xl font-bold text-primary sm:text-right">
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
