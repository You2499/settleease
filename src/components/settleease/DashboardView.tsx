"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FileText } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

import ExpenseDetailModal from './ExpenseDetailModal';
import SettlementSummary from './dashboard/SettlementSummary';
import ExpenseLog from './dashboard/ExpenseLog';

import { SETTLEMENT_PAYMENTS_TABLE } from '@/lib/settleease/constants';
import { calculateSimplifiedTransactions, calculatePairwiseTransactions } from '@/lib/settleease/settlementCalculations';
import type { Person, Expense, Category, SettlementPayment, CalculatedTransaction, UserRole, ManualSettlementOverride } from '@/lib/settleease/types';
import { crashTestManager } from '@/lib/settleease/crashTestContext';
import ManualOverrideAlert from './ManualOverrideAlert';

interface DashboardViewProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: Category[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  settlementPayments: SettlementPayment[];
  manualOverrides: ManualSettlementOverride[];
  db: SupabaseClient | undefined;
  currentUserId: string;
  onActionComplete: () => void;
  userRole: UserRole;
  isLoadingPeople?: boolean;
  isLoadingExpenses?: boolean;
  isLoadingCategories?: boolean;
  isLoadingSettlements?: boolean;
  isLoadingOverrides?: boolean;
  isDataFetchedAtLeastOnce?: boolean;
}

