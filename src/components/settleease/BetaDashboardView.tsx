"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { FileText, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

import dynamic from 'next/dynamic';

const ExpenseDetailModal = dynamic(() => import('./ExpenseDetailModal'), {
  ssr: false,
});
import SettlementSummary from './dashboard/SettlementSummary';
import ExpenseLog from './dashboard/ExpenseLog';

import { calculateSimplifiedTransactions, calculatePairwiseTransactions } from '@/lib/settleease/settlementCalculations';
import type { Person, Expense, Category, SettlementPayment, CalculatedTransaction, UserRole, ManualSettlementOverride } from '@/lib/settleease/types';
import { crashTestManager } from '@/lib/settleease/crashTestContext';
import ManualOverrideAlert from './ManualOverrideAlert';

interface BetaDashboardViewProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: Category[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  settlementPayments: SettlementPayment[];
  manualOverrides: ManualSettlementOverride[];
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

export default function BetaDashboardView({
  expenses,
  people,
  peopleMap,
  dynamicCategories,
  getCategoryIconFromName,
  settlementPayments,
  manualOverrides,
  currentUserId,
  onActionComplete,
  userRole,
  isLoadingPeople = false,
  isLoadingExpenses = false,
  isLoadingCategories = false,
  isLoadingSettlements = false,
  isLoadingOverrides = false,
  isDataFetchedAtLeastOnce = false,
}: BetaDashboardViewProps) {
  // Check for crash test
  useEffect(() => {
    crashTestManager.checkAndCrash('dashboard', 'Dashboard View crashed: Settlement calculation failed with corrupted expense data');
  });

  const [selectedExpenseForModal, setSelectedExpenseForModal] = useState<Expense | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseModalOpenedFromStep2, setExpenseModalOpenedFromStep2] = useState(false);
  const addSettlementPayment = useMutation(api.app.addSettlementPayment);
  const deleteSettlementPayment = useMutation(api.app.deleteSettlementPayment);

  const { simplifiedTransactions, pairwiseTransactions } = useMemo(() => {
    if (people.length === 0) return { simplifiedTransactions: [], pairwiseTransactions: [] };

    const sTransactions = calculateSimplifiedTransactions(people, expenses, settlementPayments, manualOverrides);
    const pTransactions = calculatePairwiseTransactions(people, expenses, settlementPayments);

    pTransactions.sort((a, b) =>
      (peopleMap[a.from] || '').localeCompare(peopleMap[b.from] || '') ||
      (peopleMap[a.to] || '').localeCompare(peopleMap[b.to] || '')
    );

    return { simplifiedTransactions: sTransactions, pairwiseTransactions: pTransactions };
  }, [expenses, people, settlementPayments, manualOverrides, peopleMap]);

  const handleMarkAsPaid = async (transaction: CalculatedTransaction) => {
    if (!currentUserId) {
      toast({ title: "Error", description: "Cannot mark as paid. User is missing.", variant: "destructive" });
      return;
    }
    try {
      await addSettlementPayment({
        debtorId: transaction.from,
        creditorId: transaction.to,
        amountSettled: transaction.amount,
        markedByUserId: currentUserId,
      });
      toast({ title: "Settlement Recorded", description: `Payment from ${peopleMap[transaction.from]} to ${peopleMap[transaction.to]} marked as complete.` });
      onActionComplete();
    } catch (error: any) {
      console.error("Error marking settlement as paid:", error);
      toast({ title: "Error", description: `Could not record settlement: ${error.message}`, variant: "destructive" });
    }
  };

  const handleUnmarkSettlementPayment = async (payment: SettlementPayment) => {
    if (!payment) {
      toast({ title: "Error", description: "Cannot unmark payment. Payment is missing.", variant: "destructive" });
      return;
    }
    try {
      await deleteSettlementPayment({ id: payment.id });
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

  const isLoading = isLoadingPeople || isLoadingExpenses || isLoadingSettlements || !isDataFetchedAtLeastOnce;

  // Beta skeleton with warm-toned ElevenLabs aesthetic
  if (isLoading) {
    return (
      <div className="h-full flex-1 flex flex-col space-y-8 min-h-0 py-2">
        {/* Settlement Hub Skeleton */}
        <div className="w-full flex flex-col shadow-lg rounded-lg bg-card overflow-hidden" style={{ borderRadius: '1rem' }}>
          <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-48 sm:w-64 rounded-full" style={{ opacity: 0.4 }} />
              </div>
              <Skeleton className="h-10 w-full sm:w-56 rounded-full" style={{ opacity: 0.3 }} />
            </div>
          </div>
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-3 flex-1 flex flex-col min-h-0">
            {/* Description area */}
            <div className="px-4 py-3 rounded-2xl mb-4" style={{ background: 'rgba(245, 242, 239, 0.5)' }}>
              <Skeleton className="h-4 w-full sm:w-96 rounded-full" style={{ opacity: 0.3 }} />
            </div>
            {/* Transaction cards */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card px-5 py-4 rounded-2xl" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px' }}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20 rounded-full" style={{ opacity: 0.3 }} />
                      <Skeleton className="h-3 w-3 rounded-full" style={{ opacity: 0.2 }} />
                      <Skeleton className="h-4 w-20 rounded-full" style={{ opacity: 0.3 }} />
                    </div>
                    <Skeleton className="h-5 w-24 rounded-full" style={{ opacity: 0.3 }} />
                  </div>
                  <Skeleton className="h-9 w-32 rounded-full mt-3" style={{ opacity: 0.2 }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed Skeleton */}
        <div className="w-full flex-1 flex flex-col shadow-lg rounded-lg bg-card overflow-hidden min-h-0" style={{ borderRadius: '1rem' }}>
          <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-3">
            <Skeleton className="h-8 w-44 rounded-full" style={{ opacity: 0.4 }} />
            <Skeleton className="h-3 w-36 mt-2 rounded-full" style={{ opacity: 0.2 }} />
          </div>
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-2 flex-1 flex flex-col min-h-0">
            {/* Search bar */}
            <Skeleton className="h-10 w-full rounded-full mb-4" style={{ opacity: 0.2 }} />
            {/* Expense cards */}
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-card px-5 py-4 rounded-2xl" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px' }}>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-40 rounded-full" style={{ opacity: 0.3 }} />
                    <Skeleton className="h-4 w-20 rounded-full" style={{ opacity: 0.3 }} />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <Skeleton className="h-3 w-24 rounded-full" style={{ opacity: 0.2 }} />
                    <Skeleton className="h-3 w-28 rounded-full" style={{ opacity: 0.2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state: no people or expenses
  if (!isLoading && people.length === 0 && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(245, 242, 239, 0.8)' }}>
            <Sparkles className="h-8 w-8" style={{ color: '#777169' }} />
          </div>
          <h2 className="text-2xl mb-3" style={{ fontWeight: 300, letterSpacing: '-0.02em' }}>Welcome to SettleEase</h2>
          <p className="text-base mb-6" style={{ color: '#4e4e4e', letterSpacing: '0.01em' }}>
            Navigate to &quot;Manage People&quot; to add participants, then to &quot;Add Expense&quot; to start managing your group finances.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoading && expenses.length === 0 && settlementPayments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(245, 242, 239, 0.8)' }}>
            <FileText className="h-8 w-8" style={{ color: '#777169' }} />
          </div>
          <h2 className="text-2xl mb-3" style={{ fontWeight: 300, letterSpacing: '-0.02em' }}>Ready to Settle?</h2>
          <p className="text-base mb-2" style={{ color: '#4e4e4e', letterSpacing: '0.01em' }}>
            Navigate to &quot;Add Expense&quot; to start managing your group finances.
          </p>
          {people.length === 0 && (
            <p className="text-sm" style={{ color: '#777169' }}>
              First, go to &quot;Manage People&quot; to add participants to your group.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex-1 flex flex-col space-y-6 md:space-y-8 min-h-0 py-2">
      {/* Manual Override Alert — no visual change needed, themed by CSS */}
      <ManualOverrideAlert
        overrides={manualOverrides}
        peopleMap={peopleMap}
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
        manualOverrides={manualOverrides}
        onMarkAsPaid={handleMarkAsPaid}
        onUnmarkSettlementPayment={handleUnmarkSettlementPayment}
        onViewExpenseDetails={handleExpenseCardClick}
        onViewExpenseDetailsFromStep2={handleExpenseClickFromStep2}
        getCategoryIconFromName={getCategoryIconFromName}
        categories={dynamicCategories}
        userRole={userRole}
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
