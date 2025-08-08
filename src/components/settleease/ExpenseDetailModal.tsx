"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings2 } from "lucide-react";
import type {
  Expense,
  ExpenseItemDetail,
  CelebrationContribution,
  PersonAggregatedItemShares,
  Category,
} from "@/lib/settleease/types";
import ExpenseBasicInfo from "./expense-detail/ExpenseBasicInfo";
import ExpensePaymentAnalysis from "./expense-detail/ExpensePaymentAnalysis";
import ExpenseSplitDetails from "./expense-detail/ExpenseSplitDetails";
import ExpenseOriginalDesign from "./expense-detail/ExpenseOriginalDesign";
import type { ExpenseCalculations } from "./expense-detail/types";

interface ExpenseDetailModalProps {
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

export default function ExpenseDetailModal({
  expense,
  isOpen,
  onOpenChange,
  peopleMap,
  getCategoryIconFromName,
  categories,
  showBackButton = false,
  onBack,
}: ExpenseDetailModalProps) {
  const [useNewDesign, setUseNewDesign] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSectionExpansion = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  if (!expense) return null;

  // Calculate all expense data
  const calculations: ExpenseCalculations = useMemo(() => {
    const totalOriginalBill = Number(expense.total_amount);
    const celebrationContributionOpt: CelebrationContribution | null | undefined =
      expense.celebration_contribution;
    const celebrationAmount = celebrationContributionOpt
      ? Number(celebrationContributionOpt.amount)
      : 0;
    const amountEffectivelySplit = Math.max(
      0,
      totalOriginalBill - celebrationAmount
    );

    const involvedPersonIdsOverall = (() => {
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
    })();

    // Sort helper for person IDs by name
    const sortPersonIdsByName = (ids: string[]) =>
      ids
        .slice()
        .sort((a, b) => (peopleMap[a] || "").localeCompare(peopleMap[b] || ""));

    const sortedInvolvedPersonIdsOverall = sortPersonIdsByName(involvedPersonIdsOverall);

    const sortedPaidBy = Array.isArray(expense.paid_by)
      ? expense.paid_by
          .slice()
          .sort((a, b) =>
            (peopleMap[a.personId] || "").localeCompare(
              peopleMap[b.personId] || ""
            )
          )
      : [];

    const sortedShares = Array.isArray(expense.shares)
      ? expense.shares
          .slice()
          .sort((a, b) =>
            (peopleMap[a.personId] || "").localeCompare(
              peopleMap[b.personId] || ""
            )
          )
      : [];

    const itemwiseBreakdownForDisplay = (() => {
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

      // Sort each person's items by category, then by name
      Object.values(aggregatedData).forEach((personData) => {
        personData.items.sort((a, b) => {
          const catA = (a.itemCategoryName || "").toLowerCase();
          const catB = (b.itemCategoryName || "").toLowerCase();
          if (catA < catB) return -1;
          if (catA > catB) return 1;
          // If same category, sort by item name
          const nameA = (a.itemName || "").toLowerCase();
          const nameB = (b.itemName || "").toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });
      });

      return aggregatedData;
    })();

    const sortedItemwiseBreakdownEntries = itemwiseBreakdownForDisplay
      ? Object.entries(itemwiseBreakdownForDisplay).sort(([idA], [idB]) =>
          (peopleMap[idA] || "").localeCompare(peopleMap[idB] || "")
        )
      : [];

    const getItemCategoryIcon = (categoryName?: string) => {
      if (!categoryName) return Settings2;
      const cat = categories.find((c: Category) => c.name === categoryName);
      return getCategoryIconFromName(cat?.icon_name || "");
    };

    const getCategoryRank = (catName?: string) => {
      if (!catName) return 9999;
      const cat = categories.find((c: Category) => c.name === catName);
      return cat?.rank ?? 9999;
    };

    return {
      totalOriginalBill,
      celebrationContributionOpt,
      celebrationAmount,
      amountEffectivelySplit,
      involvedPersonIdsOverall,
      sortedInvolvedPersonIdsOverall,
      sortedPaidBy,
      sortedShares,
      itemwiseBreakdownForDisplay,
      sortedItemwiseBreakdownEntries,
      sortPersonIdsByName,
      getItemCategoryIcon,
      getCategoryRank,
    };
  }, [expense, peopleMap, categories, getCategoryIconFromName]);

  // New design render function
  const renderNewDesign = () => (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-0">
      <div className="space-y-4 sm:space-y-6 pt-2">
        <ExpenseBasicInfo
          expense={expense}
          peopleMap={peopleMap}
          getCategoryIconFromName={getCategoryIconFromName}
          categories={categories}
          expandedSections={expandedSections}
          toggleSectionExpansion={toggleSectionExpansion}
          calculations={calculations}
        />

        <ExpensePaymentAnalysis
          expense={expense}
          peopleMap={peopleMap}
          getCategoryIconFromName={getCategoryIconFromName}
          categories={categories}
          expandedSections={expandedSections}
          toggleSectionExpansion={toggleSectionExpansion}
          calculations={calculations}
        />

        <ExpenseSplitDetails
          expense={expense}
          peopleMap={peopleMap}
          getCategoryIconFromName={getCategoryIconFromName}
          categories={categories}
          expandedSections={expandedSections}
          toggleSectionExpansion={toggleSectionExpansion}
          calculations={calculations}
        />
      </div>
    </div>
  );

  // Original design render function
  const renderOriginalDesign = () => (
    <ExpenseOriginalDesign
      expense={expense}
      peopleMap={peopleMap}
      getCategoryIconFromName={getCategoryIconFromName}
      categories={categories}
      expandedSections={expandedSections}
      toggleSectionExpansion={toggleSectionExpansion}
      calculations={calculations}
    />
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto no-scrollbar max-w-6xl">
        {showBackButton && (
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-background hover:bg-accent border border-border shadow-sm"
            title="Back to Step 2"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
              Expense Details
            </DialogTitle>
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="text-xs">
                BETA
              </Badge>
              <div className="flex items-center space-x-2">
                <Label htmlFor="design-toggle" className="text-sm font-medium">
                  New Design
                </Label>
                <Switch
                  id="design-toggle"
                  checked={useNewDesign}
                  onCheckedChange={setUseNewDesign}
                />
              </div>
            </div>
          </div>
        </DialogHeader>

        {useNewDesign ? renderNewDesign() : renderOriginalDesign()}
      </DialogContent>
    </Dialog>
  );
}