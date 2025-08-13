"use client";

import { useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";
import { EXPENSES_TABLE } from "@/lib/settleease/constants";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  Expense,
  PayerInputRow,
  ExpenseItemDetail,
  CelebrationContribution,
} from "@/lib/settleease/types";

interface UseExpenseFormLogicProps {
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  onExpenseAdded: () => void;
}

export function useExpenseFormLogic({
  db,
  supabaseInitializationError,
  onExpenseAdded,
}: UseExpenseFormLogicProps) {
  const validateForm = useCallback(
    (
      description: string,
      totalAmount: string,
      category: string,
      payers: PayerInputRow[],
      splitMethod: Expense["split_method"],
      selectedPeopleEqual: string[],
      unequalShares: Record<string, string>,
      items: ExpenseItemDetail[],
      isMultiplePayers: boolean,
      isCelebrationMode: boolean,
      celebrationPayerId: string,
      actualCelebrationAmount: number,
      amountToSplit: number
    ) => {
      if (!description.trim()) {
        toast({
          title: "Validation Error",
          description: "Description cannot be empty.",
          variant: "destructive",
        });
        return false;
      }

      const originalTotalAmountNum = parseFloat(totalAmount);
      if (isNaN(originalTotalAmountNum) || originalTotalAmountNum <= 0) {
        toast({
          title: "Validation Error",
          description: "Total Bill Amount must be a positive number.",
          variant: "destructive",
        });
        return false;
      }

      if (!category) {
        toast({
          title: "Validation Error",
          description: "Category must be selected.",
          variant: "destructive",
        });
        return false;
      }

      if (isCelebrationMode) {
        if (!celebrationPayerId) {
          toast({
            title: "Validation Error",
            description: "Celebratory payer must be selected.",
            variant: "destructive",
          });
          return false;
        }
        if (actualCelebrationAmount <= 0) {
          toast({
            title: "Validation Error",
            description: "Celebration contribution amount must be positive.",
            variant: "destructive",
          });
          return false;
        }
        if (actualCelebrationAmount > originalTotalAmountNum) {
          toast({
            title: "Validation Error",
            description: "Celebration contribution cannot exceed total bill amount.",
            variant: "destructive",
          });
          return false;
        }
      }

      if (payers.some((p) => !p.personId)) {
        toast({
          title: "Validation Error",
          description: "Each payer must be selected.",
          variant: "destructive",
        });
        return false;
      }

      const totalPaidByPayers = payers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      if (Math.abs(totalPaidByPayers - originalTotalAmountNum) > 0.001) {
        toast({
          title: "Validation Error",
          description: `Total paid by payers (${formatCurrency(
            totalPaidByPayers
          )}) does not match the total bill amount (${formatCurrency(originalTotalAmountNum)}).`,
          variant: "destructive",
        });
        return false;
      }

      if (isMultiplePayers && payers.some((p) => (parseFloat(p.amount) || 0) <= 0)) {
        if (payers.length > 1 || (payers.length === 1 && parseFloat(payers[0].amount || "0") <= 0)) {
          toast({
            title: "Validation Error",
            description: "Each payer's amount must be positive if listed.",
            variant: "destructive",
          });
          return false;
        }
      }

      if (
        !isMultiplePayers &&
        payers.length === 1 &&
        (parseFloat(payers[0].amount) || 0) <= 0 &&
        originalTotalAmountNum > 0
      ) {
        toast({
          title: "Validation Error",
          description: "Payer amount must be positive.",
          variant: "destructive",
        });
        return false;
      }

      const currentAmountToSplit = amountToSplit;

      if (splitMethod === "equal" && selectedPeopleEqual.length === 0 && currentAmountToSplit > 0.001) {
        toast({
          title: "Validation Error",
          description: "At least one person must be selected for equal split if there's an amount to split.",
          variant: "destructive",
        });
        return false;
      }

      if (splitMethod === "unequal") {
        const sumUnequal = Object.values(unequalShares).reduce(
          (sum, val) => sum + (parseFloat(val) || 0),
          0
        );
        if (Math.abs(sumUnequal - currentAmountToSplit) > 0.001) {
          toast({
            title: "Validation Error",
            description: `Sum of unequal shares (${formatCurrency(
              sumUnequal
            )}) must equal amount to split (${formatCurrency(currentAmountToSplit)}).`,
            variant: "destructive",
          });
          return false;
        }
        if (Object.values(unequalShares).some((val) => parseFloat(val || "0") < 0)) {
          toast({
            title: "Validation Error",
            description: "Unequal shares cannot be negative.",
            variant: "destructive",
          });
          return false;
        }
      }

      if (splitMethod === "itemwise") {
        if (items.length === 0 && currentAmountToSplit > 0.001) {
          toast({
            title: "Validation Error",
            description: "At least one item must be added for itemwise split if there's an amount to split.",
            variant: "destructive",
          });
          return false;
        }
        if (
          items.some(
            (item) =>
              !item.name.trim() ||
              isNaN(parseFloat(item.price as string)) ||
              parseFloat(item.price as string) <= 0 ||
              item.sharedBy.length === 0 ||
              !item.categoryName
          ) &&
          currentAmountToSplit > 0.001
        ) {
          toast({
            title: "Validation Error",
            description:
              "Each item must have a name, positive price, a selected category, and be shared by at least one person if there's an amount to split.",
            variant: "destructive",
          });
          return false;
        }
        const sumItemsOriginalPrices = items.reduce(
          (sum, item) => sum + (parseFloat(item.price as string) || 0),
          0
        );

        if (Math.abs(sumItemsOriginalPrices - originalTotalAmountNum) > 0.001) {
          toast({
            title: "Validation Error",
            description: `Sum of item prices (${formatCurrency(
              sumItemsOriginalPrices
            )}) must equal the total bill amount (${formatCurrency(
              originalTotalAmountNum
            )}) before celebration contributions.`,
            variant: "destructive",
          });
          return false;
        }
      }
      return true;
    },
    []
  );

  const handleSubmitExpense = useCallback(
    async (
      description: string,
      totalAmount: string,
      category: string,
      expenseDate: Date | undefined,
      payers: PayerInputRow[],
      splitMethod: Expense["split_method"],
      selectedPeopleEqual: string[],
      unequalShares: Record<string, string>,
      items: ExpenseItemDetail[],
      isMultiplePayers: boolean,
      isCelebrationMode: boolean,
      celebrationPayerId: string,
      actualCelebrationAmount: number,
      amountToSplit: number,
      expenseToEdit: Expense | null | undefined,
      defaultItemCategory: string,
      setIsLoading: (loading: boolean) => void
    ) => {
      if (
        !validateForm(
          description,
          totalAmount,
          category,
          payers,
          splitMethod,
          selectedPeopleEqual,
          unequalShares,
          items,
          isMultiplePayers,
          isCelebrationMode,
          celebrationPayerId,
          actualCelebrationAmount,
          amountToSplit
        )
      )
        return;

      if (!db || supabaseInitializationError) {
        toast({
          title: "Database Error",
          description: `Supabase client not available. ${supabaseInitializationError || ""}`,
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      const originalTotalAmountNum = parseFloat(totalAmount);

      const finalPayers = payers
        .filter((p) => p.personId && parseFloat(p.amount) > 0)
        .map((p) => ({ personId: p.personId, amount: parseFloat(p.amount) }));

      if (finalPayers.length === 0 && originalTotalAmountNum > 0) {
        toast({
          title: "Validation Error",
          description: "At least one valid payer with a positive amount is required.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      let celebrationContributionPayload: CelebrationContribution | null = null;
      if (isCelebrationMode && celebrationPayerId && actualCelebrationAmount > 0) {
        celebrationContributionPayload = { personId: celebrationPayerId, amount: actualCelebrationAmount };
      }

      const finalAmountEffectivelySplit = amountToSplit;

      let calculatedShares: { personId: string; amount: number }[] = [];
      let expenseItemsPayload: ExpenseItemDetail[] | null = null;

      if (finalAmountEffectivelySplit < 0.001 && splitMethod !== "itemwise") {
        calculatedShares = [];
      } else if (splitMethod === "equal") {
        const shareAmount =
          selectedPeopleEqual.length > 0 ? finalAmountEffectivelySplit / selectedPeopleEqual.length : 0;
        calculatedShares = selectedPeopleEqual.map((personId) => ({ personId, amount: shareAmount }));
      } else if (splitMethod === "unequal") {
        calculatedShares = Object.entries(unequalShares)
          .filter(([_, amountStr]) => parseFloat(amountStr || "0") > 0)
          .map(([personId, amountStr]) => ({ personId, amount: parseFloat(amountStr) }));
      } else if (splitMethod === "itemwise") {
        expenseItemsPayload = items.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price as string),
          sharedBy: item.sharedBy,
          categoryName: item.categoryName || defaultItemCategory,
        }));

        const itemwiseSharesMap: Record<string, number> = {};
        const sumOfOriginalItemPrices = expenseItemsPayload.reduce(
          (sum, item) => sum + Number(item.price),
          0
        );

        const reductionFactor =
          sumOfOriginalItemPrices > 0.001 && finalAmountEffectivelySplit >= 0
            ? finalAmountEffectivelySplit / sumOfOriginalItemPrices
            : sumOfOriginalItemPrices === 0 && finalAmountEffectivelySplit === 0
            ? 1
            : 0;

        items.forEach((item) => {
          const originalItemPrice = parseFloat(item.price as string);
          const adjustedItemPriceToSplit = originalItemPrice * reductionFactor;

          if (item.sharedBy.length > 0) {
            const pricePerPersonForItem = adjustedItemPriceToSplit / item.sharedBy.length;
            item.sharedBy.forEach((personId) => {
              itemwiseSharesMap[personId] = (itemwiseSharesMap[personId] || 0) + pricePerPersonForItem;
            });
          }
        });
        calculatedShares = Object.entries(itemwiseSharesMap).map(([personId, amount]) => ({
          personId,
          amount: Math.max(0, amount),
        }));
      }

      try {
        const commonPayload = {
          description,
          total_amount: originalTotalAmountNum,
          category,
          paid_by: finalPayers,
          split_method: splitMethod,
          shares: calculatedShares,
          items: splitMethod === "itemwise" ? expenseItemsPayload : null,
          celebration_contribution: celebrationContributionPayload,
        };

        let errorPayload: any = null;
        if (expenseToEdit && expenseToEdit.id) {
          const { error } = await db
            .from(EXPENSES_TABLE)
            .update({
              ...commonPayload,
              created_at: expenseDate?.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", expenseToEdit.id)
            .select();
          errorPayload = error;
          if (!error)
            toast({
              title: "Expense Updated",
              description: `${description} has been updated successfully.`,
            });
        } else {
          const { error } = await db
            .from(EXPENSES_TABLE)
            .insert([{ ...commonPayload, created_at: expenseDate?.toISOString() }])
            .select();
          errorPayload = error;
          if (!error)
            toast({
              title: "Expense Added",
              description: `${description} has been added successfully.`,
            });
        }

        if (errorPayload) throw errorPayload;

        onExpenseAdded();
      } catch (error: any) {
        let errorMessage = "An unknown error occurred while saving the expense.";

        if (error && typeof error.message === "string") {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        }
        console.error("Error saving expense:", errorMessage, error);
        toast({
          title: "Save Error",
          description: `Could not save expense: ${errorMessage}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [db, supabaseInitializationError, onExpenseAdded, validateForm]
  );

  return { handleSubmitExpense };
}