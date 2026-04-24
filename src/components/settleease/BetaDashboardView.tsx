"use client";

import React, { useState, useMemo } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { FileText, Sparkles } from 'lucide-react';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  ExpenseActivitySkeleton,
  LoadingRegion,
  SettlementActivitySkeleton,
  SkeletonCardHeader,
  SkeletonSectionHeader,
  SkeletonToolbar,
} from './SkeletonLayouts';

import dynamic from 'next/dynamic';

const ExpenseDetailModal = dynamic(() => import('./ExpenseDetailModal'), {
  ssr: false,
});
const CreateBudgetModal = dynamic(() => import('./CreateBudgetModal'), {
  ssr: false,
});
import SettlementSummary from './dashboard/SettlementSummary';
import ExpenseLog from './dashboard/ExpenseLog';

import { calculateSimplifiedTransactions, calculatePairwiseTransactions } from '@/lib/settleease/settlementCalculations';
import type { Person, Expense, Category, SettlementPayment, CalculatedTransaction, UserRole, ManualSettlementOverride } from '@/lib/settleease/types';
import ManualOverrideAlert from './ManualOverrideAlert';

function SettlementSummarySkeleton() {
  return (
    <Card className="w-full min-w-0 overflow-hidden rounded-lg shadow-lg">
      <SkeletonCardHeader
        titleWidth="w-52"
        descriptionWidth="w-full max-w-lg"
        actions={["w-full sm:w-44", "w-full sm:w-32"]}
      />
      <CardContent className="space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-2 rounded-lg bg-muted p-1 sm:grid-cols-2">
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
        </div>
        <div className="rounded-lg border bg-card/50 p-4">
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-full max-w-xl" />
        </div>
        <div className="flex flex-col gap-3 rounded-lg border bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-64 max-w-full" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
        <div className="space-y-3">
          <SkeletonSectionHeader width="w-44" actionWidth="w-24" />
          <ul className="space-y-3">
            {[0, 1, 2].map((item) => (
              <SettlementActivitySkeleton key={item} actions={1} />
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpenseLogSkeleton() {
  return (
    <Card className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg shadow-lg">
      <SkeletonCardHeader
        titleWidth="w-44"
        descriptionWidth="w-full max-w-sm"
        actions={["w-24"]}
      />
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <Skeleton className="h-10 w-full rounded-lg" />
        <SkeletonToolbar count={2} className="grid-cols-1 sm:grid-cols-2" itemClassName="h-10 rounded-lg" />
        <div className="min-h-0 flex-1 space-y-4">
          {[0, 1].map((group) => (
            <div key={group} className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-px flex-1" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-px flex-1" />
              </div>
              <ul className="space-y-3">
                <ExpenseActivitySkeleton showBadge={group === 0} />
                {group === 0 ? <SettlementActivitySkeleton /> : <ExpenseActivitySkeleton />}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading dashboard" className="flex h-full min-h-0 flex-1 flex-col space-y-6 py-2">
      <SettlementSummarySkeleton />
      <ExpenseLogSkeleton />
    </LoadingRegion>
  );
}

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
  const [selectedExpenseForModal, setSelectedExpenseForModal] = useState<Expense | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseModalOpenedFromStep2, setExpenseModalOpenedFromStep2] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
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

  if (isLoading) {
    return <DashboardSkeleton />;
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
        onCreateBudget={() => setIsBudgetModalOpen(true)}
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
      <CreateBudgetModal
        isOpen={isBudgetModalOpen}
        onOpenChange={setIsBudgetModalOpen}
        categories={dynamicCategories}
        getCategoryIconFromName={getCategoryIconFromName}
        userRole={userRole}
      />
    </div>
  );
}
