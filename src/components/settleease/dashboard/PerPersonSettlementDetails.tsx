"use client";

import React, { useState, useMemo } from "react";
import { calculateNetBalances } from "@/lib/settleease/settlementCalculations";
import type {
  Person,
  Expense,
  SettlementPayment,
  CalculatedTransaction,
  UserRole,
} from "@/lib/settleease/types";
import RelevantExpensesModal from "./RelevantExpensesModal";
import ExpenseDetailModal from "../ExpenseDetailModal";
import PersonBalanceOverview from "./person-settlement/PersonBalanceOverview";
import PersonExpenseBreakdown from "./person-settlement/PersonExpenseBreakdown";
import PersonSettlementStatus from "./person-settlement/PersonSettlementStatus";
import PersonPaymentHistory from "./person-settlement/PersonPaymentHistory";

interface PerPersonSettlementDetailsProps {
  selectedPerson: Person;
  peopleMap: Record<string, string>;
  allExpenses: Expense[];
  settlementPayments: SettlementPayment[];
  simplifiedTransactions: CalculatedTransaction[];
  pairwiseTransactions: CalculatedTransaction[];
  onMarkAsPaid: (transaction: CalculatedTransaction) => Promise<void>;
  onUnmarkSettlementPayment: (payment: SettlementPayment) => Promise<void>;
  onViewExpenseDetails: (expense: Expense) => void;

  getCategoryIconFromName: (
    categoryName: string
  ) => React.FC<React.SVGProps<SVGSVGElement>>;
  categories: any[];
  isLoadingParent: boolean;
  setIsLoadingParent: (loading: boolean) => void;
  userRole: UserRole;
  onOpenHowItWorksModal?: () => void;
}

