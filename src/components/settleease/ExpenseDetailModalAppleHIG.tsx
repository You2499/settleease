"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import {
  ArrowLeft,
  Info,
  Calendar,
  CreditCard,
  Users,
  Calculator,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  Expense,
  ExpenseItemDetail,
  PersonAggregatedItemShares,
  Category,
} from "@/lib/settleease/types";

// Import the original modal components for fallback
import ExpenseGeneralInfo from "./expense-detail/ExpenseGeneralInfo";
import ExpensePaymentInfo from "./expense-detail/ExpensePaymentInfo";
import ExpenseSplitDetails from "./expense-detail/ExpenseSplitDetails";
import ExpenseNetEffectSummary from "./expense-detail/ExpenseNetEffectSummary";
import SettleEaseErrorBoundary from "../ui/SettleEaseErrorBoundary";

interface ExpenseDetailModalAppleHIGProps {
  expense: Expense;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  peopleMap: Record<string, string>;
  getCategoryIconFromName: (
    categoryName: string
  ) => React.FC<React.SVGProps<SVGSVGElement>>;
  categories: Category[];
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function ExpenseDetailModalAppleHIG({
  expense,
  isOpen,
  onOpenChange,
  peopleMap,
  getCategoryIconFromName,
  categories,
  showBackButton = false,
  onBack,
}: ExpenseDetailModalAppleHIGProps) {
  const [useAppleDesign, setUseAppleDesign] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["general"])
  );

  const categoryObj = categories.find((cat) => cat.name === expense.category);
  const CategoryIcon = getCategoryIconFromName(categoryObj?.icon_name || "");

  const totalOriginalBill = Number(expense.total_amount);
  const celebrationContributionOpt = expense.celebration_contribution;
  const celebrationAmount = celebrationContributionOpt
    ? Number(celebrationContributionOpt.amount)
    : 0;
  const amountEffectivelySplit = Math.max(
    0,
    totalOriginalBill - celebrationAmount
  );

  const involvedPersonIdsOverall = useMemo(() => {
    const ids = new Set<string>();
    if (Array.isArray(expense.paid_by)) {
      expense.paid_by.forEach((p) => ids.add(p.personId));
    }
    if (Array.isArray(expense.shares)) {
      expense.shares.forEach((s) => ids.add(s.personId));
    }
    if (celebrationContributionOpt) {
      ids.add(celebrationContributionOpt.personId);
    }
    if (expense.split_method === "itemwise" && Array.isArray(expense.items)) {
      expense.items.forEach((item) =>
        item.sharedBy.forEach((id) => ids.add(id))
      );
    }
    return Array.from(ids);
  }, [expense, celebrationContributionOpt]);

  const sortPersonIdsByName = (ids: string[]) =>
    ids
      .slice()
      .sort((a, b) => (peopleMap[a] || "").localeCompare(peopleMap[b] || ""));

  const sortedInvolvedPersonIdsOverall = useMemo(
    () => sortPersonIdsByName(involvedPersonIdsOverall),
    [involvedPersonIdsOverall, peopleMap]
  );

  const sortedPaidBy = useMemo(
    () =>
      Array.isArray(expense.paid_by)
        ? expense.paid_by
            .slice()
            .sort((a, b) =>
              (peopleMap[a.personId] || "").localeCompare(
                peopleMap[b.personId] || ""
              )
            )
        : [],
    [expense.paid_by, peopleMap]
  );

  const sortedShares = useMemo(
    () =>
      Array.isArray(expense.shares)
        ? expense.shares
            .slice()
            .sort((a, b) =>
              (peopleMap[a.personId] || "").localeCompare(
                peopleMap[b.personId] || ""
              )
            )
        : [],
    [expense.shares, peopleMap]
  );

  const itemwiseBreakdownForDisplay = useMemo(() => {
    if (
      expense.split_method !== "itemwise" ||
      !Array.isArray(expense.items) ||
      expense.items.length === 0
    ) {
      return null;
    }

    const sumOfOriginalItemPrices = expense.items.reduce(
      (sum, item) => sum + Number(item.price),
      0
    );

    const reductionFactor =
      sumOfOriginalItemPrices > 0.001 && amountEffectivelySplit >= 0
        ? amountEffectivelySplit / sumOfOriginalItemPrices
        : sumOfOriginalItemPrices === 0 && amountEffectivelySplit === 0
        ? 1
        : 0;

    const aggregatedData: PersonAggregatedItemShares = {};

    expense.items.forEach((item: ExpenseItemDetail) => {
      const originalItemPriceNum = Number(item.price);
      const adjustedItemPriceForSplit = Math.max(
        0,
        originalItemPriceNum * reductionFactor
      );

      if (item.sharedBy && item.sharedBy.length > 0) {
        const sharePerPersonForItem =
          adjustedItemPriceForSplit > 0.001 && item.sharedBy.length > 0
            ? adjustedItemPriceForSplit / item.sharedBy.length
            : 0;

        item.sharedBy.forEach((personId: string) => {
          if (!aggregatedData[personId]) {
            aggregatedData[personId] = {
              items: [],
              totalShareOfAdjustedItems: 0,
            };
          }
          aggregatedData[personId].items.push({
            itemId: item.id || `item-${Math.random()}`,
            itemName: item.name,
            originalItemPrice: originalItemPriceNum,
            adjustedItemPriceForSplit: adjustedItemPriceForSplit,
            shareForPerson: sharePerPersonForItem,
            sharedByCount: item.sharedBy.length,
            itemCategoryName: item.categoryName,
          });
          aggregatedData[personId].totalShareOfAdjustedItems +=
            sharePerPersonForItem;
        });
      }
    });

    Object.values(aggregatedData).forEach((personData) => {
      personData.items.sort((a, b) => {
        const catA = (a.itemCategoryName || "").toLowerCase();
        const catB = (b.itemCategoryName || "").toLowerCase();
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        const nameA = (a.itemName || "").toLowerCase();
        const nameB = (b.itemName || "").toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });
    });

    return aggregatedData;
  }, [expense.split_method, expense.items, amountEffectivelySplit]);

  const sortedItemwiseBreakdownEntries = useMemo(() => {
    if (!itemwiseBreakdownForDisplay) return [];
    return Object.entries(itemwiseBreakdownForDisplay).sort(([idA], [idB]) =>
      (peopleMap[idA] || "").localeCompare(peopleMap[idB] || "")
    );
  }, [itemwiseBreakdownForDisplay, peopleMap]);

  // If not using Apple design, render the original modal
  if (!useAppleDesign) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto no-scrollbar"
          hideCloseButton={showBackButton}
        >
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
                Expense Details
              </DialogTitle>

              {/* Integrated Pill with Toggle and Back Button */}
              <div className="flex items-center bg-muted/20 dark:bg-muted/15 rounded-2xl p-1 border border-border/20 dark:border-border/10">
                {showBackButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="p-2 rounded-xl hover:bg-muted/50 transition-colors mr-2"
                    title="Back to Step 2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                
                <div className="flex items-center space-x-3 px-3 py-2">
                  <Badge
                    variant="secondary"
                    className="text-xs bg-primary/10 dark:bg-primary/15 text-primary border-primary/20 dark:border-primary/30"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Beta
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/90">
                      New Design
                    </span>
                    <Switch
                      checked={useAppleDesign}
                      onCheckedChange={setUseAppleDesign}
                    />
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-0">
            <div className="space-y-4 sm:space-y-6 pt-2">
              <SettleEaseErrorBoundary
                componentName="Expense General Info"
                size="medium"
              >
                <ExpenseGeneralInfo
                  expense={expense}
                  totalOriginalBill={totalOriginalBill}
                  CategoryIcon={CategoryIcon}
                />
              </SettleEaseErrorBoundary>

              <SettleEaseErrorBoundary
                componentName="Expense Payment Info"
                size="medium"
              >
                <ExpensePaymentInfo
                  sortedPaidBy={sortedPaidBy}
                  celebrationContributionOpt={celebrationContributionOpt}
                  amountEffectivelySplit={amountEffectivelySplit}
                  peopleMap={peopleMap}
                />
              </SettleEaseErrorBoundary>

              <SettleEaseErrorBoundary
                componentName="Expense Split Details"
                size="medium"
              >
                <ExpenseSplitDetails
                  expense={expense}
                  amountEffectivelySplit={amountEffectivelySplit}
                  sortedShares={sortedShares}
                  itemwiseBreakdownForDisplay={itemwiseBreakdownForDisplay}
                  sortedItemwiseBreakdownEntries={
                    sortedItemwiseBreakdownEntries
                  }
                  peopleMap={peopleMap}
                  categories={categories}
                  getCategoryIconFromName={getCategoryIconFromName}
                />
              </SettleEaseErrorBoundary>

              <SettleEaseErrorBoundary
                componentName="Expense Net Effect Summary"
                size="medium"
              >
                <ExpenseNetEffectSummary
                  expense={expense}
                  sortedInvolvedPersonIdsOverall={
                    sortedInvolvedPersonIdsOverall
                  }
                  celebrationContributionOpt={celebrationContributionOpt}
                  amountEffectivelySplit={amountEffectivelySplit}
                  peopleMap={peopleMap}
                />
              </SettleEaseErrorBoundary>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!expense) return null;

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Apple HIG Section Component
  const Section = ({
    id,
    title,
    icon: Icon,
    children,
  }: {
    id: string;
    title: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections.has(id);

    return (
      <div className="bg-card dark:bg-card/95 border border-border/30 dark:border-border/20 rounded-2xl overflow-hidden transition-colors hover:bg-card/80 dark:hover:bg-card/90">
        <button
          onClick={() => toggleSection(id)}
          className="w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r from-muted/20 to-muted/10 dark:from-muted/15 dark:to-muted/5 hover:from-muted/30 hover:to-muted/20 dark:hover:from-muted/25 dark:hover:to-muted/15 transition-all duration-200 active:scale-[0.98]"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/15 dark:bg-primary/20 rounded-xl">
              <Icon className="h-5 w-5 text-primary dark:text-primary/90" />
            </div>
            <span className="font-semibold text-base text-foreground dark:text-foreground/95">
              {title}
            </span>
          </div>
          <div className="p-1 rounded-full bg-background/50 dark:bg-background/30">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground dark:text-muted-foreground/80 transition-transform" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-muted-foreground/80 transition-transform" />
            )}
          </div>
        </button>
        {isExpanded && (
          <div className="px-5 py-4 bg-background/50 dark:bg-background/30 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Apple HIG Info Row Component
  const InfoRow = ({
    label,
    value,
    icon: Icon,
    highlight = false,
  }: {
    label: string;
    value: React.ReactNode;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    highlight?: boolean;
  }) => (
    <div className="flex items-center justify-between py-3 px-4 bg-muted/20 dark:bg-muted/15 rounded-xl hover:bg-muted/30 dark:hover:bg-muted/25 transition-colors">
      <div className="flex items-center space-x-3">
        {Icon && (
          <div className="p-1.5 bg-background dark:bg-background/80 rounded-lg">
            <Icon className="h-4 w-4 text-muted-foreground dark:text-muted-foreground/80" />
          </div>
        )}
        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground/90">
          {label}
        </span>
      </div>
      <div
        className={`text-sm font-medium text-right max-w-[60%] ${
          highlight
            ? "text-primary dark:text-primary/90 font-semibold text-base"
            : "text-foreground dark:text-foreground/95"
        }`}
      >
        {value}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/20 border-border/30"
        hideCloseButton={showBackButton}
      >
        {/* Header with Integrated Toggle */}
        <DialogHeader className="pb-6 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground mb-1">
                Expense Details
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {expense.description}
              </p>
            </div>

            {/* Integrated Pill with Toggle and Back Button */}
            <div className="flex items-center bg-muted/30 dark:bg-muted/20 rounded-2xl p-1 border border-border/20 dark:border-border/10">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="p-2 rounded-xl hover:bg-muted/50 transition-colors mr-2"
                  title="Back to Step 2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              
              <div className="flex items-center space-x-3 px-3 py-2">
                <Badge
                  variant="secondary"
                  className="text-xs bg-primary/10 dark:bg-primary/15 text-primary border-primary/20 dark:border-primary/30"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Beta
                </Badge>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/90">
                    New Design
                  </span>
                  <Switch
                    checked={useAppleDesign}
                    onCheckedChange={setUseAppleDesign}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-5 py-4">
          {/* General Information */}
          <Section id="general" title="General Information" icon={Info}>
            <div className="space-y-3">
              <InfoRow
                label="Total Amount"
                value={
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(totalOriginalBill)}
                    </div>
                  </div>
                }
                highlight
              />
              <InfoRow
                label="Category"
                value={
                  <div className="flex items-center space-x-2 bg-primary/10 dark:bg-primary/15 px-3 py-1.5 rounded-lg border border-primary/20 dark:border-primary/30">
                    <CategoryIcon className="h-4 w-4 text-primary dark:text-primary/90" />
                    <span className="font-medium text-primary dark:text-primary/90">
                      {expense.category}
                    </span>
                  </div>
                }
              />
              <InfoRow
                label="Date"
                value={
                  expense.created_at
                    ? new Date(expense.created_at).toLocaleDateString(
                        "default",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )
                    : "Not set"
                }
                icon={Calendar}
              />
            </div>
          </Section>

          {/* Payment Information */}
          <Section id="payment" title="Payment Information" icon={CreditCard}>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Who Paid
                </h4>
                <div className="space-y-2">
                  {sortedPaidBy.map((payer) => (
                    <div
                      key={payer.personId}
                      className="flex justify-between items-center py-3 px-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800/30"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {peopleMap[payer.personId] || "Unknown"}
                      </span>
                      <span className="text-sm font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(Number(payer.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {celebrationContributionOpt && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    Celebration Contribution
                  </h4>
                  <div className="py-3 px-4 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800/30">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">
                        {peopleMap[celebrationContributionOpt.personId] ||
                          "Unknown"}
                      </span>
                      <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
                        {formatCurrency(celebrationAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <InfoRow
                  label="Amount Split"
                  value={
                    <div className="text-right">
                      <div className="text-base font-bold text-primary">
                        {formatCurrency(amountEffectivelySplit)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        After contributions
                      </div>
                    </div>
                  }
                  highlight
                />
              </div>
            </div>
          </Section>

          {/* Split Details */}
          <Section id="split" title="Split Details" icon={Users}>
            <div className="space-y-4">
              <InfoRow
                label="Split Method"
                value={
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/30"
                  >
                    {expense.split_method === "equal"
                      ? "Equal Split"
                      : expense.split_method === "unequal"
                      ? "Custom Split"
                      : "Item-wise Split"}
                  </Badge>
                }
              />

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Individual Shares
                </h4>
                <div className="space-y-2">
                  {sortedShares.map((share) => (
                    <div
                      key={share.personId}
                      className="flex justify-between items-center py-3 px-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800/30"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {peopleMap[share.personId] || "Unknown"}
                      </span>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                        {formatCurrency(Number(share.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Itemwise Breakdown */}
              {expense.split_method === "itemwise" &&
                itemwiseBreakdownForDisplay && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                      Item-wise Breakdown
                    </h4>
                    <div className="space-y-3">
                      {sortedItemwiseBreakdownEntries.map(
                        ([personId, personData]) => (
                          <div
                            key={personId}
                            className="bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800/30 overflow-hidden"
                          >
                            <div className="px-4 py-3 bg-indigo-100 dark:bg-indigo-900/40 border-b border-indigo-200 dark:border-indigo-800/40">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-sm text-foreground dark:text-foreground/95">
                                  {peopleMap[personId] || "Unknown"}
                                </span>
                                <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300">
                                  {formatCurrency(
                                    personData.totalShareOfAdjustedItems
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              {personData.items.map((item) => (
                                <div
                                  key={item.itemId}
                                  className="flex justify-between items-center text-xs"
                                >
                                  <div className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-indigo-300 rounded-full"></div>
                                    <span className="text-muted-foreground dark:text-muted-foreground/90">
                                      {item.itemName}
                                      {item.itemCategoryName && (
                                        <span className="text-xs text-muted-foreground/70 dark:text-muted-foreground/60 ml-1">
                                          ({item.itemCategoryName})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-foreground dark:text-foreground/95">
                                      {formatCurrency(item.shareForPerson)}
                                    </div>
                                    <div className="text-muted-foreground/70 dark:text-muted-foreground/60">
                                      {item.sharedByCount > 1 &&
                                        `÷${item.sharedByCount}`}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          </Section>

          {/* Net Effect Summary */}
          <Section id="summary" title="Net Effect Summary" icon={Calculator}>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                Net Balances
              </h4>
              <div className="space-y-3">
                {sortedInvolvedPersonIdsOverall.map((personId) => {
                  const personName = peopleMap[personId] || "Unknown";
                  const amountPaid = sortedPaidBy
                    .filter((p) => p.personId === personId)
                    .reduce((sum, p) => sum + Number(p.amount), 0);
                  const amountShared = sortedShares
                    .filter((s) => s.personId === personId)
                    .reduce((sum, s) => sum + Number(s.amount), 0);
                  const celebrationContrib =
                    celebrationContributionOpt?.personId === personId
                      ? celebrationAmount
                      : 0;
                  const netEffect =
                    amountPaid + celebrationContrib - amountShared;

                  const isPositive = netEffect > 0;
                  const isNegative = netEffect < 0;

                  return (
                    <div
                      key={personId}
                      className={`flex justify-between items-center py-4 px-4 rounded-xl border-2 transition-all ${
                        isPositive
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30"
                          : isNegative
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30"
                          : "bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/30"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isPositive
                              ? "bg-green-500"
                              : isNegative
                              ? "bg-red-500"
                              : "bg-slate-400 dark:bg-slate-500"
                          }`}
                        ></div>
                        <span className="text-sm font-semibold text-foreground">
                          {personName}
                        </span>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-base font-bold ${
                            isPositive
                              ? "text-green-700 dark:text-green-400"
                              : isNegative
                              ? "text-red-700 dark:text-red-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {formatCurrency(Math.abs(netEffect))}
                        </div>
                        <div
                          className={`text-xs font-medium ${
                            isPositive
                              ? "text-green-600 dark:text-green-500"
                              : isNegative
                              ? "text-red-600 dark:text-red-500"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {isPositive
                            ? "Should receive"
                            : isNegative
                            ? "Should pay"
                            : "All settled"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
