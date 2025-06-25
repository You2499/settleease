"use client";

import React, { useState, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FileText } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import ExpenseDetailModal from './ExpenseDetailModal';
import SettlementSummary from './dashboard/SettlementSummary';
import ExpenseLog from './dashboard/ExpenseLog';

import { SETTLEMENT_PAYMENTS_TABLE } from '@/lib/settleease/constants';
import type { Person, Expense, Category, SettlementPayment, CalculatedTransaction, UserRole } from '@/lib/settleease/types';

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
  const [selectedExpenseForModal, setSelectedExpenseForModal] = useState<Expense | null | 'loading'>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const { simplifiedTransactions, pairwiseTransactions } = useMemo(() => {
    if (people.length === 0) return { simplifiedTransactions: [], pairwiseTransactions: [] };

    // 1. Calculate initial balances from expenses only
    const initialBalances: Record<string, number> = {};
    people.forEach(p => initialBalances[p.id] = 0);

    expenses.forEach(expense => {
      if (Array.isArray(expense.paid_by)) {
        expense.paid_by.forEach(payment => {
          initialBalances[payment.personId] = (initialBalances[payment.personId] || 0) + Number(payment.amount);
        });
      }
      if (Array.isArray(expense.shares)) {
        expense.shares.forEach(share => {
          initialBalances[share.personId] = (initialBalances[share.personId] || 0) - Number(share.amount);
        });
      }
    });

    // 2. Calculate balances after recorded settlement payments (for simplified view)
    const balancesAfterPayments = { ...initialBalances };
    settlementPayments.forEach(payment => {
      if (balancesAfterPayments[payment.debtor_id] !== undefined) {
        balancesAfterPayments[payment.debtor_id] += Number(payment.amount_settled);
      }
      if (balancesAfterPayments[payment.creditor_id] !== undefined) {
        balancesAfterPayments[payment.creditor_id] -= Number(payment.amount_settled);
      }
    });

    // 3. Calculate simplified transactions
    const sTransactions: CalculatedTransaction[] = [];
    const debtors = Object.entries(balancesAfterPayments).filter(([_, bal]) => bal < -0.01).map(([id, bal]) => ({ id, amount: bal })).sort((a, b) => a.amount - b.amount);
    const creditors = Object.entries(balancesAfterPayments).filter(([_, bal]) => bal > 0.01).map(([id, bal]) => ({ id, amount: bal })).sort((a, b) => b.amount - a.amount);
    let dIdx = 0, cIdx = 0;
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx], creditor = creditors[cIdx];
      const amountToSettle = Math.min(-debtor.amount, creditor.amount);
      if (amountToSettle > 0.01) {
        sTransactions.push({ from: debtor.id, to: creditor.id, amount: amountToSettle });
        debtor.amount += amountToSettle;
        creditor.amount -= amountToSettle;
      }
      if (Math.abs(debtor.amount) < 0.01) dIdx++;
      if (Math.abs(creditor.amount) < 0.01) cIdx++;
    }

    // 4. Calculate pairwise transactions (raw debts adjusted by specific pairwise payments)
    const rawPairwiseDebtsFromExpenses: Record<string, Record<string, { amount: number, expenseIds: Set<string> }>> = {};
    expenses.forEach(expense => {
      if (expense.total_amount <= 0.001 || !expense.shares || !expense.paid_by) return;

      expense.shares.forEach(share => {
        const sharerId = share.personId;
        const sharerTotalOwedForThisExpense = Number(share.amount);
        if (sharerTotalOwedForThisExpense <= 0.001) return;

        expense.paid_by.forEach(payment => {
          const payerId = payment.personId;
          const payerAmountForThisExpense = Number(payment.amount);
          if (payerAmountForThisExpense <= 0.001 || expense.total_amount <= 0.001) return; // Avoid division by zero

          if (sharerId !== payerId) {
            const proportionPaidByThisPayer = payerAmountForThisExpense / expense.total_amount;
            const amountOwedBySharerToThisPayer = sharerTotalOwedForThisExpense * proportionPaidByThisPayer;

            if (amountOwedBySharerToThisPayer > 0.001) {
              if (!rawPairwiseDebtsFromExpenses[sharerId]) rawPairwiseDebtsFromExpenses[sharerId] = {};
              if (!rawPairwiseDebtsFromExpenses[sharerId][payerId]) rawPairwiseDebtsFromExpenses[sharerId][payerId] = { amount: 0, expenseIds: new Set() };
              
              rawPairwiseDebtsFromExpenses[sharerId][payerId].amount += amountOwedBySharerToThisPayer;
              rawPairwiseDebtsFromExpenses[sharerId][payerId].expenseIds.add(expense.id);
            }
          }
        });
      });
    });

    const settledAmountsMap: Record<string, Record<string, number>> = {};
    settlementPayments.forEach(sp => {
      if (!settledAmountsMap[sp.debtor_id]) settledAmountsMap[sp.debtor_id] = {};
      settledAmountsMap[sp.debtor_id][sp.creditor_id] = (settledAmountsMap[sp.debtor_id][sp.creditor_id] || 0) + Number(sp.amount_settled);
    });

    const pTransactions: CalculatedTransaction[] = [];
    for (const debtorId in rawPairwiseDebtsFromExpenses) {
      for (const creditorId in rawPairwiseDebtsFromExpenses[debtorId]) {
        let netAmount = rawPairwiseDebtsFromExpenses[debtorId][creditorId].amount;
        const alreadySettled = settledAmountsMap[debtorId]?.[creditorId] || 0;
        netAmount -= alreadySettled;
        
        if (netAmount > 0.01) {
          pTransactions.push({ 
            from: debtorId, 
            to: creditorId, 
            amount: netAmount,
            contributingExpenseIds: Array.from(rawPairwiseDebtsFromExpenses[debtorId][creditorId].expenseIds)
          });
        }
      }
    }
    pTransactions.sort((a,b) => (peopleMap[a.from] || '').localeCompare(peopleMap[b.from] || '') || (peopleMap[a.to] || '').localeCompare(peopleMap[b.to] || ''));

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

  const handleExpenseCardClick = async (expense: Expense) => {
    if (!db) {
      toast({ title: "Error", description: "Database not available.", variant: "destructive" });
      return;
    }
    setSelectedExpenseForModal('loading');
    setIsExpenseModalOpen(true);
    try {
      const { data, error } = await db
        .from('expenses')
        .select('*')
        .eq('id', expense.id)
        .single();
      if (error || !data) {
        toast({ title: "Error", description: "Could not fetch latest expense details.", variant: "destructive" });
        setSelectedExpenseForModal(null);
        setIsExpenseModalOpen(false);
        return;
      }
      setSelectedExpenseForModal(data as Expense);
    } catch (err) {
      toast({ title: "Error", description: "Could not fetch latest expense details.", variant: "destructive" });
      setSelectedExpenseForModal(null);
      setIsExpenseModalOpen(false);
    }
  };
  
  if (people.length === 0 && expenses.length === 0) {
    return (
      <Card className="text-center py-10 shadow-lg rounded-lg">
        <CardHeader className="pb-2"><CardTitle className="text-xl font-semibold text-primary">Welcome to SettleEase!</CardTitle></CardHeader>
        <CardContent className="space-y-3"><FileText className="mx-auto h-12 w-12 text-primary/70" />
          <p className="text-md text-muted-foreground">No people added and no expenses recorded yet.</p>
          <p className="text-sm">Navigate to "Manage People" to add participants, then to "Add Expense" to start managing your group finances.</p>
        </CardContent>
      </Card>
    );
  }
  if (expenses.length === 0 && settlementPayments.length === 0) {
     return (
      <Card className="text-center py-10 shadow-lg rounded-lg">
        <CardHeader className="pb-2"><CardTitle className="text-xl font-semibold text-primary">Ready to Settle?</CardTitle></CardHeader>
        <CardContent className="space-y-3"><FileText className="mx-auto h-12 w-12 text-primary/70" />
          <p className="text-md text-muted-foreground">No expenses recorded or settlements made yet.</p>
          <p className="text-sm">Navigate to "Add Expense" to start managing your group finances.</p>
           {people.length === 0 && <p className="text-sm mt-2">First, go to "Manage People" to add participants to your group.</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
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
        userRole={userRole} 
      />
      
      <ExpenseLog
        expenses={expenses}
        peopleMap={peopleMap}
        handleExpenseCardClick={handleExpenseCardClick}
        getCategoryIconFromName={getCategoryIconFromName}
      />

      {isExpenseModalOpen && (
        <ExpenseDetailModal
          expense={selectedExpenseForModal}
          isOpen={isExpenseModalOpen}
          onOpenChange={setIsExpenseModalOpen}
          peopleMap={peopleMap}
          getCategoryIconFromName={getCategoryIconFromName}
        />
      )}
    </div>
  );
}