export default function DashboardView({
  expenses,
  people,
  peopleMap,
  dynamicCategories,
  getCategoryIconFromName,
  settlementPayments,
  manualOverrides,
  db,
  currentUserId,
  onActionComplete,
  userRole,
  isLoadingPeople = false,
  isLoadingExpenses = false,
  isLoadingCategories = false,
  isLoadingSettlements = false,
  isLoadingOverrides = false,
  isDataFetchedAtLeastOnce = false,
}: DashboardViewProps) {
  // Check for crash test
  useEffect(() => {
    crashTestManager.checkAndCrash('dashboard', 'Dashboard View crashed: Settlement calculation failed with corrupted expense data');
  });

  const [selectedExpenseForModal, setSelectedExpenseForModal] = useState<Expense | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseModalOpenedFromStep2, setExpenseModalOpenedFromStep2] = useState(false);

  const { simplifiedTransactions, pairwiseTransactions } = useMemo(() => {
    if (people.length === 0) return { simplifiedTransactions: [], pairwiseTransactions: [] };

    const sTransactions = calculateSimplifiedTransactions(people, expenses, settlementPayments, manualOverrides);
    const pTransactions = calculatePairwiseTransactions(people, expenses, settlementPayments);
    
    // Sort pairwise transactions for consistent display
    pTransactions.sort((a,b) => 
      (peopleMap[a.from] || '').localeCompare(peopleMap[b.from] || '') || 
      (peopleMap[a.to] || '').localeCompare(peopleMap[b.to] || '')
    );

    return { simplifiedTransactions: sTransactions, pairwiseTransactions: pTransactions };
  }, [expenses, people, settlementPayments, manualOverrides, peopleMap]);


  const handleMarkAsPaid = async (transaction: CalculatedTransaction) => {
    if (!db || !currentUserId) {
      toast({ title: "Error", description: "Cannot mark as paid. DB or User missing.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await db.from(SETTLEMENT_PAYMENTS_TABLE).insert([
        {
          debtor_id: transaction.from,
          creditor_id: transaction.to,
          amount_settled: transaction.amount,
          marked_by_user_id: currentUserId,
          settled_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      toast({ title: "Settlement Recorded", description: `Payment from ${peopleMap[transaction.from]} to ${peopleMap[transaction.to]} marked as complete.` });
      onActionComplete();
    } catch (error: any) {
      console.error("Error marking settlement as paid:", error);
      toast({ title: "Error", description: `Could not record settlement: ${error.message}`, variant: "destructive" });
    }
  };

  const handleUnmarkSettlementPayment = async (payment: SettlementPayment) => {
    if (!db) {
      toast({ title: "Error", description: "Cannot unmark payment. DB missing.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await db.from(SETTLEMENT_PAYMENTS_TABLE).delete().eq('id', payment.id);
      if (error) throw error;
      toast({ title: "Payment Unmarked", description: `Payment record from ${peopleMap[payment.debtor_id]} to ${peopleMap[payment.creditor_id]} has been removed.` });
      onActionComplete();
    } catch (error: any) {
      console.error("Error unmarking payment:", error);
      toast({ title: "Error", description: `Could not unmark payment: ${error.message}`, variant: "destructive" });
    }
  };

  const handleExpenseCardClick = (expense: Expense) => {
    setSelectedExpenseForModal(expense);
    setIsExpenseModalOpen(true);
    setExpenseModalOpenedFromStep2(false);
  };

  const handleExpenseClickFromStep2 = (expense: Expense) => {
    setSelectedExpenseForModal(expense);
    setIsExpenseModalOpen(true);
    setExpenseModalOpenedFromStep2(true);
  };

  const handleBackFromExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setExpenseModalOpenedFromStep2(false);
  };

  // Check if we're currently loading any data OR if we haven't fetched data yet
  const isLoading = isLoadingPeople || isLoadingExpenses || isLoadingSettlements || !isDataFetchedAtLeastOnce;
  
  // Show skeleton loaders while data is loading (on initial load OR refresh)
  if (isLoading) {
    return (
      <div className="h-full flex-1 flex flex-col space-y-4 md:space-y-6 min-h-0">
        {/* Settlement Summary Skeleton - Mobile Optimized */}
        <Card className="w-full flex flex-col shadow-lg rounded-lg">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Title with icon */}
                <Skeleton className="h-7 w-40 sm:w-56" /> {/* Settlement Hub title */}
                <Skeleton className="h-8 w-24 sm:w-28" /> {/* Summarise button */}
              </div>
              {/* Tabs */}
              <Skeleton className="h-10 w-full sm:w-48" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
            {/* Description bar with toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/50 px-3 py-2 rounded-md gap-2 mb-2">
              <Skeleton className="h-4 w-full sm:w-96" />
              <div className="flex items-center space-x-2 self-end sm:self-center">
                <Skeleton className="h-5 w-10 rounded-full" /> {/* Switch */}
                <Skeleton className="h-4 w-16" /> {/* Label */}
              </div>
            </div>
            {/* Transaction list */}
            <div className="flex-1 min-h-0 border rounded-md p-1">
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-card/70 px-2 py-2 shadow-sm rounded-md">
                    <div className="flex flex-col gap-2 w-full">
                      {/* Person -> Person -> Amount structure - Mobile stacked */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Skeleton className="h-4 w-16 sm:w-20 flex-shrink-0" /> {/* From person */}
                          <Skeleton className="h-4 w-4 flex-shrink-0" /> {/* Arrow */}
                          <Skeleton className="h-4 w-16 sm:w-20 flex-shrink-0" /> {/* To person */}
                        </div>
                        <Skeleton className="h-5 w-20 sm:w-24 flex-shrink-0" /> {/* Amount */}
                      </div>
                      {/* Button on mobile - full width */}
                      <Skeleton className="h-8 w-full sm:w-32 sm:self-end" /> {/* Mark as Paid button */}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Log Skeleton - Mobile Optimized */}
        <Card className="w-full h-full flex flex-col shadow-lg rounded-lg flex-1 min-h-0">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <Skeleton className="h-7 w-36 sm:w-44" /> {/* Activity Feed title */}
            <Skeleton className="h-4 w-full sm:w-96 mt-1" /> {/* Description */}
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <div className="space-y-4">
                {/* Date separator */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <Skeleton className="h-px w-full" />
                  </div>
                  <div className="relative flex justify-center">
                    <Skeleton className="h-5 w-28 sm:w-32" /> {/* Date badge */}
                  </div>
                </div>
                {/* Expense items - Mobile optimized */}
                <div className="space-y-2.5 px-0.5 sm:px-1">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-card/70 rounded-md">
                      <CardHeader className="pb-1.5 pt-2.5 px-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 w-full">
                          <Skeleton className="h-6 w-full max-w-[200px] sm:w-48" /> {/* Expense title */}
                          <Skeleton className="h-5 w-20 sm:mt-0" /> {/* Amount */}
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 pb-2 space-y-0.5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 w-full">
                          <Skeleton className="h-4 w-20 sm:w-24" /> {/* Category */}
                          <Skeleton className="h-4 w-28 sm:w-32" /> {/* Paid by */}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show empty states only when NOT loading and no data exists
  if (!isLoading && people.length === 0 && expenses.length === 0) {
    return (
      <Card className="text-center py-10 shadow-lg rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-center text-xl sm:text-2xl font-bold text-primary">
            Welcome to SettleEase!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary/30" />
            <p className="font-medium text-base sm:text-lg mb-2">No People or Expenses Yet</p>
            <p className="text-sm sm:text-base max-w-md">
              Navigate to "Manage People" to add participants, then to "Add Expense" to start managing your group finances.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoading && expenses.length === 0 && settlementPayments.length === 0) {
    return (
      <Card className="text-center py-10 shadow-lg rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-center text-xl sm:text-2xl font-bold text-primary">
            Ready to Settle?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary/30" />
            <p className="font-medium text-base sm:text-lg mb-2">No Expenses Recorded Yet</p>
            <p className="text-sm sm:text-base max-w-md">
              Navigate to "Add Expense" to start managing your group finances.
            </p>
            {people.length === 0 && (
              <p className="text-sm sm:text-base mt-3 max-w-md">
                First, go to "Manage People" to add participants to your group.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex-1 flex flex-col space-y-4 md:space-y-6 min-h-0">
      {/* Manual Override Alert - shown when overrides are active */}
      <ManualOverrideAlert
        overrides={manualOverrides}
        peopleMap={peopleMap}
        db={db}
        onActionComplete={onActionComplete}
        userRole={userRole}
      />
      
      <SettlementSummary
        simplifiedTransactions={simplifiedTransactions}
        pairwiseTransactions={pairwiseTransactions}
        allExpenses={expenses} 
        people={people}
        peopleMap={peopleMap}
        settlementPayments={settlementPayments}
        onMarkAsPaid={handleMarkAsPaid}
        onUnmarkSettlementPayment={handleUnmarkSettlementPayment}
        onViewExpenseDetails={handleExpenseCardClick}
        onViewExpenseDetailsFromStep2={handleExpenseClickFromStep2}
        getCategoryIconFromName={getCategoryIconFromName}
        categories={dynamicCategories}
        userRole={userRole}
        db={db}
        currentUserId={currentUserId}
        isLoadingPeople={isLoadingPeople}
        isLoadingExpenses={isLoadingExpenses}
        isLoadingSettlements={isLoadingSettlements}
      />
      <div className="flex-1 flex flex-col">
        <ExpenseLog
          expenses={expenses}
          settlementPayments={settlementPayments}
          peopleMap={peopleMap}
          handleExpenseCardClick={handleExpenseCardClick}
          getCategoryIconFromName={getCategoryIconFromName}
          categories={dynamicCategories}
          isLoadingExpenses={isLoadingExpenses}
          isLoadingSettlements={isLoadingSettlements}
        />
      </div>
      {selectedExpenseForModal && (
        <ExpenseDetailModal
          expense={selectedExpenseForModal}
          isOpen={isExpenseModalOpen}
          onOpenChange={setIsExpenseModalOpen}
          peopleMap={peopleMap}
          getCategoryIconFromName={getCategoryIconFromName}
          categories={dynamicCategories}
          showBackButton={expenseModalOpenedFromStep2}
          onBack={handleBackFromExpenseModal}
        />
      )}
    </div>
  );
}