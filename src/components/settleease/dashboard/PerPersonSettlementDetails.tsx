"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CheckCircle2,
  Undo2,
  ExternalLink,
  User,
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Handshake,
  Info,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import { calculateNetBalances } from "@/lib/settleease/settlementCalculations";
import type {
  Person,
  Expense,
  SettlementPayment,
  CalculatedTransaction,
  UserRole,
} from "@/lib/settleease/types";
import RelevantExpensesModal from "./RelevantExpensesModal";

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
  isLoadingParent: boolean;
  setIsLoadingParent: (loading: boolean) => void;
  userRole: UserRole;
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
  isLoadingParent,
  setIsLoadingParent,
  userRole,
}: PerPersonSettlementDetailsProps) {
  const [relevantExpenses, setRelevantExpenses] = useState<Expense[]>([]);
  const [isRelevantExpensesModalOpen, setIsRelevantExpensesModalOpen] =
    useState(false);
  const [modalTitle, setModalTitle] = useState("");

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

  const personDebtsPairwise = useMemo(
    () => pairwiseTransactions.filter((t) => t.from === selectedPerson.id),
    [pairwiseTransactions, selectedPerson.id]
  );

  const personCreditsPairwise = useMemo(
    () => pairwiseTransactions.filter((t) => t.to === selectedPerson.id),
    [pairwiseTransactions, selectedPerson.id]
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
    setModalTitle(
      `Expenses related to ${
        type === "debt" ? peopleMap[debtorId] : peopleMap[creditorId]
      }'s payment to ${
        type === "debt" ? peopleMap[creditorId] : peopleMap[debtorId]
      }`
    );
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

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Step 1: Person Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg font-bold">
            <User className="mr-2 h-5 w-5 text-blue-600" />
            Step 1: {selectedPerson.name}'s Financial Overview
          </CardTitle>
          <CardDescription className="text-sm">
            Complete financial summary including expenses, payments, and
            settlements
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Status Badge */}
          <div className="flex items-center justify-center mb-4">
            {personSummary.isBalanced ? (
              <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-2 text-sm font-medium">
                <CheckCircle className="mr-2 h-4 w-4" />
                All Settled Up!
              </Badge>
            ) : personSummary.netBalance > 0 ? (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-4 py-2 text-sm font-medium">
                <TrendingUp className="mr-2 h-4 w-4" />
                Owed {formatCurrency(personSummary.netBalance)}
              </Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200 px-4 py-2 text-sm font-medium">
                <TrendingDown className="mr-2 h-4 w-4" />
                Owes {formatCurrency(Math.abs(personSummary.netBalance))}
              </Badge>
            )}
          </div>

          {/* Financial Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-green-50 dark:bg-green-950/20 p-3 sm:p-4 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-sm min-w-0">
              <div className="flex items-center space-x-2 min-w-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-lg font-bold text-green-900 dark:text-green-100 truncate">
                    {formatCurrency(personSummary.totalPaid)}
                  </p>
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                    Total Paid
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/20 p-3 sm:p-4 rounded-xl border-2 border-orange-300 dark:border-orange-700 shadow-sm min-w-0">
              <div className="flex items-center space-x-2 min-w-0">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-lg font-bold text-orange-900 dark:text-orange-100 truncate">
                    {formatCurrency(personSummary.totalOwed)}
                  </p>
                  <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">
                    Total Owed
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/20 p-3 sm:p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700 shadow-sm min-w-0">
              <div className="flex items-center space-x-2 min-w-0">
                <Handshake className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-lg font-bold text-purple-900 dark:text-purple-100 truncate">
                    {formatCurrency(personSummary.totalSettledAsDebtor)}
                  </p>
                  <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">
                    Paid Out
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 sm:p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-sm min-w-0">
              <div className="flex items-center space-x-2 min-w-0">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-lg font-bold text-blue-900 dark:text-blue-100 truncate">
                    {formatCurrency(Math.abs(personSummary.netBalance))}
                  </p>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                    Net Balance
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Summary */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Involved in {personExpenses.length} expenses
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRelevantExpenses(personExpenses);
                  setModalTitle(
                    `All expenses involving ${selectedPerson.name}`
                  );
                  setIsRelevantExpensesModalOpen(true);
                }}
                className="text-xs"
              >
                <ExternalLink className="mr-1 h-4 w-4" />
                View All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Settlement Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg font-bold">
            <Handshake className="mr-2 h-5 w-5 text-purple-600" />
            Step 2: Current Settlement Status
          </CardTitle>
          <CardDescription className="text-sm">
            {personSummary.isBalanced
              ? "This person is balanced - their debts and credits cancel out"
              : "Outstanding debts and credits requiring settlement"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {personSummary.isBalanced ? (
            /* Balanced Person Explanation */
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-sm">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-4">
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    How {selectedPerson.name} Achieved Balance
                  </h4>

                  {/* Step-by-step calculation breakdown */}
                  <div className="space-y-4">
                    {/* Step 1: What they paid */}
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-900 dark:text-green-100 flex items-center">
                          <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                          Step 1: Total Paid by {selectedPerson.name}
                        </span>
                        <span className="font-bold text-green-600">
                          +{formatCurrency(personSummary.totalPaid)}
                        </span>
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                        {personExpenses
                          .filter((exp) =>
                            exp.paid_by?.some(
                              (p) => p.personId === selectedPerson.id
                            )
                          )
                          .map((expense, i) => {
                            const payment = expense.paid_by?.find(
                              (p) => p.personId === selectedPerson.id
                            );
                            return (
                              <div key={i} className="flex justify-between">
                                <span>• {expense.description}</span>
                                <span>
                                  +{formatCurrency(payment?.amount || 0)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Step 2: What they owe */}
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-900 dark:text-green-100 flex items-center">
                          <Receipt className="mr-2 h-4 w-4 text-orange-600" />
                          Step 2: Total Owed by {selectedPerson.name}
                        </span>
                        <span className="font-bold text-orange-600">
                          -{formatCurrency(personSummary.totalOwed)}
                        </span>
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                        {personExpenses
                          .filter(
                            (exp) =>
                              exp.shares?.some(
                                (s) => s.personId === selectedPerson.id
                              ) ||
                              exp.celebration_contribution?.personId ===
                                selectedPerson.id
                          )
                          .map((expense, i) => {
                            const share = expense.shares?.find(
                              (s) => s.personId === selectedPerson.id
                            );
                            const celebration =
                              expense.celebration_contribution?.personId ===
                              selectedPerson.id
                                ? expense.celebration_contribution.amount
                                : 0;
                            const total = (share?.amount || 0) + celebration;
                            return (
                              <div key={i} className="flex justify-between">
                                <span>
                                  • {expense.description}
                                  {celebration > 0 && " (+ celebration)"}
                                </span>
                                <span>-{formatCurrency(total)}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Step 3: Settlement payments */}
                    {(personSummary.totalSettledAsDebtor > 0 ||
                      personSummary.totalSettledAsCreditor > 0) && (
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-green-900 dark:text-green-100 flex items-center">
                            <Handshake className="mr-2 h-4 w-4 text-purple-600" />
                            Step 3: Settlement Adjustments
                          </span>
                          <span className="font-bold text-purple-600">
                            {personSummary.totalSettledAsDebtor >
                            personSummary.totalSettledAsCreditor
                              ? `+${formatCurrency(
                                  personSummary.totalSettledAsDebtor -
                                    personSummary.totalSettledAsCreditor
                                )}`
                              : `-${formatCurrency(
                                  personSummary.totalSettledAsCreditor -
                                    personSummary.totalSettledAsDebtor
                                )}`}
                          </span>
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                          {personRecordedPayments.map((payment, i) => (
                            <div key={i} className="flex justify-between">
                              <span>
                                •{" "}
                                {payment.debtor_id === selectedPerson.id
                                  ? `Paid ${peopleMap[payment.creditor_id]}`
                                  : `Received from ${
                                      peopleMap[payment.debtor_id]
                                    }`}
                              </span>
                              <span>
                                {payment.debtor_id === selectedPerson.id
                                  ? "+"
                                  : "-"}
                                {formatCurrency(payment.amount_settled)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 4: Final calculation */}
                    <div className="p-3 bg-green-100 dark:bg-green-800/50 rounded-lg border-2 border-green-300 dark:border-green-600">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-green-900 dark:text-green-100 flex items-center">
                          <Calculator className="mr-2 h-4 w-4 text-green-600" />
                          Final Balance Calculation
                        </span>
                      </div>
                      <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                        <div className="flex justify-between">
                          <span>Total Paid:</span>
                          <span className="font-mono">
                            +{formatCurrency(personSummary.totalPaid)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Owed:</span>
                          <span className="font-mono">
                            -{formatCurrency(personSummary.totalOwed)}
                          </span>
                        </div>
                        {personSummary.totalSettledAsDebtor > 0 && (
                          <div className="flex justify-between">
                            <span>Settlement Payments Made:</span>
                            <span className="font-mono">
                              +
                              {formatCurrency(
                                personSummary.totalSettledAsDebtor
                              )}
                            </span>
                          </div>
                        )}
                        {personSummary.totalSettledAsCreditor > 0 && (
                          <div className="flex justify-between">
                            <span>Settlement Payments Received:</span>
                            <span className="font-mono">
                              -
                              {formatCurrency(
                                personSummary.totalSettledAsCreditor
                              )}
                            </span>
                          </div>
                        )}
                        <hr className="border-green-300 dark:border-green-600" />
                        <div className="flex justify-between font-bold text-base">
                          <span>Net Balance:</span>
                          <span className="font-mono text-green-600">
                            {formatCurrency(personSummary.netBalance)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Individual pairwise relationships (if any) */}
                    {(personDebtsPairwise.length > 0 ||
                      personCreditsPairwise.length > 0) && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                          <AlertCircle className="mr-2 h-4 w-4 text-blue-600" />
                          Individual Pairwise Relationships
                        </h5>
                        <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
                          While {selectedPerson.name} is balanced overall, they
                          still have individual debts and credits that cancel
                          each other out:
                        </p>

                        <div className="space-y-2">
                          {personDebtsPairwise.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                                Owes to others:
                              </p>
                              <div className="space-y-1">
                                {personDebtsPairwise.map((debt, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800"
                                  >
                                    <span className="flex items-center">
                                      <ArrowRight className="mr-1 h-3 w-3 text-red-600" />
                                      Owes {peopleMap[debt.to]}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-mono text-red-600">
                                        {formatCurrency(debt.amount)}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleViewRelevantExpenses(
                                            debt,
                                            "debt"
                                          )
                                        }
                                        className="text-xs h-6 px-2"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {personCreditsPairwise.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                                Owed by others:
                              </p>
                              <div className="space-y-1">
                                {personCreditsPairwise.map((credit, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800"
                                  >
                                    <span className="flex items-center">
                                      <ArrowRight className="mr-1 h-3 w-3 text-green-600 rotate-180" />
                                      {peopleMap[credit.from]} owes them
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-mono text-green-600">
                                        {formatCurrency(credit.amount)}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleViewRelevantExpenses(
                                            credit,
                                            "credit"
                                          )
                                        }
                                        className="text-xs h-6 px-2"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-800/30 rounded text-xs text-blue-800 dark:text-blue-200">
                            <strong>Why these are hidden:</strong> Since{" "}
                            {selectedPerson.name}'s total debts (
                            {formatCurrency(
                              personDebtsPairwise.reduce(
                                (sum, d) => sum + d.amount,
                                0
                              )
                            )}
                            ) equal their total credits (
                            {formatCurrency(
                              personCreditsPairwise.reduce(
                                (sum, c) => sum + c.amount,
                                0
                              )
                            )}
                            ), no actual money needs to change hands involving
                            them. The main settlement view only shows
                            transactions that require action.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Active Debts/Credits */
            <div className="space-y-4">
              {/* Simplified Transactions */}
              {(personDebtsSimplified.length > 0 ||
                personCreditsSimplified.length > 0) && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Calculator className="mr-2 h-4 w-4 text-blue-600" />
                    Optimized Settlements
                  </h4>

                  {personDebtsSimplified.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        Needs to Pay:
                      </p>
                      <div className="space-y-2">
                        {personDebtsSimplified.map((debt, i) => (
                          <Card
                            key={i}
                            className="bg-red-50 dark:bg-red-950/20 p-3 border-red-200 dark:border-red-800"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <ArrowRight className="h-4 w-4 text-red-600 flex-shrink-0" />
                                <span className="text-sm min-w-0">
                                  Pay <strong className="truncate">{peopleMap[debt.to]}</strong>:{" "}
                                  <span className="font-semibold">{formatCurrency(debt.amount)}</span>
                                </span>
                              </div>
                              <div className="flex space-x-2 flex-shrink-0 w-full sm:w-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleViewRelevantExpenses(debt, "debt")
                                  }
                                  className="text-xs flex-1 sm:flex-none"
                                >
                                  <ExternalLink className="mr-1 h-4 w-4" />
                                  Expenses
                                </Button>
                                {userRole === "admin" && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleInternalMarkAsPaid(debt)
                                    }
                                    disabled={isLoadingParent}
                                    className="text-xs bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                                  >
                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                    Mark Paid
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {personCreditsSimplified.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Will Receive:
                      </p>
                      <div className="space-y-2">
                        {personCreditsSimplified.map((credit, i) => (
                          <Card
                            key={i}
                            className="bg-green-50 dark:bg-green-950/20 p-3 border-green-200 dark:border-green-800"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <ArrowRight className="h-4 w-4 text-green-600 rotate-180 flex-shrink-0" />
                                <span className="text-sm min-w-0">
                                  <strong className="truncate">{peopleMap[credit.from]}</strong> will
                                  pay: <span className="font-semibold">{formatCurrency(credit.amount)}</span>
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleViewRelevantExpenses(credit, "credit")
                                }
                                className="text-xs w-full sm:w-auto flex-shrink-0"
                              >
                                <ExternalLink className="mr-1 h-4 w-4" />
                                Expenses
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Payment History */}
      {personRecordedPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg font-bold">
              <Receipt className="mr-2 h-5 w-5 text-green-600" />
              Step 3: Payment History
            </CardTitle>
            <CardDescription className="text-sm">
              Recorded settlement payments involving {selectedPerson.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-auto max-h-60">
              <div className="space-y-2">
                {personRecordedPayments.map((payment) => (
                  <Card key={payment.id} className="bg-card/50 p-3 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex-grow text-sm">
                        <div className="flex items-center space-x-2">
                          {payment.debtor_id === selectedPerson.id ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          )}
                          <span>
                            {payment.debtor_id === selectedPerson.id ? (
                              <>
                                Paid{" "}
                                <strong>
                                  {peopleMap[payment.creditor_id]}
                                </strong>
                              </>
                            ) : (
                              <>
                                <strong>{peopleMap[payment.debtor_id]}</strong>{" "}
                                paid you
                              </>
                            )}
                          </span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(payment.amount_settled)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(payment.settled_at).toLocaleDateString()}
                        </p>
                      </div>
                      {userRole === "admin" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleInternalUnmarkPayment(payment)}
                          disabled={isLoadingParent}
                          className="text-xs"
                        >
                          <Undo2 className="mr-1 h-4 w-4" />
                          Unmark
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <RelevantExpensesModal
        isOpen={isRelevantExpensesModalOpen}
        onOpenChange={setIsRelevantExpensesModalOpen}
        expensesToList={relevantExpenses}
        onExpenseClick={(expense) => {
          setIsRelevantExpensesModalOpen(false);
          onViewExpenseDetails(expense);
        }}
        modalTitle={modalTitle}
        peopleMap={peopleMap}
      />
    </div>
  );
}
