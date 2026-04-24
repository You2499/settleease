"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ArrowLeft } from "lucide-react";
import type {
  Expense,
  Category,
} from "@/lib/settleease/types";
import {
  calculateItemwiseSplit,
  getItemParticipantIds,
} from "@/lib/settleease/itemwiseCalculations";

// Import the smaller components
import ExpenseGeneralInfo from "./expense-detail/ExpenseGeneralInfo";
import ExpensePaymentInfo from "./expense-detail/ExpensePaymentInfo";
import ExpenseSplitDetails from "./expense-detail/ExpenseSplitDetails";
import ExpenseNetEffectSummary from "./expense-detail/ExpenseNetEffectSummary";
import SettleEaseErrorBoundary from "../ui/SettleEaseErrorBoundary";

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
  const categoryObj = categories.find((cat) => cat.name === expense.category);
  const CategoryIcon = getCategoryIconFromName(categoryObj?.icon_name || "");

  const totalOriginalBill = Number(expense.total_amount);
  const celebrationContributionOpt = expense.celebration_contribution;
  const celebrationAmount = celebrationContributionOpt
    ? Number(celebrationContributionOpt.amount)
    : 0;
  const amountEffectivelySplit = Math.max(0, totalOriginalBill - celebrationAmount);

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
        getItemParticipantIds(item).forEach((id) => ids.add(id))
      );
    }
    return Array.from(ids);
  }, [expense, celebrationContributionOpt]);

  // Sort helper for person IDs by name
  const sortPersonIdsByName = (ids: string[]) =>
    ids.slice().sort((a, b) => (peopleMap[a] || "").localeCompare(peopleMap[b] || ""));

  // Sorted involved person IDs for all sections
  const sortedInvolvedPersonIdsOverall = useMemo(
    () => sortPersonIdsByName(involvedPersonIdsOverall),
    [involvedPersonIdsOverall, peopleMap]
  );

  // Sorted paid_by and shares for each section
  const sortedPaidBy = useMemo(
    () =>
      Array.isArray(expense.paid_by)
        ? expense.paid_by
            .slice()
            .sort((a, b) =>
              (peopleMap[a.personId] || "").localeCompare(peopleMap[b.personId] || "")
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
              (peopleMap[a.personId] || "").localeCompare(peopleMap[b.personId] || "")
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

    const aggregatedData = calculateItemwiseSplit(
      expense.items,
      amountEffectivelySplit
    ).personBreakdown;

    // Sort each person's items by category, then by name
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[90vh] overflow-y-auto no-scrollbar"
        hideCloseButton={showBackButton}
      >
        {showBackButton && (
          <button
            className="absolute top-4 right-4 z-50 bg-background border border-border shadow-sm rounded-md p-2 hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none"
            title="Back to Step 2"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
            Expense Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-0">
          <div className="space-y-4 sm:space-y-6 pt-2">
            <SettleEaseErrorBoundary componentName="Expense General Info" size="medium">
              <ExpenseGeneralInfo
                expense={expense}
                totalOriginalBill={totalOriginalBill}
                CategoryIcon={CategoryIcon}
              />
            </SettleEaseErrorBoundary>

            <SettleEaseErrorBoundary componentName="Expense Payment Info" size="medium">
              <ExpensePaymentInfo
                sortedPaidBy={sortedPaidBy}
                celebrationContributionOpt={celebrationContributionOpt}
                amountEffectivelySplit={amountEffectivelySplit}
                peopleMap={peopleMap}
              />
            </SettleEaseErrorBoundary>

            <SettleEaseErrorBoundary componentName="Expense Split Details" size="medium">
              <ExpenseSplitDetails
                expense={expense}
                amountEffectivelySplit={amountEffectivelySplit}
                sortedShares={sortedShares}
                itemwiseBreakdownForDisplay={itemwiseBreakdownForDisplay}
                sortedItemwiseBreakdownEntries={sortedItemwiseBreakdownEntries}
                peopleMap={peopleMap}
                categories={categories}
                getCategoryIconFromName={getCategoryIconFromName}
              />
            </SettleEaseErrorBoundary>

            <SettleEaseErrorBoundary componentName="Expense Net Effect Summary" size="medium">
              <ExpenseNetEffectSummary
                expense={expense}
                sortedInvolvedPersonIdsOverall={sortedInvolvedPersonIdsOverall}
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
