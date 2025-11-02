"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FileText } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  if (expenses.length === 0 && settlementPayments.length === 0) {
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
      />
      <div className="flex-1 flex flex-col">
        <ExpenseLog
          expenses={expenses}
          settlementPayments={settlementPayments}
          peopleMap={peopleMap}
          handleExpenseCardClick={handleExpenseCardClick}
          getCategoryIconFromName={getCategoryIconFromName}
          categories={dynamicCategories}
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