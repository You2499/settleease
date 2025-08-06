"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Users,
  Handshake,
  CheckCircle2,
  FileText,
  Info,
  BarChart3,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  Person,
  Expense,
  SettlementPayment,
  CalculatedTransaction,
  UserRole,
} from "@/lib/settleease/types";
import PerPersonSettlementDetails from "./PerPersonSettlementDetails";

interface SettlementSummaryProps {
  simplifiedTransactions: CalculatedTransaction[];
  pairwiseTransactions: CalculatedTransaction[];
  allExpenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  settlementPayments: SettlementPayment[];
  onMarkAsPaid: (transaction: CalculatedTransaction) => Promise<void>;
  onUnmarkSettlementPayment: (payment: SettlementPayment) => Promise<void>;
  onViewExpenseDetails: (expense: Expense) => void;
  userRole: UserRole;
}

export default function SettlementSummary({
  simplifiedTransactions,
  pairwiseTransactions,
  allExpenses,
  people,
  peopleMap,
  settlementPayments,
  onMarkAsPaid,
  onUnmarkSettlementPayment,
  onViewExpenseDetails,
  userRole,
}: SettlementSummaryProps) {
  const [viewMode, setViewMode] = useState<"overview" | "person">("overview");
  const [simplifySettlement, setSimplifySettlement] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const transactionsToDisplay = simplifySettlement
    ? simplifiedTransactions
    : pairwiseTransactions;

  const overviewDescription = simplifySettlement
    ? "Minimum transactions required to settle all debts."
    : "Detailed pairwise debts reflecting direct expense involvements and payments.";

  const handleInternalMarkAsPaid = async (
    transaction: CalculatedTransaction
  ) => {
    setIsLoading(true);
    await onMarkAsPaid(transaction);
    setIsLoading(false);
  };

  const selectedPersonObject = useMemo(() => {
    if (!selectedPersonId) return null;
    return people.find((p) => p.id === selectedPersonId) || null;
  }, [selectedPersonId, people]);

  // Filter out paid transactions for visualization
  const unpaidPairwiseTransactions = useMemo(() => {
    return pairwiseTransactions.filter((txn) => {
      // Check if this transaction has been fully settled
      const settledAmount = settlementPayments
        .filter(
          (payment) =>
            payment.debtor_id === txn.from && payment.creditor_id === txn.to
        )
        .reduce((sum, payment) => sum + Number(payment.amount_settled), 0);

      // Only include if there's still an outstanding amount
      return Number(txn.amount) > settledAmount;
    });
  }, [pairwiseTransactions, settlementPayments]);

  const unpaidSimplifiedTransactions = useMemo(() => {
    return simplifiedTransactions.filter((txn) => {
      // Check if this transaction has been fully settled
      const settledAmount = settlementPayments
        .filter(
          (payment) =>
            payment.debtor_id === txn.from && payment.creditor_id === txn.to
        )
        .reduce((sum, payment) => sum + Number(payment.amount_settled), 0);

      // Only include if there's still an outstanding amount
      return Number(txn.amount) > settledAmount;
    });
  }, [simplifiedTransactions, settlementPayments]);

  return (
    <Card className="w-full h-full flex flex-col shadow-lg rounded-lg">
      <Tabs
        value={viewMode}
        onValueChange={(value) => setViewMode(value as "overview" | "person")}
        className="w-full h-full flex flex-col"
      >
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                <Handshake className="mr-2 h-5 w-5 text-primary" /> Settlement
                Hub
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsInfoModalOpen(true)}
              >
                <Info className="mr-1 h-4 w-4" /> Visualize
              </Button>
            </div>
            <TabsList className="grid w-full grid-cols-2 sm:w-auto text-xs sm:text-sm">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="person">Per Person</TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
          <TabsContent
            value="overview"
            className="mt-0 flex-1 flex flex-col min-h-0"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/50 px-3 py-2 rounded-md gap-2">
              <CardDescription className="text-xs sm:text-sm flex-grow pr-2">
                {overviewDescription}
              </CardDescription>
              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                <Switch
                  id="simplify-settlement-toggle"
                  checked={simplifySettlement}
                  onCheckedChange={setSimplifySettlement}
                  aria-label="Toggle settlement simplification"
                  disabled={isLoading}
                />
                <Label
                  htmlFor="simplify-settlement-toggle"
                  className="text-xs sm:text-sm font-medium"
                >
                  Simplify
                </Label>
              </div>
            </div>
            {transactionsToDisplay.length > 0 ? (
              <ScrollArea className="flex-1 min-h-0 border rounded-md p-1 mt-2">
                <ul className="space-y-2 p-2">
                  {transactionsToDisplay.map((txn, i) => (
                    <li key={`${txn.from}-${txn.to}-${i}-${txn.amount}`}>
                      <Card className="bg-card/70 px-2 py-2 shadow-sm rounded-md">
                        <div className="grid grid-cols-1 sm:grid-cols-5 items-center gap-1.5">
                          <div className="col-span-1 sm:col-span-3">
                            <div className="grid grid-cols-3 items-center w-full">
                              <span className="truncate font-medium text-foreground text-base sm:text-sm text-left px-1 min-w-[80px] sm:min-w-[110px] max-w-[140px] col-span-1 justify-self-start">
                                {peopleMap[txn.from] || 'Unknown'}
                              </span>
                              <span className="flex items-center justify-center w-5 mx-1 col-span-1 justify-self-center">
                                <ArrowRight className="text-accent w-4 h-4" />
                              </span>
                              <span className="truncate font-medium text-foreground text-base sm:text-sm text-right px-1 min-w-[80px] sm:min-w-[110px] max-w-[140px] col-span-1 justify-self-center">
                                {peopleMap[txn.to] || 'Unknown'}
                              </span>
                            </div>
                          </div>
                          <span className="text-right font-bold text-green-700 text-base sm:text-lg mt-1 sm:mt-0 col-span-1 sm:col-span-1 flex justify-end">
                            {formatCurrency(txn.amount)}
                          </span>
                          <div className="flex-shrink-0 flex justify-center mt-1 sm:mt-0 col-span-1 sm:col-span-1">
                            {userRole === "admin" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInternalMarkAsPaid(txn)}
                                disabled={isLoading}
                                className="text-xs px-2 py-1 h-auto w-full sm:w-auto"
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />{" "}
                                Mark as Paid
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground mt-2">
                <div>
                  <FileText className="h-12 w-12 mx-auto mb-3 text-primary/30" />
                  <p className="font-medium text-sm sm:text-base">
                    All Settled Up!
                  </p>
                  <p className="text-xs">
                    All debts are settled, or no expenses to settle yet!
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent
            value="person"
            className="mt-0 flex-1 flex flex-col min-h-0 space-y-3"
          >
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4 items-center bg-muted/50 px-3 py-2 rounded-md">
              <Label
                htmlFor="person-select"
                className="text-xs sm:text-sm font-medium text-left sm:text-right"
              >
                View settlement details for:
              </Label>
              <Select
                value={selectedPersonId || ""}
                onValueChange={setSelectedPersonId}
                disabled={people.length === 0}
              >
                <SelectTrigger
                  id="person-select"
                  className="h-9 text-xs sm:text-sm"
                >
                  <SelectValue placeholder="Select Person..." />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPersonObject ? (
              <PerPersonSettlementDetails
                key={selectedPersonId}
                selectedPerson={selectedPersonObject}
                peopleMap={peopleMap}
                allExpenses={allExpenses}
                settlementPayments={settlementPayments}
                simplifiedTransactions={simplifiedTransactions}
                pairwiseTransactions={pairwiseTransactions}
                onMarkAsPaid={onMarkAsPaid}
                onUnmarkSettlementPayment={onUnmarkSettlementPayment}
                onViewExpenseDetails={onViewExpenseDetails}
                isLoadingParent={isLoading}
                setIsLoadingParent={setIsLoading}
                userRole={userRole}
              />
            ) : (
              <div className="text-sm text-muted-foreground p-3 text-center min-h-[100px] flex items-center justify-center">
                <Users className="mr-2 h-5 w-5" />
                Please select a person to see their specific settlement status.
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>

      {/* Transparent Settlement Explanation Modal */}
      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto no-scrollbar max-w-5xl">
          <DialogHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div className="flex items-center">
              <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
                <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                Settlement Breakdown & Explanation
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-0">
            <div className="space-y-4 sm:space-y-6 pt-2">
            {/* Step 1: Individual Balances */}
            <Card>
              <CardHeader className="pt-3 sm:pt-4 pb-2">
                <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                  <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  Step 1: Everyone's Net Balance
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Based on all expenses and what each person paid vs. their share:
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0">

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {people.map((person) => {
                  // Calculate this person's balance
                  let balance = 0;

                  // What they paid
                  let totalPaid = 0;
                  allExpenses.forEach((expense) => {
                    if (Array.isArray(expense.paid_by)) {
                      expense.paid_by.forEach((payment) => {
                        if (payment.personId === person.id) {
                          totalPaid += Number(payment.amount);
                        }
                      });
                    }
                  });

                  // What they owe
                  let totalOwed = 0;
                  allExpenses.forEach((expense) => {
                    if (Array.isArray(expense.shares)) {
                      expense.shares.forEach((share) => {
                        if (share.personId === person.id) {
                          totalOwed += Number(share.amount);
                        }
                      });
                    }
                  });

                  // Adjust for settlements already made
                  let settledAsDebtor = 0;
                  let settledAsCreditor = 0;
                  settlementPayments.forEach((payment) => {
                    if (payment.debtor_id === person.id) {
                      settledAsDebtor += Number(payment.amount_settled);
                    }
                    if (payment.creditor_id === person.id) {
                      settledAsCreditor += Number(payment.amount_settled);
                    }
                  });

                  balance =
                    totalPaid - totalOwed + settledAsDebtor - settledAsCreditor;

                  const isCreditor = balance > 0.01;
                  const isDebtor = balance < -0.01;
                  const isSettled = Math.abs(balance) <= 0.01;

                  return (
                    <div
                      key={person.id}
                      className={`p-3 rounded-lg border ${
                        isCreditor
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                          : isDebtor
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                          : "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{person.name}</span>
                        <span
                          className={`font-bold ${
                            isCreditor
                              ? "text-green-700 dark:text-green-300"
                              : isDebtor
                              ? "text-red-700 dark:text-red-300"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {isCreditor ? "+" : ""}
                          {formatCurrency(Math.abs(balance))}
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Paid:</span>
                          <span className="text-green-600">
                            {formatCurrency(totalPaid)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Owes:</span>
                          <span className="text-red-600">
                            {formatCurrency(totalOwed)}
                          </span>
                        </div>
                        {(settledAsDebtor > 0 || settledAsCreditor > 0) && (
                          <div className="flex justify-between text-blue-600">
                            <span>Settled:</span>
                            <span>
                              {formatCurrency(
                                settledAsCreditor - settledAsDebtor
                              )}
                            </span>
                          </div>
                        )}
                        <div className="pt-1 border-t">
                          <span className="font-medium">
                            {isCreditor
                              ? "Should receive"
                              : isDebtor
                              ? "Should pay"
                              : "Balanced"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Outstanding Direct Debts */}
            {unpaidPairwiseTransactions.length > 0 && (
              <Card>
                <CardHeader className="pt-3 sm:pt-4 pb-2">
                  <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                    <ArrowRight className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    Step 2: Outstanding Direct Debt Relationships
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {unpaidPairwiseTransactions.length} unpaid transactions - These are the remaining unpaid debts between people based on who paid for what:
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0">

                <div className="space-y-3">
                  {unpaidPairwiseTransactions.map((txn, index) => {
                    // Find expenses that contribute to this debt
                    const contributingExpenses = allExpenses.filter(
                      (expense) => {
                        const paidByPerson =
                          Array.isArray(expense.paid_by) &&
                          expense.paid_by.some((p) => p.personId === txn.to);
                        const owedByPerson =
                          Array.isArray(expense.shares) &&
                          expense.shares.some((s) => s.personId === txn.from);
                        return paidByPerson && owedByPerson;
                      }
                    );

                    return (
                      <div
                        key={`debt-${index}`}
                        className="bg-white dark:bg-gray-800 p-4 rounded border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-lg flex items-center justify-center">
                              <span className="font-bold text-red-700 dark:text-red-300 text-sm">
                                {peopleMap[txn.from]?.charAt(0) || "?"}
                              </span>
                            </div>
                            <ArrowRight className="text-red-500 w-4 h-4" />
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-lg flex items-center justify-center">
                              <span className="font-bold text-red-700 dark:text-red-300 text-sm">
                                {peopleMap[txn.to]?.charAt(0) || "?"}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">
                                {peopleMap[txn.from] || 'Unknown'} owes {peopleMap[txn.to] || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                From {contributingExpenses.length} shared
                                expense
                                {contributingExpenses.length !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                          <div className="font-bold text-red-700 dark:text-red-300 text-lg">
                            {formatCurrency(txn.amount)}
                          </div>
                        </div>

                        {contributingExpenses.length > 0 && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 pl-4 border-l-2 border-red-200">
                            <div className="font-medium mb-1">
                              Contributing expenses:
                            </div>
                            {contributingExpenses
                              .slice(0, 3)
                              .map((expense, i) => (
                                <div key={i} className="flex justify-between">
                                  <span className="truncate mr-2">
                                    {expense.description}
                                  </span>
                                  <span>{formatCurrency(expense.amount)}</span>
                                </div>
                              ))}
                            {contributingExpenses.length > 3 && (
                              <div className="text-center mt-1">
                                ... and {contributingExpenses.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Outstanding Optimized Settlements */}
            {unpaidSimplifiedTransactions.length > 0 && (
              <Card>
                <CardHeader className="pt-3 sm:pt-4 pb-2">
                  <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                    <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    Step 3: Outstanding Optimized Settlement Plan
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {unpaidSimplifiedTransactions.length} unpaid transactions - The minimum number of remaining payments needed to settle all outstanding debts efficiently:
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0">

                <div className="space-y-3">
                  {unpaidSimplifiedTransactions.map((txn, index) => {
                    // Calculate how much this person should receive/pay based on their balance
                    let fromBalance = 0;
                    let toBalance = 0;

                    people.forEach((person) => {
                      let balance = 0;

                      // Calculate balance for this person
                      allExpenses.forEach((expense) => {
                        if (Array.isArray(expense.paid_by)) {
                          expense.paid_by.forEach((payment) => {
                            if (payment.personId === person.id) {
                              balance += Number(payment.amount);
                            }
                          });
                        }
                        if (Array.isArray(expense.shares)) {
                          expense.shares.forEach((share) => {
                            if (share.personId === person.id) {
                              balance -= Number(share.amount);
                            }
                          });
                        }
                      });

                      // Adjust for settlements
                      settlementPayments.forEach((payment) => {
                        if (payment.debtor_id === person.id) {
                          balance += Number(payment.amount_settled);
                        }
                        if (payment.creditor_id === person.id) {
                          balance -= Number(payment.amount_settled);
                        }
                      });

                      if (person.id === txn.from) fromBalance = balance;
                      if (person.id === txn.to) toBalance = balance;
                    });

                    return (
                      <div
                        key={`opt-${index}`}
                        className="bg-white dark:bg-gray-800 p-4 rounded border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 rounded-lg flex items-center justify-center">
                              <span className="font-bold text-green-700 dark:text-green-300 text-sm">
                                {peopleMap[txn.from]?.charAt(0) || "?"}
                              </span>
                            </div>
                            <ArrowRight className="text-green-500 w-4 h-4" />
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 rounded-lg flex items-center justify-center">
                              <span className="font-bold text-green-700 dark:text-green-300 text-sm">
                                {peopleMap[txn.to]?.charAt(0) || "?"}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">
                                {peopleMap[txn.from] || 'Unknown'} pays {peopleMap[txn.to] || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Optimized settlement
                              </div>
                            </div>
                          </div>
                          <div className="font-bold text-green-700 dark:text-green-300 text-lg">
                            {formatCurrency(txn.amount)}
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-400 pl-4 border-l-2 border-green-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="font-medium">
                                {peopleMap[txn.from] || 'Unknown'}'s situation:
                              </div>
                              <div>
                                Net balance:{" "}
                                <span className="text-red-600">
                                  {formatCurrency(Math.abs(fromBalance))}
                                </span>{" "}
                                to pay
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">
                                {peopleMap[txn.to] || 'Unknown'}'s situation:
                              </div>
                              <div>
                                Net balance:{" "}
                                <span className="text-green-600">
                                  {formatCurrency(toBalance)}
                                </span>{" "}
                                to receive
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-center font-medium">
                            This payment settles part of both balances
                            efficiently
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary */}
            <Card>
              <CardHeader className="pt-3 sm:pt-4 pb-2">
                <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                  <Info className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  Why This Settlement Plan?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0">
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-muted-foreground shrink-0 mr-2">Transparent:</span>
                    <span className="font-medium text-left sm:text-right">Every amount is based on actual expenses and what each person paid vs. their fair share.</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-muted-foreground shrink-0 mr-2">Efficient:</span>
                    <span className="font-medium text-left sm:text-right">The optimized plan minimizes the number of transactions needed.</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-muted-foreground shrink-0 mr-2">Fair:</span>
                    <span className="font-medium text-left sm:text-right">Everyone ends up paying exactly their share of all expenses, no more, no less.</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-muted-foreground shrink-0 mr-2">Traceable:</span>
                    <span className="font-medium text-left sm:text-right">You can see which expenses contribute to each debt relationship.</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Empty State */}
            {unpaidPairwiseTransactions.length === 0 &&
              unpaidSimplifiedTransactions.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-green-700 dark:text-green-300">
                    All Outstanding Debts Settled!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Everyone has paid their outstanding amounts. No remaining
                    settlements needed.
                  </p>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
