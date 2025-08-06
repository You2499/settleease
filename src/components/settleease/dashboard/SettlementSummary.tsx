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
  Calculator,
  DollarSign,
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

  // Calculate person balances using the same logic as DashboardView
  const personBalances = useMemo(() => {
    const balances: Record<
      string,
      {
        totalPaid: number;
        totalOwed: number;
        settledAsDebtor: number;
        settledAsCreditor: number;
        netBalance: number;
      }
    > = {};

    // Initialize balances for all people
    people.forEach((person) => {
      balances[person.id] = {
        totalPaid: 0,
        totalOwed: 0,
        settledAsDebtor: 0,
        settledAsCreditor: 0,
        netBalance: 0,
      };
    });

    // Calculate from expenses
    allExpenses.forEach((expense) => {
      // What they paid
      if (Array.isArray(expense.paid_by)) {
        expense.paid_by.forEach((payment) => {
          if (balances[payment.personId]) {
            balances[payment.personId].totalPaid += Number(payment.amount);
          }
        });
      }

      // What they owe (shares + celebration contributions)
      if (Array.isArray(expense.shares)) {
        expense.shares.forEach((share) => {
          if (balances[share.personId]) {
            balances[share.personId].totalOwed += Number(share.amount);
          }
        });
      }

      // Celebration contributions
      if (
        expense.celebration_contribution &&
        expense.celebration_contribution.amount > 0
      ) {
        const contributorId = expense.celebration_contribution.personId;
        if (balances[contributorId]) {
          balances[contributorId].totalOwed += Number(
            expense.celebration_contribution.amount
          );
        }
      }
    });

    // Add settlement payments
    settlementPayments.forEach((payment) => {
      if (balances[payment.debtor_id]) {
        balances[payment.debtor_id].settledAsDebtor += Number(
          payment.amount_settled
        );
      }
      if (balances[payment.creditor_id]) {
        balances[payment.creditor_id].settledAsCreditor += Number(
          payment.amount_settled
        );
      }
    });

    // Calculate net balances
    Object.keys(balances).forEach((personId) => {
      const person = balances[personId];
      person.netBalance =
        person.totalPaid -
        person.totalOwed +
        person.settledAsDebtor -
        person.settledAsCreditor;
    });

    return balances;
  }, [allExpenses, settlementPayments, people]);

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
                <Info className="mr-1 h-4 w-4" /> How it Works
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

      {/* Simple, Trust-Building Explanation Modal */}
      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto no-scrollbar max-w-4xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              How Settlement Works - Simple & Transparent
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Step 1: Simple Balance Calculation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg font-bold">
                  <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                  Step 1: Calculate Everyone's Balance
                </CardTitle>
                <CardDescription className="text-sm">
                  Simple math: What you paid minus what you owe = your balance
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(personBalances)
                    .sort(([, a], [, b]) => b.netBalance - a.netBalance)
                    .map(([personId, balance]) => {
                      const person = people.find((p) => p.id === personId);
                      if (!person) return null;

                      const isCreditor = balance.netBalance > 0.01;
                      const isDebtor = balance.netBalance < -0.01;

                      return (
                        <div
                          key={personId}
                          className={`p-4 rounded-lg border-2 ${
                            isCreditor
                              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                              : isDebtor
                              ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                              : "bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
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
                                className={`text-xl font-bold ${
                                  isCreditor
                                    ? "text-green-700 dark:text-green-300"
                                    : isDebtor
                                    ? "text-red-700 dark:text-red-300"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {isCreditor ? "+" : isDebtor ? "-" : ""}
                                {formatCurrency(Math.abs(balance.netBalance))}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {isCreditor
                                  ? "should receive"
                                  : isDebtor
                                  ? "should pay"
                                  : "all balanced"}
                              </div>
                            </div>
                          </div>

                          {/* Simple calculation breakdown */}
                          <div className="text-sm space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">
                                What they paid:
                              </span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(balance.totalPaid)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">
                                What they owe:
                              </span>
                              <span className="font-medium text-red-600 dark:text-red-400">
                                -{formatCurrency(balance.totalOwed)}
                              </span>
                            </div>
                            {(balance.settledAsDebtor > 0 ||
                              balance.settledAsCreditor > 0) && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Already settled:
                                </span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  {balance.settledAsDebtor >
                                  balance.settledAsCreditor
                                    ? "+"
                                    : "-"}
                                  {formatCurrency(
                                    Math.abs(
                                      balance.settledAsCreditor -
                                        balance.settledAsDebtor
                                    )
                                  )}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                Final balance:
                              </span>
                              <span
                                className={`font-bold ${
                                  isCreditor
                                    ? "text-green-700 dark:text-green-300"
                                    : isDebtor
                                    ? "text-red-700 dark:text-red-300"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {isCreditor ? "+" : isDebtor ? "-" : ""}
                                {formatCurrency(Math.abs(balance.netBalance))}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Settlement Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg font-bold">
                  <ArrowRight className="mr-2 h-5 w-5 text-blue-600" />
                  Step 2: Settlement Options
                </CardTitle>
                <CardDescription className="text-sm">
                  Two ways to settle: Direct payments or optimized payments
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Direct Payments */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Direct Payments ({pairwiseTransactions.length}{" "}
                      transactions)
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                      Pay back exactly who you owe money to based on specific
                      expenses.
                    </p>
                    <div className="space-y-2">
                      {pairwiseTransactions.slice(0, 3).map((txn, i) => (
                        <div
                          key={i}
                          className="text-xs bg-white dark:bg-gray-800 p-2 rounded border"
                        >
                          <span className="font-medium">
                            {peopleMap[txn.from]}
                          </span>{" "}
                          pays{" "}
                          <span className="font-medium">
                            {peopleMap[txn.to]}
                          </span>{" "}
                          <span className="font-bold text-green-600">
                            {formatCurrency(txn.amount)}
                          </span>
                        </div>
                      ))}
                      {pairwiseTransactions.length > 3 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 italic">
                          ... and {pairwiseTransactions.length - 3} more
                          payments
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optimized Payments */}
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-bold text-green-900 dark:text-green-100 mb-3 flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Optimized Payments ({
                        unpaidSimplifiedTransactions.length
                      }{" "}
                      transactions)
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                      Minimum number of payments needed. Same result, fewer
                      transactions.
                    </p>
                    <div className="space-y-2">
                      {unpaidSimplifiedTransactions.map((txn, i) => (
                        <div
                          key={i}
                          className="text-xs bg-white dark:bg-gray-800 p-2 rounded border"
                        >
                          <span className="font-medium">
                            {peopleMap[txn.from]}
                          </span>{" "}
                          pays{" "}
                          <span className="font-medium">
                            {peopleMap[txn.to]}
                          </span>{" "}
                          <span className="font-bold text-green-600">
                            {formatCurrency(txn.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {pairwiseTransactions.length >
                      unpaidSimplifiedTransactions.length && (
                      <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/30 rounded text-center">
                        <div className="text-sm font-bold text-green-700 dark:text-green-300">
                          {pairwiseTransactions.length -
                            unpaidSimplifiedTransactions.length}{" "}
                          fewer payments needed!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Why Trust This? */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg font-bold text-blue-900 dark:text-blue-100">
                  <Info className="mr-2 h-5 w-5" />
                  Why Trust This System?
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                        Simple Math
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Every balance is calculated with basic addition and
                        subtraction. No complex algorithms - just what you paid
                        minus what you owe.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                        Same End Result
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Whether you choose direct or optimized payments,
                        everyone ends up with the exact same final balance. The
                        math always works out.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-200 dark:bg-purple-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                        Transparent Process
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        You can verify every calculation yourself. Check the
                        "Per Person" tab to see exactly how each person's
                        balance is calculated.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