export default function PerPersonSettlementDetails({
  selectedPerson,
  peopleMap,
  allExpenses,
  settlementPayments,
  simplifiedTransactions,
  pairwiseTransactions,
  onMarkAsPaid,
  onUnmarkSettlementPayment,
  onViewExpenseDetails,

  getCategoryIconFromName,
  categories,
  isLoadingParent,
  setIsLoadingParent,
  userRole,
  onOpenHowItWorksModal,
}: PerPersonSettlementDetailsProps) {
  const [relevantExpenses, setRelevantExpenses] = useState<Expense[]>([]);
  const [isRelevantExpensesModalOpen, setIsRelevantExpensesModalOpen] =
    useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [preservedModalTitle, setPreservedModalTitle] = useState("");
  const [selectedExpenseFromModal, setSelectedExpenseFromModal] =
    useState<Expense | null>(null);
  const [isExpenseDetailFromModalOpen, setIsExpenseDetailFromModalOpen] =
    useState(false);

  // Calculate person's financial summary
  const personSummary = useMemo(() => {
    const netBalances = calculateNetBalances(
      [selectedPerson],
      allExpenses,
      settlementPayments
    );
    const netBalance = netBalances[selectedPerson.id] || 0;

    let totalPaid = 0;
    let totalOwed = 0;
    let totalSettledAsDebtor = 0;
    let totalSettledAsCreditor = 0;

    // Calculate totals from expenses
    allExpenses.forEach((expense) => {
      // What they paid
      expense.paid_by?.forEach((payment) => {
        if (payment.personId === selectedPerson.id) {
          totalPaid += Number(payment.amount);
        }
      });

      // What they owe (shares + celebration contributions)
      expense.shares?.forEach((share) => {
        if (share.personId === selectedPerson.id) {
          totalOwed += Number(share.amount);
        }
      });

      // Celebration contributions
      if (expense.celebration_contribution?.personId === selectedPerson.id) {
        totalOwed += Number(expense.celebration_contribution.amount);
      }
    });

    // Calculate settlement totals
    settlementPayments.forEach((payment) => {
      if (payment.debtor_id === selectedPerson.id) {
        totalSettledAsDebtor += Number(payment.amount_settled);
      }
      if (payment.creditor_id === selectedPerson.id) {
        totalSettledAsCreditor += Number(payment.amount_settled);
      }
    });

    return {
      netBalance,
      totalPaid,
      totalOwed,
      totalSettledAsDebtor,
      totalSettledAsCreditor,
      isBalanced: Math.abs(netBalance) <= 0.01,
    };
  }, [selectedPerson, allExpenses, settlementPayments]);

  const personDebtsSimplified = useMemo(
    () => simplifiedTransactions.filter((t) => t.from === selectedPerson.id),
    [simplifiedTransactions, selectedPerson.id]
  );

  const personCreditsSimplified = useMemo(
    () => simplifiedTransactions.filter((t) => t.to === selectedPerson.id),
    [simplifiedTransactions, selectedPerson.id]
  );

  const personRecordedPayments = useMemo(
    () =>
      settlementPayments
        .filter(
          (p) =>
            p.debtor_id === selectedPerson.id ||
            p.creditor_id === selectedPerson.id
        )
        .sort(
          (a, b) =>
            new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime()
        ),
    [settlementPayments, selectedPerson.id]
  );

  // Get expenses involving this person
  const personExpenses = useMemo(() => {
    return allExpenses.filter((expense) => {
      const isPayer = expense.paid_by?.some(
        (p) => p.personId === selectedPerson.id
      );
      const isSharer = expense.shares?.some(
        (s) => s.personId === selectedPerson.id
      );
      const isContributor =
        expense.celebration_contribution?.personId === selectedPerson.id;
      return isPayer || isSharer || isContributor;
    });
  }, [allExpenses, selectedPerson.id]);

  const handleViewRelevantExpenses = (
    transaction: CalculatedTransaction,
    type: "debt" | "credit"
  ) => {
    const relevant: Expense[] = [];
    const debtorId = type === "debt" ? transaction.from : transaction.to;
    const creditorId = type === "debt" ? transaction.to : transaction.from;

    if (
      transaction.contributingExpenseIds &&
      transaction.contributingExpenseIds.length > 0
    ) {
      transaction.contributingExpenseIds.forEach((expId) => {
        const expense = allExpenses.find((e) => e.id === expId);
        if (expense) relevant.push(expense);
      });
    } else {
      allExpenses.forEach((exp) => {
        const involvesDebtorAsSharer = exp.shares?.some(
          (s) => s.personId === debtorId && s.amount > 0
        );
        const involvesCreditorAsPayer = exp.paid_by?.some(
          (p) => p.personId === creditorId && p.amount > 0
        );

        const involvesDebtorAsPayer = exp.paid_by?.some(
          (p) => p.personId === debtorId && p.amount > 0
        );
        const involvesCreditorAsSharer = exp.shares?.some(
          (s) => s.personId === creditorId && s.amount > 0
        );

        if (
          (involvesDebtorAsSharer && involvesCreditorAsPayer) ||
          (involvesDebtorAsPayer && involvesCreditorAsSharer)
        ) {
          if (!relevant.find((r) => r.id === exp.id)) {
            relevant.push(exp);
          }
        }
      });
    }
    setRelevantExpenses(relevant);
    const title = `Expenses related to ${
      type === "debt" ? peopleMap[debtorId] : peopleMap[creditorId]
    }'s payment to ${
      type === "debt" ? peopleMap[creditorId] : peopleMap[debtorId]
    }`;
    setModalTitle(title);
    setPreservedModalTitle(title);
    setIsRelevantExpensesModalOpen(true);
  };

  const handleViewAllExpenses = () => {
    setRelevantExpenses(personExpenses);
    const title = `All expenses involving ${selectedPerson.name}`;
    setModalTitle(title);
    setPreservedModalTitle(title);
    setIsRelevantExpensesModalOpen(true);
  };

  const handleInternalMarkAsPaid = async (
    transaction: CalculatedTransaction
  ) => {
    setIsLoadingParent(true);
    await onMarkAsPaid(transaction);
    setIsLoadingParent(false);
  };

  const handleInternalUnmarkPayment = async (payment: SettlementPayment) => {
    setIsLoadingParent(true);
    await onUnmarkSettlementPayment(payment);
    setIsLoadingParent(false);
  };

  const handleBackFromExpenseModal = () => {
    setIsExpenseDetailFromModalOpen(false);
    setSelectedExpenseFromModal(null);
    // RelevantExpensesModal stays open
  };

  return (
    <div className="space-y-4 sm:space-y-6 prevent-horizontal-scroll">
      {/* Step 1: Person Balance Overview */}
      <PersonBalanceOverview
        selectedPerson={selectedPerson}
        personSummary={personSummary}
        personExpenses={personExpenses}
        onViewAllExpenses={handleViewAllExpenses}
      />

      {/* Step 2: How Balance Was Calculated */}
      <PersonExpenseBreakdown
        selectedPerson={selectedPerson}
        personSummary={personSummary}
        personExpenses={personExpenses}
        peopleMap={peopleMap}
        onViewExpenseDetails={onViewExpenseDetails}
      />

      {/* Step 3: Current Settlement Status */}
      <PersonSettlementStatus
        selectedPerson={selectedPerson}
        personSummary={personSummary}
        personDebtsSimplified={personDebtsSimplified}
        personCreditsSimplified={personCreditsSimplified}
        peopleMap={peopleMap}
        userRole={userRole}
        isLoadingParent={isLoadingParent}
        onMarkAsPaid={handleInternalMarkAsPaid}
        onViewRelevantExpenses={handleViewRelevantExpenses}
        onOpenHowItWorksModal={onOpenHowItWorksModal}
      />

      {/* Payment History (if any) */}
      <PersonPaymentHistory
        selectedPerson={selectedPerson}
        personRecordedPayments={personRecordedPayments}
        peopleMap={peopleMap}
        userRole={userRole}
        isLoadingParent={isLoadingParent}
        onUnmarkPayment={handleInternalUnmarkPayment}
      />

      <RelevantExpensesModal
        isOpen={isRelevantExpensesModalOpen}
        onOpenChange={setIsRelevantExpensesModalOpen}
        expensesToList={relevantExpenses}
        onExpenseClick={(expense) => {
          setSelectedExpenseFromModal(expense);
          setIsExpenseDetailFromModalOpen(true);
        }}
        modalTitle={preservedModalTitle || modalTitle}
        peopleMap={peopleMap}
      />

      {/* ExpenseDetailModal with back button when opened from RelevantExpensesModal */}
      {selectedExpenseFromModal && (
        <ExpenseDetailModal
          isOpen={isExpenseDetailFromModalOpen}
          onOpenChange={setIsExpenseDetailFromModalOpen}
          expense={selectedExpenseFromModal}
          peopleMap={peopleMap}
          getCategoryIconFromName={getCategoryIconFromName}
          categories={categories}
          showBackButton={true}
          onBack={handleBackFromExpenseModal}
        />
      )}
    </div>
  );
}
