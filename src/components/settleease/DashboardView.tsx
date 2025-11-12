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
import type { Person, Expense, Category, SettlementPayment, CalculatedTransaction, UserRole } from '@/lib/settleease/types';
import { crashTestManager } from '@/lib/settleease/crashTestContext';

interface DashboardViewProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: Category[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  settlementPayments: SettlementPayment[];
  db: SupabaseClient | undefined;
  currentUserId: string;
  onActionComplete: () => void;
  userRole: UserRole;
  isLoadingPeople?: boolean;
  isLoadingExpenses?: boolean;
  isLoadingCategories?: boolean;
  isLoadingSettlements?: boolean;
}

export default function DashboardView({
  expenses,
  people,
  peopleMap,
  dynamicCategories,
  getCategoryIconFromName,
  settlementPayments,
  db,
  currentUserId,
  onActionComplete,
  userRole,
  isLoadingPeople = false,
  isLoadingExpenses = false,
  isLoadingCategories = false,
  isLoadingSettlements = false,
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

    const sTransactions = calculateSimplifiedTransactions(people, expenses, settlementPayments);
    const pTransactions = calculatePairwiseTransactions(people, expenses, settlementPayments);
    
    // Sort pairwise transactions for consistent display
    pTransactions.sort((a,b) => 
      (peopleMap[a.from] || '').localeCompare(peopleMap[b.from] || '') || 
      (peopleMap[a.to] || '').localeCompare(peopleMap[b.to] || '')
    );

    return { simplifiedTransactions: sTransactions, pairwiseTransactions: pTransactions };
  }, [expenses, people, settlementPayments, peopleMap]);


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
  
  if (people.length === 0 && expenses.length === 0) {
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
  if (expenses.length === 0 && settlementPayments.length === 0 && !isLoadingExpenses && !isLoadingSettlements) {
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

  // Show skeleton loaders while data is loading
  const isLoading = isLoadingPeople || isLoadingExpenses || isLoadingSettlements;
  if (isLoading && people.length === 0 && expenses.length === 0) {
    return (
      <div className="h-full flex-1 flex flex-col space-y-4 md:space-y-6 min-h-0">
        {/* Settlement Summary Skeleton - Matches actual SettlementSummary structure */}
        <Card className="w-full flex flex-col shadow-lg rounded-lg">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Title with icon */}
                <Skeleton className="h-7 w-56" /> {/* Settlement Hub title */}
                <Skeleton className="h-8 w-28" /> {/* Summarise button */}
              </div>
              {/* Tabs */}
              <Skeleton className="h-10 w-full sm:w-48" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
            {/* Description bar with toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/50 px-3 py-2 rounded-md gap-2 mb-2">
              <Skeleton className="h-4 w-full sm:w-96" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-10 rounded-full" /> {/* Switch */}
                <Skeleton className="h-4 w-16" /> {/* Label */}
              </div>
            </div>
            {/* Transaction list */}
            <div className="flex-1 min-h-0 border rounded-md p-1">
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-card/70 px-2 py-2 shadow-sm rounded-md">
                    <div className="flex flex-col sm:grid sm:grid-cols-5 items-start sm:items-center gap-2 sm:gap-1.5">
                      {/* Person -> Person -> Amount structure */}
                      <div className="col-span-1 sm:col-span-3 w-full">
                        <div className="flex items-center justify-between sm:grid sm:grid-cols-3 w-full">
                          <Skeleton className="h-4 w-20" /> {/* From person */}
                          <div className="flex items-center justify-center w-5 mx-1">
                            <Skeleton className="h-4 w-4" /> {/* Arrow */}
                          </div>
                          <Skeleton className="h-4 w-20" /> {/* To person */}
                        </div>
                      </div>
                      <Skeleton className="h-5 w-24 col-span-1" /> {/* Amount */}
                      <Skeleton className="h-8 w-full sm:w-32 col-span-1" /> {/* Mark as Paid button */}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Log Skeleton - Matches actual ExpenseLog structure */}
        <Card className="w-full h-full flex flex-col shadow-lg rounded-lg flex-1 min-h-0">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <Skeleton className="h-7 w-44" /> {/* Activity Feed title */}
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
                    <Skeleton className="h-5 w-32" /> {/* Date badge */}
                  </div>
                </div>
                {/* Expense items */}
                <div className="space-y-2.5 px-0.5 sm:px-1">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-card/70 rounded-md">
                      <CardHeader className="pb-1.5 pt-2.5 px-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                          <Skeleton className="h-6 w-48" /> {/* Expense title */}
                          <Skeleton className="h-5 w-20 mt-1 sm:mt-0" /> {/* Amount */}
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 pb-2 space-y-0.5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                          <Skeleton className="h-4 w-24" /> {/* Category */}
                          <Skeleton className="h-4 w-32 mt-0.5 sm:mt-0" /> {/* Paid by */}
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

  return (
    <div className="h-full flex-1 flex flex-col space-y-4 md:space-y-6 min-h-0">
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