
"use client";

import React, { useState, useMemo } from 'react';
import { FileText, Settings2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExpenseDetailModal from './ExpenseDetailModal';
import SettlementSummary from './dashboard/SettlementSummary';
import ShareVsPaidChart from './dashboard/ShareVsPaidChart';
import ExpensesByCategoryChart from './dashboard/ExpensesByCategoryChart';
import ExpenseLog from './dashboard/ExpenseLog';

import { AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease/constants';
import type { Person, Expense, Category, SettlementPayment } from '@/lib/settleease/types';

interface DashboardViewProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: Category[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  settlementPayments: SettlementPayment[];
}

export default function DashboardView({ expenses, people, peopleMap, dynamicCategories, getCategoryIconFromName, settlementPayments }: DashboardViewProps) {
  const [selectedExpenseForModal, setSelectedExpenseForModal] = useState<Expense | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [simplifySettlement, setSimplifySettlement] = useState(true);

  const settlement = useMemo(() => {
    if (people.length === 0) return [];

    // Calculate initial balances from expenses
    const balances: Record<string, number> = {};
    people.forEach(p => balances[p.id] = 0);

    expenses.forEach(expense => {
      if (Array.isArray(expense.paid_by)) {
        expense.paid_by.forEach(payment => {
          balances[payment.personId] = (balances[payment.personId] || 0) + Number(payment.amount);
        });
      }
      if (Array.isArray(expense.shares)) {
          expense.shares.forEach(share => {
            balances[share.personId] = (balances[share.personId] || 0) - Number(share.amount);
          });
      }
    });
    
    // Adjust balances based on settlement_payments
    settlementPayments.forEach(payment => {
        if (balances[payment.debtor_id] !== undefined) {
            balances[payment.debtor_id] += Number(payment.amount_settled);
        }
        if (balances[payment.creditor_id] !== undefined) {
            balances[payment.creditor_id] -= Number(payment.amount_settled);
        }
    });


    if (simplifySettlement) {
      const debtors = Object.entries(balances).filter(([_, bal]) => bal < -0.01).map(([id, bal]) => ({ id, amount: bal })).sort((a, b) => a.amount - b.amount);
      const creditors = Object.entries(balances).filter(([_, bal]) => bal > 0.01).map(([id, bal]) => ({ id, amount: bal })).sort((a, b) => b.amount - a.amount);
      const transactions: { from: string, to: string, amount: number }[] = [];
      let debtorIdx = 0, creditorIdx = 0;
      while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
        const debtor = debtors[debtorIdx], creditor = creditors[creditorIdx];
        const amountToSettle = Math.min(-debtor.amount, creditor.amount);
        if (amountToSettle > 0.01) {
          transactions.push({ from: debtor.id, to: creditor.id, amount: amountToSettle });
          debtor.amount += amountToSettle;
          creditor.amount -= amountToSettle;
        }
        if (Math.abs(debtor.amount) < 0.01) debtorIdx++;
        if (Math.abs(creditor.amount) < 0.01) creditorIdx++;
      }
      return transactions;
    } else { // Non-simplified view
      // 1. Calculate raw pairwise debts from expenses
      const pairwiseDebts: Record<string, Record<string, number>> = {};
      expenses.forEach(expense => {
        if (expense.total_amount <= 0.001) return;
        expense.shares.forEach(share => {
          const sharerId = share.personId;
          const sharerTotalOwedForThisExpense = Number(share.amount);
          if (sharerTotalOwedForThisExpense <= 0.001) return;

          expense.paid_by.forEach(payment => {
            const payerId = payment.personId;
            const payerAmountForThisExpense = Number(payment.amount);
            if (payerAmountForThisExpense <= 0.001) return;

            if (sharerId !== payerId) {
              const proportionPaidByThisPayer = payerAmountForThisExpense / expense.total_amount;
              const amountOwedBySharerToThisPayer = sharerTotalOwedForThisExpense * proportionPaidByThisPayer;

              if (amountOwedBySharerToThisPayer > 0.001) {
                if (!pairwiseDebts[sharerId]) pairwiseDebts[sharerId] = {};
                pairwiseDebts[sharerId][payerId] = (pairwiseDebts[sharerId][payerId] || 0) + amountOwedBySharerToThisPayer;
              }
            }
          });
        });
      });

      // 2. Create a map of settled amounts from settlementPayments
      const settledAmountsMap: Record<string, Record<string, number>> = {};
      settlementPayments.forEach(sp => {
        if (!settledAmountsMap[sp.debtor_id]) settledAmountsMap[sp.debtor_id] = {};
        settledAmountsMap[sp.debtor_id][sp.creditor_id] = (settledAmountsMap[sp.debtor_id][sp.creditor_id] || 0) + Number(sp.amount_settled);
      });

      // 3. Adjust pairwiseDebts with settledAmountsMap
      const nonSimplifiedTxns: { from: string, to: string, amount: number }[] = [];
      for (const debtorId in pairwiseDebts) {
        for (const creditorId in pairwiseDebts[debtorId]) {
          let amount = pairwiseDebts[debtorId][creditorId];
          const alreadySettled = settledAmountsMap[debtorId]?.[creditorId] || 0;
          const netAmount = amount - alreadySettled;
          
          if (netAmount > 0.01) {
            nonSimplifiedTxns.push({ from: debtorId, to: creditorId, amount: netAmount });
          }
        }
      }
      nonSimplifiedTxns.sort((a,b) => (peopleMap[a.from] || '').localeCompare(peopleMap[b.from] || '') || (peopleMap[a.to] || '').localeCompare(peopleMap[b.to] || ''));
      return nonSimplifiedTxns;
    }
  }, [expenses, people, settlementPayments, simplifySettlement, peopleMap]);

  const shareVsPaidData = useMemo(() => {
    if (!people.length) return [];

    return people.map(person => {
      let totalPaidByPerson = 0;
      let totalShareForPerson = 0;

      expenses.forEach(expense => {
        if (Array.isArray(expense.paid_by)) {
          expense.paid_by.forEach(payment => {
            if (payment.personId === person.id) {
              totalPaidByPerson += Number(payment.amount);
            }
          });
        }
        if (Array.isArray(expense.shares)) {
          expense.shares.forEach(share => {
            if (share.personId === person.id) {
              totalShareForPerson += Number(share.amount);
            }
          });
        }
      });
      return {
        name: peopleMap[person.id] || person.name,
        paid: totalPaidByPerson,
        share: totalShareForPerson,
      };
    }).filter(d => d.paid > 0.01 || d.share > 0.01); 
  }, [expenses, people, peopleMap]);
  

  const expensesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    expenses.forEach(exp => {
      const categoryName = exp.category || "Uncategorized";
      data[categoryName] = (data[categoryName] || 0) + Number(exp.total_amount);
    });
    return Object.entries(data).map(([name, amount]) => ({ name, amount: Number(amount) })).filter(d => d.amount > 0.01);
  }, [expenses]);

  const handleExpenseCardClick = (expense: Expense) => {
    setSelectedExpenseForModal(expense);
    setIsExpenseModalOpen(true);
  };
  
  const settlementCardDescription = simplifySettlement
    ? "Minimum transactions required to settle all debts."
    : "Detailed pairwise debts reflecting direct expense involvements.";

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
  if (expenses.length === 0 && settlementPayments.length === 0) { // Check settlementPayments too
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
    <div className="space-y-6">
      <SettlementSummary
        settlement={settlement}
        peopleMap={peopleMap}
        simplifySettlement={simplifySettlement}
        setSimplifySettlement={setSimplifySettlement}
        settlementCardDescription={settlementCardDescription}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <ShareVsPaidChart shareVsPaidData={shareVsPaidData} />
        <ExpensesByCategoryChart expensesByCategory={expensesByCategory} />
      </div>

      <ExpenseLog
        expenses={expenses}
        peopleMap={peopleMap}
        handleExpenseCardClick={handleExpenseCardClick}
        getCategoryIconFromName={getCategoryIconFromName}
      />

      {selectedExpenseForModal && (
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
