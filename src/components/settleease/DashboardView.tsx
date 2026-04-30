"use client";

import React, { useState, useMemo } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { FileText, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  ExpenseActivitySkeleton,
  LoadingRegion,
} from './SkeletonLayouts';
import AppEmptyState from './AppEmptyState';

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
    <Card className="w-full h-full flex flex-col shadow-lg rounded-lg">
      <div className="w-full h-full flex flex-col">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-5 shrink-0 rounded" />
              <Skeleton className="h-8 w-52" />
              <Skeleton className="h-8 w-full rounded-full sm:h-9 sm:w-44" />
              <Skeleton className="h-8 w-full rounded-full sm:h-9 sm:w-32" />
            </div>
            <div className="grid w-full grid-cols-2 gap-1 rounded-md bg-muted p-1 sm:w-60">
              <Skeleton className="h-8 rounded-sm" />
              <Skeleton className="h-8 rounded-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
          <div className="flex flex-col gap-2 rounded-md bg-muted/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-4 w-full max-w-2xl" />
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
              <Skeleton className="h-6 w-11 rounded-full" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
          <div className="mt-2 flex min-h-[132px] flex-1 items-center justify-center rounded-md text-center">
            <div className="flex flex-col items-center">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="mt-3 h-5 w-32" />
              <Skeleton className="mt-2 h-3.5 w-56 max-w-[70vw]" />
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function ExpenseLogSkeleton() {
  return (
    <Card className="w-full h-full flex flex-col shadow-lg rounded-lg">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 space-y-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 shrink-0 rounded" />
              <Skeleton className="h-8 w-44" />
            </div>
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-20 shrink-0 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
          <Skeleton className="h-9 rounded-md sm:col-span-6 md:col-span-5" />
          <div className="grid grid-cols-2 gap-2 sm:col-span-6 md:col-span-7">
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
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
                <ExpenseActivitySkeleton />
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
    <LoadingRegion label="Loading dashboard" className="h-full flex-1 flex flex-col space-y-6 md:space-y-8 min-h-0">
      <SettlementSummarySkeleton />
      <div className="flex-1 flex flex-col">
        <ExpenseLogSkeleton />
      </div>
    </LoadingRegion>
  );
}

interface DashboardViewProps {
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

export default function DashboardView({
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
}: DashboardViewProps) {
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
      <AppEmptyState
        icon={Sparkles}
        title="Welcome to SettleEase"
        description='Navigate to "Manage People" to add participants, then to "Add Expense" to start managing your group finances.'
        size="page"
      />
    );
  }

  if (!isLoading && expenses.length === 0 && settlementPayments.length === 0) {
    return (
      <AppEmptyState
        icon={FileText}
        title="Ready to Settle?"
        description='Navigate to "Add Expense" to start managing your group finances.'
        secondaryDescription={people.length === 0 ? 'First, go to "Manage People" to add participants to your group.' : undefined}
        size="page"
      />
    );
  }

  return (
    <div className="h-full flex-1 flex flex-col space-y-6 md:space-y-8 min-h-0">
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
