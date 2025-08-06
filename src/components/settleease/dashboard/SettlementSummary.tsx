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
  Check,
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

  // Helper function to calculate a person's current balance
  const calculatePersonBalance = (personId: string) => {
    let balance = 0;

    // What they paid
    allExpenses.forEach((expense) => {
      if (Array.isArray(expense.paid_by)) {
        expense.paid_by.forEach((payment) => {
          if (payment.personId === personId) {
            balance += Number(payment.amount);
          }
        });
      }
    });

    // What they owe
    allExpenses.forEach((expense) => {
      if (Array.isArray(expense.shares)) {
        expense.shares.forEach((share) => {
          if (share.personId === personId) {
            balance -= Number(share.amount);
          }
        });
      }
    });

    // Adjust for settlements already made
    settlementPayments.forEach((payment) => {
      if (payment.debtor_id === personId) {
        balance += Number(payment.amount_settled);
      }
      if (payment.creditor_id === personId) {
        balance -= Number(payment.amount_settled);
      }
    });

    return balance;
  };

  // Filter out paid transactions for visualization
  const unpaidPairwiseTransactions = useMemo(() => {
    return pairwiseTransactions.filter((txn) => {
      // Check the debtor's overall balance - if they're balanced or positive, they don't owe anything
      const debtorBalance = calculatePersonBalance(txn.from);
      const creditorBalance = calculatePersonBalance(txn.to);

      // If the debtor is balanced (within 0.01) or has a positive balance, they don't owe this debt
      if (debtorBalance >= -0.01) {
        return false;
      }

      // If the creditor is balanced (within 0.01) or has a negative balance, they don't need to receive this debt
      if (creditorBalance <= 0.01) {
        return false;
      }

      // Otherwise, this is still an outstanding debt
      return true;
    });
  }, [pairwiseTransactions, settlementPayments, allExpenses]);

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
                                {peopleMap[txn.from] || "Unknown"}
                              </span>
                              <span className="flex items-center justify-center w-5 mx-1 col-span-1 justify-self-center">
                                <ArrowRight className="text-accent w-4 h-4" />
                              </span>
                              <span className="truncate font-medium text-foreground text-base sm:text-sm text-right px-1 min-w-[80px] sm:min-w-[110px] max-w-[140px] col-span-1 justify-self-center">
                                {peopleMap[txn.to] || "Unknown"}
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
                    Based on all expenses and what each person paid vs. their
                    share:
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {people
                      .map((person) => {
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
                          totalPaid -
                          totalOwed +
                          settledAsDebtor -
                          settledAsCreditor;

                        const isCreditor = balance > 0.01;
                        const isDebtor = balance < -0.01;
                        const isSettled = Math.abs(balance) <= 0.01;

                        return {
                          person,
                          balance,
                          totalPaid,
                          totalOwed,
                          settledAsDebtor,
                          settledAsCreditor,
                          isCreditor,
                          isDebtor,
                          isSettled,
                          sortOrder: isCreditor ? 0 : isDebtor ? 1 : 2, // Receives, Pays, Balanced
                        };
                      })
                      .sort((a, b) => {
                        // First sort by category (Receives, Pays, Balanced)
                        if (a.sortOrder !== b.sortOrder) {
                          return a.sortOrder - b.sortOrder;
                        }
                        // Then sort alphabetically within each category
                        return a.person.name.localeCompare(b.person.name);
                      })
                      .map(
                        ({
                          person,
                          balance,
                          totalPaid,
                          totalOwed,
                          settledAsDebtor,
                          settledAsCreditor,
                          isCreditor,
                          isDebtor,
                          isSettled,
                        }) => {
                          return (
                            <div
                              key={person.id}
                              className={`relative p-4 rounded-xl border-2 shadow-sm transition-all ${
                                isCreditor
                                  ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-300 dark:border-green-700"
                                  : isDebtor
                                  ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-300 dark:border-red-700"
                                  : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 border-gray-300 dark:border-gray-700"
                              }`}
                            >
                              {/* Status Badge */}
                              <div
                                className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                                  isCreditor
                                    ? "bg-green-500 text-white"
                                    : isDebtor
                                    ? "bg-red-500 text-white"
                                    : "bg-gray-500 text-white"
                                }`}
                              >
                                {isCreditor
                                  ? "RECEIVES"
                                  : isDebtor
                                  ? "PAYS"
                                  : "BALANCED"}
                              </div>

                              {/* Person Name and Amount */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                      isCreditor
                                        ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                                        : isDebtor
                                        ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                                        : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                                    }`}
                                  >
                                    {person.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {person.name}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div
                                    className={`text-2xl font-bold ${
                                      isCreditor
                                        ? "text-green-700 dark:text-green-300"
                                        : isDebtor
                                        ? "text-red-700 dark:text-red-300"
                                        : "text-gray-700 dark:text-gray-300"
                                    }`}
                                  >
                                    {isCreditor ? "+" : isDebtor ? "-" : ""}
                                    {formatCurrency(Math.abs(balance))}
                                  </div>
                                </div>
                              </div>

                              {/* Breakdown Details */}
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Total Paid:
                                  </span>
                                  <span className="font-semibold text-green-700 dark:text-green-400">
                                    {formatCurrency(totalPaid)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Total Owed:
                                  </span>
                                  <span className="font-semibold text-red-700 dark:text-red-400">
                                    {formatCurrency(totalOwed)}
                                  </span>
                                </div>
                                {(settledAsDebtor > 0 ||
                                  settledAsCreditor > 0) && (
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      Already Settled:
                                    </span>
                                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                                      {formatCurrency(
                                        Math.abs(
                                          settledAsCreditor - settledAsDebtor
                                        )
                                      )}
                                    </span>
                                  </div>
                                )}

                                {/* Final Status - More Prominent */}
                                <div
                                  className={`mt-3 pt-3 border-t-2 ${
                                    isCreditor
                                      ? "border-green-200 dark:border-green-800"
                                      : isDebtor
                                      ? "border-red-200 dark:border-red-800"
                                      : "border-gray-200 dark:border-gray-800"
                                  }`}
                                >
                                  <div className="flex items-center justify-center">
                                    <div
                                      className={`px-4 py-2 rounded-lg font-bold text-sm text-center ${
                                        isCreditor
                                          ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                                          : isDebtor
                                          ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                                          : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                                      }`}
                                    >
                                      {isCreditor ? (
                                        `Should Receive ${formatCurrency(
                                          Math.abs(balance)
                                        )}`
                                      ) : isDebtor ? (
                                        `Should Pay ${formatCurrency(
                                          Math.abs(balance)
                                        )}`
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          All Balanced{" "}
                                          <Check className="w-4 h-4" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Outstanding Direct Debts */}
              {unpaidPairwiseTransactions.length > 0 && (
                <Card>
                  <CardHeader className="pt-3 sm:pt-4 pb-2">
                    <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                      <ArrowRight className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      Step 2: Outstanding Direct Debt Relationships
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {unpaidPairwiseTransactions.length} unpaid transactions -
                      These are the remaining unpaid debts between people based
                      on who paid for what:
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
                              expense.paid_by.some(
                                (p) => p.personId === txn.to
                              );
                            const owedByPerson =
                              Array.isArray(expense.shares) &&
                              expense.shares.some(
                                (s) => s.personId === txn.from
                              );
                            return paidByPerson && owedByPerson;
                          }
                        );

                        return (
                          <div
                            key={`debt-${index}`}
                            className="relative bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 p-5 rounded-xl border-2 border-red-300 dark:border-red-700 shadow-sm transition-all"
                          >
                            {/* Debt Status Badge */}
                            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm">
                              DIRECT DEBT
                            </div>

                            {/* Main Transaction Display */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-4">
                                {/* From Person Avatar */}
                                <div className="flex flex-col items-center">
                                  <div className="w-12 h-12 bg-red-200 dark:bg-red-800 border-2 border-red-400 dark:border-red-600 rounded-full flex items-center justify-center shadow-sm">
                                    <span className="font-bold text-red-800 dark:text-red-200 text-lg">
                                      {peopleMap[txn.from]?.charAt(0) || "?"}
                                    </span>
                                  </div>
                                  <span className="text-xs font-medium text-red-700 dark:text-red-300 mt-1">
                                    Owes
                                  </span>
                                </div>

                                {/* Arrow */}
                                <div className="flex flex-col items-center">
                                  <ArrowRight className="text-red-500 w-6 h-6" />
                                  <span className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    {formatCurrency(txn.amount)}
                                  </span>
                                </div>

                                {/* To Person Avatar */}
                                <div className="flex flex-col items-center">
                                  <div className="w-12 h-12 bg-red-200 dark:bg-red-800 border-2 border-red-400 dark:border-red-600 rounded-full flex items-center justify-center shadow-sm">
                                    <span className="font-bold text-red-800 dark:text-red-200 text-lg">
                                      {peopleMap[txn.to]?.charAt(0) || "?"}
                                    </span>
                                  </div>
                                  <span className="text-xs font-medium text-red-700 dark:text-red-300 mt-1">
                                    Receives
                                  </span>
                                </div>

                                {/* Transaction Details */}
                                <div className="ml-4">
                                  <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                                    {peopleMap[txn.from] || "Unknown"} →{" "}
                                    {peopleMap[txn.to] || "Unknown"}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Based on {contributingExpenses.length}{" "}
                                    shared expense
                                    {contributingExpenses.length !== 1
                                      ? "s"
                                      : ""}
                                  </div>
                                </div>
                              </div>

                              {/* Amount Display */}
                              <div className="text-right">
                                <div className="text-3xl font-bold text-red-700 dark:text-red-300">
                                  {formatCurrency(txn.amount)}
                                </div>
                                <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                                  Outstanding
                                </div>
                              </div>
                            </div>

                            {/* Contributing Expenses */}
                            {contributingExpenses.length > 0 && (
                              <div className="mt-4 pt-4 border-t-2 border-red-200 dark:border-red-800">
                                <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
                                  <div className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Contributing Expenses (
                                    {contributingExpenses.length})
                                  </div>
                                  <div className="space-y-2">
                                    {contributingExpenses.map((expense, i) => (
                                      <div
                                        key={i}
                                        className="flex justify-between items-start gap-3 p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {expense.description}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {expense.created_at
                                              ? new Date(
                                                  expense.created_at
                                                ).toLocaleDateString()
                                              : "No date"}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-bold text-gray-900 dark:text-gray-100">
                                            {formatCurrency(
                                              expense.total_amount
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Simplification Process */}
              {(unpaidPairwiseTransactions.length > 0 ||
                unpaidSimplifiedTransactions.length > 0) && (
                <Card>
                  <CardHeader className="pt-3 sm:pt-4 pb-2">
                    <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                      <ArrowRight className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      Step 3: Simplification Process
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      How we optimize the direct debts into the minimum number
                      of transactions:
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0">
                    <div className="space-y-4">
                      {/* Algorithm Explanation */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-blue-900 dark:text-blue-100">
                              Debt Simplification Algorithm
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              Converting {unpaidPairwiseTransactions.length}{" "}
                              direct debts into{" "}
                              {unpaidSimplifiedTransactions.length} optimized
                              payments
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Before */}
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                              <FileText className="w-4 h-4 mr-2 text-red-500" />
                              Before: {unpaidPairwiseTransactions.length} Direct
                              Debts
                            </div>
                            <div className="space-y-1">
                              {unpaidPairwiseTransactions
                                .slice(0, 3)
                                .map((txn, i) => (
                                  <div
                                    key={i}
                                    className="text-xs text-gray-600 dark:text-gray-400 flex items-center"
                                  >
                                    <span className="truncate">
                                      {peopleMap[txn.from]} →{" "}
                                      {peopleMap[txn.to]}:{" "}
                                      {formatCurrency(txn.amount)}
                                    </span>
                                  </div>
                                ))}
                              {unpaidPairwiseTransactions.length > 3 && (
                                <div className="text-xs text-gray-500 dark:text-gray-500 italic">
                                  ... and{" "}
                                  {unpaidPairwiseTransactions.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>

                          {/* After */}
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                              <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                              After: {unpaidSimplifiedTransactions.length}{" "}
                              Optimized Payments
                            </div>
                            <div className="space-y-1">
                              {unpaidSimplifiedTransactions.map((txn, i) => (
                                <div
                                  key={i}
                                  className="text-xs text-gray-600 dark:text-gray-400 flex items-center"
                                >
                                  <span className="truncate">
                                    {peopleMap[txn.from]} → {peopleMap[txn.to]}:{" "}
                                    {formatCurrency(txn.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Efficiency Gain */}
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-700 dark:text-green-300">
                              {Math.max(
                                0,
                                unpaidPairwiseTransactions.length -
                                  unpaidSimplifiedTransactions.length
                              )}{" "}
                              fewer transactions needed
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400">
                              {unpaidPairwiseTransactions.length > 0
                                ? `${Math.round(
                                    (1 -
                                      unpaidSimplifiedTransactions.length /
                                        unpaidPairwiseTransactions.length) *
                                      100
                                  )}% reduction in payment complexity`
                                : "All debts optimally simplified"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Outstanding Optimized Settlements */}
              {unpaidSimplifiedTransactions.length > 0 && (
                <Card>
                  <CardHeader className="pt-3 sm:pt-4 pb-2">
                    <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                      <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      Step 4: Outstanding Optimized Settlement Plan
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {unpaidSimplifiedTransactions.length} unpaid transactions
                      - The minimum number of remaining payments needed to
                      settle all outstanding debts efficiently:
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
                            className="relative bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 p-5 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-sm transition-all"
                          >
                            {/* Optimized Status Badge */}
                            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                              OPTIMIZED
                            </div>

                            {/* Main Transaction Display */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-4">
                                {/* From Person Avatar */}
                                <div className="flex flex-col items-center">
                                  <div className="w-12 h-12 bg-green-200 dark:bg-green-800 border-2 border-green-400 dark:border-green-600 rounded-full flex items-center justify-center shadow-sm">
                                    <span className="font-bold text-green-800 dark:text-green-200 text-lg">
                                      {peopleMap[txn.from]?.charAt(0) || "?"}
                                    </span>
                                  </div>
                                  <span className="text-xs font-medium text-green-700 dark:text-green-300 mt-1">
                                    Pays
                                  </span>
                                </div>

                                {/* Arrow */}
                                <div className="flex flex-col items-center">
                                  <ArrowRight className="text-green-500 w-6 h-6" />
                                  <span className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    {formatCurrency(txn.amount)}
                                  </span>
                                </div>

                                {/* To Person Avatar */}
                                <div className="flex flex-col items-center">
                                  <div className="w-12 h-12 bg-green-200 dark:bg-green-800 border-2 border-green-400 dark:border-green-600 rounded-full flex items-center justify-center shadow-sm">
                                    <span className="font-bold text-green-800 dark:text-green-200 text-lg">
                                      {peopleMap[txn.to]?.charAt(0) || "?"}
                                    </span>
                                  </div>
                                  <span className="text-xs font-medium text-green-700 dark:text-green-300 mt-1">
                                    Receives
                                  </span>
                                </div>

                                {/* Transaction Details */}
                                <div className="ml-4">
                                  <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                                    {peopleMap[txn.from] || "Unknown"} →{" "}
                                    {peopleMap[txn.to] || "Unknown"}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Optimized settlement payment
                                  </div>
                                </div>
                              </div>

                              {/* Amount Display */}
                              <div className="text-right">
                                <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                                  {formatCurrency(txn.amount)}
                                </div>
                                <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                                  Settlement
                                </div>
                              </div>
                            </div>

                            {/* Balance Analysis */}
                            <div className="mt-4 pt-4 border-t-2 border-green-200 dark:border-green-800">
                              <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3">
                                <div className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center">
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Balance Analysis
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* From Person Balance */}
                                  <div className="p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-6 h-6 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-red-800 dark:text-red-200">
                                          {peopleMap[txn.from]?.charAt(0) ||
                                            "?"}
                                        </span>
                                      </div>
                                      <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {peopleMap[txn.from] || "Unknown"}
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      <div className="text-gray-600 dark:text-gray-400">
                                        Current balance:
                                      </div>
                                      <div className="font-bold text-red-600 dark:text-red-400">
                                        -{formatCurrency(Math.abs(fromBalance))}{" "}
                                        to pay
                                      </div>
                                    </div>
                                  </div>

                                  {/* To Person Balance */}
                                  <div className="p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-6 h-6 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-green-800 dark:text-green-200">
                                          {peopleMap[txn.to]?.charAt(0) || "?"}
                                        </span>
                                      </div>
                                      <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {peopleMap[txn.to] || "Unknown"}
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      <div className="text-gray-600 dark:text-gray-400">
                                        Current balance:
                                      </div>
                                      <div className="font-bold text-green-600 dark:text-green-400">
                                        +{formatCurrency(toBalance)} to receive
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Efficiency Note */}
                                <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                  <div className="text-xs text-green-800 dark:text-green-200 text-center font-medium">
                                    ✨ This optimized payment efficiently
                                    settles both balances with minimal
                                    transactions
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <Card className="relative bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700 shadow-lg">
                <CardHeader className="pt-4 sm:pt-6 pb-3">
                  <CardTitle className="flex items-center text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                    <Info className="mr-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
                    Why This Settlement Plan?
                  </CardTitle>
                  <CardDescription className="text-blue-700 dark:text-blue-300 mt-2">
                    Our settlement algorithm ensures fairness, efficiency, and
                    transparency in every transaction.
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Transparent */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                            Transparent
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            Every amount is based on actual expenses and what
                            each person paid vs. their fair share.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Efficient */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                          <ArrowRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-green-900 dark:text-green-100 mb-2">
                            Efficient
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            The optimized plan minimizes the number of
                            transactions needed to settle all debts.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Fair */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-2">
                            Fair
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            Everyone ends up paying exactly their share of all
                            expenses, no more, no less.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Traceable */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                          <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-orange-900 dark:text-orange-100 mb-2">
                            Traceable
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            You can see which expenses contribute to each debt
                            relationship for full transparency.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Summary */}
                  <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-center gap-2 text-blue-800 dark:text-blue-200">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold text-sm">
                        This settlement plan ensures everyone pays their fair
                        share with maximum efficiency
                      </span>
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
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
